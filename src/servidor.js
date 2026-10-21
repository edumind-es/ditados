'use strict';
// Servicio mínimo del editor del autor. Sin dependencias: node:http.
//
// Seguridad: escucha solo en 127.0.0.1. Nginx lo expone detrás de Authentik (auth_request) y le pasa
// la cabecera X-Authentik-Username; aquí se comprueba contra la lista DITADOS_AUTORES. Si la cabecera
// no llega o el usuario no está en la lista, se responde 403. Para trabajar en local sin Authentik:
// DITADOS_SIN_AUTH=1 (nunca en producción).
//
// Rutas:
//   GET  /editor/                       interfaz
//   GET  /api/config                    config.json + voces + si LanguageTool está activo
//   GET  /api/ditados                   lista con id, título, estado
//   GET  /api/ditados/:id               un dictado
//   PUT  /api/ditados/:id               guarda (valida antes; 422 con los errores si no pasa)
//   POST /api/ditados/:id/estado        {estado} cambia el estado; al pasar a «revisado» o «publicado» lanza la generación
//   POST /api/validar                   valida un dictado sin guardarlo
//   POST /api/segmentar                 {texto} → segmentos propuestos
//   POST /api/languagetool              {ditado} → avisos del corrector (si está activo)
//   POST /api/audio/:id/:letra/:trozo   regenera un trozo (o «completo») con la voz indicada en ?voz=
//   GET  /api/audio/:id/:voz/:fichero   sirve un MP3 de la caché para escucharlo
//   GET  /api/tareas/:n                 estado y registro de una generación en marcha
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { validar, idDitado, idOpcion, textoPlano } = require('./validar');
const { segmentar } = require('./segmentar');
const lt = require('./languagetool');
const audio = require('./audio');
const { RAIZ } = require('./html');

const CONTENIDO = path.join(RAIZ, 'contenido');
const AUDIO_CACHE = process.env.DITADOS_AUDIO || path.join(RAIZ, '.cache', 'audio');
const AUTORES = (process.env.DITADOS_AUTORES || '').split(',').map((s) => s.trim()).filter(Boolean);
const SIN_AUTH = process.env.DITADOS_SIN_AUTH === '1';

const tareas = new Map();
let nTarea = 0;

const leerConfig = () => JSON.parse(fs.readFileSync(path.join(CONTENIDO, 'config.json'), 'utf8'));
const rutaDitado = (id) => { if (!/^(gl|es)-\d{2}$/.test(id)) throw new Error('id no válido'); return path.join(CONTENIDO, `${id}.json`); };

function json(res, codigo, cuerpo) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}
function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const trozos = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > 2e6) reject(new Error('cuerpo demasiado grande')); trozos.push(c); });
    req.on('end', () => { try { resolve(trozos.length ? JSON.parse(Buffer.concat(trozos).toString('utf8')) : {}); } catch (e) { reject(new Error('JSON no válido')); } });
    req.on('error', reject);
  });
}

function autorizado(req) {
  if (SIN_AUTH) return true;
  const usuario = req.headers['x-authentik-username'];
  return Boolean(usuario) && AUTORES.includes(String(usuario));
}

/** Lanza la generación de un dictado en segundo plano y devuelve el número de tarea. */
function lanzarGeneracion(id) {
  const n = ++nTarea;
  const tarea = { id, estado: 'en marcha', registro: '', inicio: new Date().toISOString() };
  tareas.set(n, tarea);
  const p = spawn(process.execPath, [path.join(RAIZ, 'bin', 'ditados.js'), 'build', '--solo', id], { env: process.env });
  p.stdout.on('data', (d) => { tarea.registro += d; });
  p.stderr.on('data', (d) => { tarea.registro += d; });
  p.on('close', (codigo) => { tarea.estado = codigo === 0 ? 'terminada' : 'con errores'; tarea.fin = new Date().toISOString(); });
  return n;
}

async function manejar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;

  if (ruta === '/editor' || ruta === '/editor/') {
    if (!autorizado(req)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Solo el autor puede entrar en el editor.'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(path.join(RAIZ, 'plantillas', 'editor.html'), 'utf8'));
  }
  if (ruta.startsWith('/editor/fonts/')) {
    const f = path.join(RAIZ, 'public', 'fonts', path.basename(ruta));
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=2592000' });
    return res.end(fs.readFileSync(f));
  }
  if (!ruta.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  if (!autorizado(req)) return json(res, 403, { error: 'Solo el autor puede usar el editor.' });

  const partes = ruta.split('/').filter(Boolean); // ['api', ...]
  const config = leerConfig();

  if (req.method === 'GET' && partes[1] === 'config') {
    return json(res, 200, { config, languagetool: lt.activo(), audio: audio.disponible() });
  }
  if (req.method === 'GET' && partes[1] === 'ditados' && partes.length === 2) {
    const lista = fs.readdirSync(CONTENIDO).filter((f) => /^(gl|es)-\d\d\.json$/.test(f)).sort().map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(CONTENIDO, f), 'utf8'));
      return { id: idDitado(d), lang: d.lang, num: d.num, curso: d.curso, titulo: d.titulo, estado: d.estado, opcions: d.opcions.length };
    });
    return json(res, 200, lista);
  }
  if (req.method === 'GET' && partes[1] === 'ditados' && partes.length === 3) {
    const f = rutaDitado(partes[2]);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'No existe ese dictado.' });
    return json(res, 200, JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  if (req.method === 'PUT' && partes[1] === 'ditados' && partes.length === 3) {
    const d = await leerCuerpo(req);
    if (idDitado(d) !== partes[2]) return json(res, 400, { error: 'El identificador del dictado no coincide con la URL.' });
    // Un dictado nuevo nace en borrador; el estado solo cambia por la ruta /estado.
    const f = rutaDitado(partes[2]);
    const anterior = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    d.estado = anterior ? anterior.estado : 'borrador';
    const r = validar(d, config);
    if (r.errores.length) return json(res, 422, { errores: r.errores, avisos: r.avisos });
    fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
    return json(res, 200, { guardado: true, avisos: r.avisos });
  }
  if (req.method === 'POST' && partes[1] === 'ditados' && partes[3] === 'estado') {
    const { estado } = await leerCuerpo(req);
    const f = rutaDitado(partes[2]);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'No existe ese dictado.' });
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const orden = ['borrador', 'revisado', 'publicado'];
    if (!orden.includes(estado)) return json(res, 400, { error: 'Estado desconocido.' });
    // Solo se avanza un paso cada vez (o se vuelve a borrador). Nada llega al alumnado sin pasar por «revisado».
    if (orden.indexOf(estado) > orden.indexOf(d.estado) + 1) return json(res, 400, { error: `De «${d.estado}» solo se puede pasar a «${orden[orden.indexOf(d.estado) + 1]}».` });
    const candidato = { ...d, estado };
    const r = validar(candidato, config);
    if (r.errores.length) return json(res, 422, { errores: r.errores, avisos: r.avisos });
    fs.writeFileSync(f, JSON.stringify(candidato, null, 2) + '\n');
    const tarea = estado === 'borrador' ? null : lanzarGeneracion(partes[2]);
    return json(res, 200, { estado, tarea });
  }
  if (req.method === 'POST' && partes[1] === 'validar') {
    const d = await leerCuerpo(req);
    return json(res, 200, validar(d, config));
  }
  if (req.method === 'POST' && partes[1] === 'segmentar') {
    const { texto } = await leerCuerpo(req);
    return json(res, 200, { segmentos: segmentar(String(texto || ''), { min: (config.cursos[url.searchParams.get('curso')] || {}).segmento_palabras ? config.cursos[url.searchParams.get('curso')].segmento_palabras[0] : config.segmento_palabras[0], max: (config.cursos[url.searchParams.get('curso')] || {}).segmento_palabras ? config.cursos[url.searchParams.get('curso')].segmento_palabras[1] : config.segmento_palabras[1] }) });
  }
  if (req.method === 'POST' && partes[1] === 'languagetool') {
    if (!lt.activo()) return json(res, 200, { activo: false, avisos: [] });
    const { ditado } = await leerCuerpo(req);
    try { return json(res, 200, { activo: true, avisos: await lt.comprobarDitado(ditado) }); } catch (e) { return json(res, 502, { error: e.message }); }
  }
  if (req.method === 'POST' && partes[1] === 'audio' && partes.length === 5) {
    const [, , id, letra, trozo] = partes;
    const f = rutaDitado(id);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'No existe ese dictado.' });
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const o = d.opcions.find((x) => x.letra === letra);
    if (!o) return json(res, 404, { error: 'No existe esa opción.' });
    const voz = url.searchParams.get('voz') || d.voz || config.voces[d.lang].defecto;
    if (!config.voces[d.lang].disponibles.includes(voz)) return json(res, 400, { error: 'Voz no disponible para esta lengua.' });
    const texto = trozo === 'completo' ? textoPlano(o.texto) : o.segmentos[Number(trozo) - 1];
    if (!texto) return json(res, 404, { error: 'No existe ese trozo.' });
    const nombre = trozo === 'completo' ? 'completo' : `s${String(trozo).padStart(2, '0')}`;
    const dir = path.join(AUDIO_CACHE, id, voz);
    fs.mkdirSync(dir, { recursive: true });
    const wav = path.join(dir, `${idOpcion(d, o)}-${nombre}.wav`);
    const mp3 = path.join(dir, `${idOpcion(d, o)}-${nombre}.mp3`);
    try { audio.sintetizar(texto, d.lang, voz, wav); audio.aMp3(wav, mp3); } catch (e) { return json(res, 500, { error: e.message }); } finally { fs.rmSync(wav, { force: true }); }
    return json(res, 200, { fichero: `/api/audio/${id}/${voz}/${path.basename(mp3)}` });
  }
  if (req.method === 'GET' && partes[1] === 'audio' && partes.length === 5) {
    const [, , id, voz, fichero] = partes;
    rutaDitado(id);
    if (!/^[a-z0-9-]+\.mp3$/.test(fichero) || !/^[a-z]+$/.test(voz)) { res.writeHead(400); return res.end(); }
    const f = path.join(AUDIO_CACHE, id, voz, fichero);
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
    return fs.createReadStream(f).pipe(res);
  }
  if (req.method === 'GET' && partes[1] === 'tareas' && partes.length === 3) {
    const t = tareas.get(Number(partes[2]));
    return t ? json(res, 200, t) : json(res, 404, { error: 'No existe esa tarea.' });
  }
  return json(res, 404, { error: 'Ruta desconocida.' });
}

function crearServidor() {
  return http.createServer((req, res) => {
    manejar(req, res).catch((e) => json(res, 500, { error: e.message }));
  });
}

if (require.main === module) {
  const puerto = Number(process.env.DITADOS_PUERTO || 9170);
  if (!SIN_AUTH && AUTORES.length === 0) {
    console.error('Define DITADOS_AUTORES (usuarios de Authentik separados por comas) o DITADOS_SIN_AUTH=1 para trabajar en local.');
    process.exit(1);
  }
  crearServidor().listen(puerto, '127.0.0.1', () => console.log(`Editor de ditados en http://127.0.0.1:${puerto}/editor/ (${SIN_AUTH ? 'SIN autenticación' : 'autores: ' + AUTORES.join(', ')})`));
}

module.exports = { crearServidor, manejar };
