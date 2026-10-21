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
const { generarKit, nombresKit } = require('./gen_kit');
const { generarPaquete } = require('./gen_paquete');
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

  // Kit fijo por lengua: tarjeta (2 páginas) y cuaderno de reglas (1 página). Va antes porque el paquete de cada dictado lo incluye.
  const kit = {};
  if (!opts.sinPdf) {
    fs.mkdirSync(path.join(dist, 'kit'), { recursive: true });
    for (const lang of ['gl', 'es']) {
      const k = generarKit(lang); const n = nombresKit(lang);
      const pT = htmlAPdf(k.tarxeta, path.join(dist, 'kit', n.tarxeta));
      const pC = htmlAPdf(k.caderno, path.join(dist, 'kit', n.caderno));
      if (pT !== 2) problemas.push(`kit ${lang}: la tarjeta ocupa ${pT} páginas y tiene que ocupar 2.`);
      if (pC !== 1) problemas.push(`kit ${lang}: el cuaderno ocupa ${pC} páginas y tiene que ocupar 1.`);
      kit[lang] = { tarxeta: `kit/${n.tarxeta}`, caderno: `kit/${n.caderno}` };
      log(`kit ${lang}: tarjeta ${pT} páginas · cuaderno ${pC} página(s)`);
    }
  }
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
    ficheros.formatos = {};
    if (!opts.sinPdf) {
      for (const formato of ['A4', 'A3', 'grande']) {
        const impresos = generarImpresos(d, config, formato);
        const n = nombresImpresos(d, formato);
        const pFicha = htmlAPdf(impresos.ficha, path.join(descargas, n.ficha));
        const pRep = htmlAPdf(impresos.repetido, path.join(descargas, n.repetido));
        log(`  ficha ${formato}: ${pFicha} páginas · repetido: ${pRep} página(s)`);
        if (pFicha !== impresos.paginas.ficha) problemas.push(`${id}: la ficha ${formato} ocupa ${pFicha} páginas y tiene que ocupar ${impresos.paginas.ficha}.`);
        if (pRep !== impresos.paginas.repetido) problemas.push(`${id}: el dictado repetido ${formato} ocupa ${pRep} páginas y tiene que ocupar ${impresos.paginas.repetido}.`);
        ficheros.formatos[formato] = { ficha: `descargas/${n.ficha}`, repetido: `descargas/${n.repetido}` };
      }
      ficheros.ficha = ficheros.formatos.A4.ficha;
      ficheros.repetido = ficheros.formatos.A4.repetido;
    }

    // Documentos del docente
    const nd = nombresDocente(d);
    fs.writeFileSync(path.join(descargas, nd.textos), textosDocente(d));
    ficheros.textos = `descargas/${nd.textos}`;
    for (const o of d.opcions) {
      fs.writeFileSync(path.join(descargas, nd.miclase(o)), miclase(d, o));
      ficheros.miclase.push(`descargas/${nd.miclase(o)}`);
    }

    // Paquete sin conexión (ZIP) con todo lo del dictado y el kit de su lengua
    try {
      ficheros.paquete = generarPaquete(d, carpeta, kit[d.lang], dist);
      log(`  paquete: ${ficheros.paquete} (${Math.round(fs.statSync(path.join(carpeta, ficheros.paquete)).size / 1024)} KB)`);
    } catch (e) { problemas.push(`${id}: paquete: ${e.message}`); }

    fs.writeFileSync(path.join(carpeta, 'index.html'), paginaDitado(d, ficheros, pres.conAudio ? voz : null, kit[d.lang]));
    entradas.push({ d, ficheros, voz: pres.conAudio ? voz : null });
  }

  if (!opts.solo) {
    fs.writeFileSync(path.join(dist, 'index.html'), paginaIndice(entradas, kit));
    escribirPwa(dist);
  }
  return { publicados: entradas.length, problemas };
}

/** Manifest, service worker e icono de la PWA del catálogo. */
function escribirPwa(dist) {
  const version = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const fuentes = fs.readdirSync(FUENTES_DIR).filter((f) => f.endsWith('.woff2')).map((f) => JSON.stringify(`./fonts/${f}`)).join(', ');
  const sw = fs.readFileSync(path.join(RAIZ, 'plantillas', 'sw.js'), 'utf8').replace('{{VERSION}}', version).replace('{{FUENTES}}', fuentes);
  fs.writeFileSync(path.join(dist, 'sw.js'), sw);
  fs.copyFileSync(path.join(RAIZ, 'public', 'icono.svg'), path.join(dist, 'icono.svg'));
  fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
    name: 'Ditados EDUmind', short_name: 'Ditados', description: 'Dictados de Lingua Galega y Lengua Castellana para primaria',
    start_url: './', scope: './', display: 'standalone', background_color: '#ece9e1', theme_color: '#1a1a1a', lang: 'es',
    icons: [{ src: 'icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 2));
}

module.exports = { build, validarTodo, leerDitados, leerConfig };
