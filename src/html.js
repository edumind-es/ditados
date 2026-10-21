'use strict';
// Utilidades de HTML compartidas: escapado, plantillas con marcadores {{X}} y fuentes alojadas.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const FUENTES_DIR = path.join(RAIZ, 'public', 'fonts');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Rellena una plantilla sustituyendo {{CLAVE}} y falla si queda alguna sin valor. */
function rellenar(plantilla, valores) {
  let out = plantilla;
  for (const [k, v] of Object.entries(valores)) out = out.split(`{{${k}}}`).join(v);
  const restos = out.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (restos) throw new Error(`Marcadores sin rellenar: ${[...new Set(restos)].join(', ')}`);
  return out;
}

function leerPlantilla(nombre) {
  return fs.readFileSync(path.join(RAIZ, 'plantillas', nombre), 'utf8');
}

// Declaraciones @font-face. Con `inline` las fuentes van en base64 dentro del HTML (presentación autónoma);
// si no, se enlazan desde /fonts/ (catálogo e impresos).
const FUENTES = [
  { familia: 'Fraunces', peso: '700', fichero: 'Fraunces.woff2' },
  { familia: 'Space Grotesk', peso: '400 700', fichero: 'SpaceGrotesk.woff2' },
  { familia: 'Atkinson Hyperlegible', peso: '400', fichero: 'AtkinsonHyperlegible-Regular.woff2' },
  { familia: 'Atkinson Hyperlegible', peso: '700', fichero: 'AtkinsonHyperlegible-Bold.woff2' },
];

function cssFuentes({ inline = false, prefijo = '/fonts/' } = {}) {
  return FUENTES.map((f) => {
    const src = inline
      ? `data:font/woff2;base64,${fs.readFileSync(path.join(FUENTES_DIR, f.fichero)).toString('base64')}`
      : prefijo + f.fichero;
    return `@font-face{font-family:'${f.familia}';font-style:normal;font-weight:${f.peso};font-display:swap;src:url('${src}') format('woff2')}`;
  }).join('\n');
}

module.exports = { esc, rellenar, leerPlantilla, cssFuentes, FUENTES_DIR, RAIZ };
