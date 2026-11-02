'use strict';
// Empaqueta para el navegador los módulos que no dependen de Node (validar, marcar, segmentar, textos,
// html y gen_presentacion), con un «require» mínimo. Así el dictado rápido genera la presentación en el
// navegador con exactamente el mismo código que la compilación, sin duplicar lógica ni añadir dependencias.
// Los módulos de Node que esos ficheros cargan al arrancar (fs, path) se sustituyen por cascarones: solo los
// usan funciones que el navegador no llama (leer plantillas o fuentes del disco).
const fs = require('node:fs');
const path = require('node:path');

const MODULOS = ['html', 'validar', 'marcar', 'segmentar', 'textos', 'gen_presentacion'];

function empaquetar() {
  const defs = MODULOS.map((m) =>
    `'./${m}': function (module, exports, require, __dirname) {\n${fs.readFileSync(path.join(__dirname, `${m}.js`), 'utf8')}\n}`).join(',\n');
  return `(function () {
  const defs = {\n${defs}\n};
  const cascarones = { 'node:fs': {}, 'node:path': { join: (...a) => a.join('/') } };
  const cache = {};
  function require(n) {
    if (cascarones[n]) return cascarones[n];
    if (cache[n]) return cache[n].exports;
    if (!defs[n]) throw new Error('Módulo no incluido en el paquete: ' + n);
    const m = { exports: {} }; cache[n] = m;
    defs[n](m, m.exports, require, '');
    return m.exports;
  }
  const p = require('./gen_presentacion'), s = require('./segmentar'), v = require('./validar'), t = require('./textos'), h = require('./html');
  globalThis.Ditados = {
    generarPresentacion: p.generarPresentacion, nombrePresentacion: p.nombrePresentacion,
    segmentar: s.segmentar, textoPlano: v.textoPlano, contarPalabras: v.contarPalabras, tituloCorto: v.tituloCorto,
    PRESENTACION: t.PRESENTACION, esc: h.esc,
  };
})();`;
}

module.exports = { empaquetar, MODULOS };
