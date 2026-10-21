'use strict';
// Orquestador: lee contenido/, valida, genera audio, presentación, impresos, documentos y catálogo en dist/.
// Solo los dictados con estado «publicado» llegan a dist/ (denegación por defecto: lo no publicado no existe en la web).
const fs = require('node:fs');
const path = require('node:path');
const { validar, idDitado } = require('./validar');
const { generarPresentacion, nombrePresentacion } = require('./gen_presentacion');
const { generarImpresos, nombresImpresos } = require('./gen_impresos');
const { miclase, textosDocente, nombresDocente } = require('./gen_docente');
const { paginaIndice, paginaDitado } = require('./gen_catalogo');
const { htmlAPdf } = require('./pdf');
const audio = require('./audio');
const { FUENTES_DIR, RAIZ } = require('./html');

const CONTENIDO = path.join(RAIZ, 'contenido');
const AUDIO_CACHE = process.env.DITADOS_AUDIO || path.join(RAIZ, '.cache', 'audio');

function leerConfig() { return JSON.parse(fs.readFileSync(path.join(CONTENIDO, 'config.json'), 'utf8')); }

function leerDitados() {
  return fs.readdirSync(CONTENIDO).filter((f) => /^(gl|es)-\d+\.json$/.test(f)).sort()
    .map((f) => ({ fichero: f, d: JSON.parse(fs.readFileSync(path.join(CONTENIDO, f), 'utf8')) }));
}

/** Valida todos los dictados. Devuelve true si no hay errores. */
function validarTodo({ log = console.log } = {}) {
  const config = leerConfig();
  let ok = true;
  for (const { fichero, d } of leerDitados()) {
    const r = validar(d, config);
    log(`${fichero}: ${r.errores.length ? 'ERRORES' : 'correcto'} (${d.estado})`);
    r.errores.forEach((e) => log(`  ✗ ${e}`));
    r.avisos.forEach((a) => log(`  · aviso: ${a}`));
    if (r.errores.length) ok = false;
  }
  return ok;
}

/**
 * Compila la web en dist/.
 * @param {{sinAudio?: boolean, sinPdf?: boolean, solo?: string, log?: Function}} opts
 */
function build(opts = {}) {
  const log = opts.log || console.log;
  const config = leerConfig();
  const dist = opts.dist || path.join(RAIZ, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });
  for (const f of fs.readdirSync(FUENTES_DIR)) fs.copyFileSync(path.join(FUENTES_DIR, f), path.join(dist, 'fonts', f));

  const entradas = [];
  const problemas = [];
  const hayAudio = !opts.sinAudio && audio.disponible();
  if (!opts.sinAudio && !hayAudio) log('aviso: aHoTTS o ffmpeg no disponibles; la presentación usará la voz del navegador.');

  for (const { fichero, d } of leerDitados()) {
    const id = idDitado(d);
    if (opts.solo && opts.solo !== id) continue;
    const r = validar(d, config);
    if (r.errores.length) { problemas.push(`${fichero}: ${r.errores.join(' | ')}`); continue; }
    if (d.estado !== 'publicado') { log(`${id}: ${d.estado}, no se publica`); continue; }
    log(`${id}: ${d.titulo}`);
    const carpeta = path.join(dist, id);
    const descargas = path.join(carpeta, 'descargas');
    fs.mkdirSync(descargas, { recursive: true });

    // Audio (caché fuera de dist para no volver a sintetizar en cada compilación)
    const voz = d.voz || config.voces[d.lang].defecto;
    let audioDir = null;
    const ficherosAudio = [];
    if (hayAudio && voz) {
      audioDir = path.join(AUDIO_CACHE, id, voz);
      try {
        const res = audio.generarAudio(d, audioDir, voz, { log });
        log(`  audio: ${res.generados} nuevos, ${res.reutilizados} reutilizados (voz ${voz})`);
        const destAudio = path.join(carpeta, 'audio');
        fs.mkdirSync(destAudio, { recursive: true });
        for (const f of fs.readdirSync(audioDir).filter((x) => x.endsWith('.mp3'))) {
          fs.copyFileSync(path.join(audioDir, f), path.join(destAudio, f));
          ficherosAudio.push(`audio/${f}`);
        }
      } catch (e) {
        problemas.push(`${id}: audio: ${e.message}`);
        audioDir = null;
      }
    }

    // Presentación
    const pres = generarPresentacion(d, { audioDir, voz });
    const nombrePres = nombrePresentacion(d);
    fs.writeFileSync(path.join(carpeta, nombrePres), pres.html);
    log(`  presentación: ${Math.round(pres.html.length / 1024)} KB, ${pres.conAudio ? 'con audio' : 'voz del navegador'}`);

    // Impresos
    const nombres = nombresImpresos(d);
    const ficheros = { presentacion: nombrePres, ficha: null, repetido: null, textos: null, miclase: [], audio: ficherosAudio };
    if (!opts.sinPdf) {
      const impresos = generarImpresos(d, config);
      const pFicha = htmlAPdf(impresos.ficha, path.join(descargas, nombres.ficha));
      const pRep = htmlAPdf(impresos.repetido, path.join(descargas, nombres.repetido));
      log(`  ficha: ${pFicha} páginas · repetido: ${pRep} página(s)`);
      if (pFicha !== 2) problemas.push(`${id}: la ficha ocupa ${pFicha} páginas y tiene que ocupar exactamente 2.`);
      if (pRep !== 1) problemas.push(`${id}: el dictado repetido ocupa ${pRep} páginas y tiene que ocupar 1.`);
      ficheros.ficha = `descargas/${nombres.ficha}`;
      ficheros.repetido = `descargas/${nombres.repetido}`;
    }

    // Documentos del docente
    const nd = nombresDocente(d);
    fs.writeFileSync(path.join(descargas, nd.textos), textosDocente(d));
    ficheros.textos = `descargas/${nd.textos}`;
    for (const o of d.opcions) {
      fs.writeFileSync(path.join(descargas, nd.miclase(o)), miclase(d, o));
      ficheros.miclase.push(`descargas/${nd.miclase(o)}`);
    }

    fs.writeFileSync(path.join(carpeta, 'index.html'), paginaDitado(d, ficheros, pres.conAudio ? voz : null));
    entradas.push({ d, ficheros, voz: pres.conAudio ? voz : null });
  }

  if (!opts.solo) fs.writeFileSync(path.join(dist, 'index.html'), paginaIndice(entradas));
  return { publicados: entradas.length, problemas };
}

module.exports = { build, validarTodo, leerDitados, leerConfig };
