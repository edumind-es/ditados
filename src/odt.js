'use strict';
// Conversión de los HTML de impresión a ODT con LibreOffice Writer sin interfaz (soffice --headless).
// El ODT es una versión editable para el docente; la referencia de maquetación sigue siendo el PDF.
// Las fuentes incrustadas en base64 se quitan antes de convertir (Writer no las lee y pesan).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function disponible() {
  return spawnSync('soffice', ['--version'], { timeout: 20000 }).status === 0;
}

/**
 * @param {string} html  Documento completo (el mismo que va al PDF).
 * @param {string} destino  Ruta del ODT.
 */
function htmlAOdt(html, destino) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ditados-odt-'));
  const nombre = path.basename(destino, '.odt');
  const src = path.join(tmp, `${nombre}.html`);
  // Sin @font-face en base64: Writer usa el nombre de la fuente (Atkinson Hyperlegible) si está instalada.
  // Listas sin viñeta → párrafos (Writer pondría viñetas sobre los guiones); recuadros con casillas → párrafos.
  const limpio = html
    .replace(/@font-face\{[^}]*data:font\/woff2;base64,[^}]*\}/g, '')
    .replace(/<ul class="guion">/g, '<div>').replace(/<\/ul>/g, '</div>').replace(/<ul>/g, '<div>')
    .replace(/<li>/g, '<p>').replace(/<\/li>/g, '</p>')
    .replace(/<span class="casilla"[^>]*><\/span>/g, '[ ] ')
    .replace(/<span class="liña[^"]*" aria-hidden="true"><\/span>/g, '______________');
  fs.writeFileSync(src, limpio);
  try {
    execFileSync('soffice', [
      '--headless', '--norestore', `-env:UserInstallation=file://${tmp}/perfil`,
      '--convert-to', 'odt:writer8', '--infilter=HTML (StarWriter)', '--outdir', tmp, src,
    ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 180000 });
    const salida = path.join(tmp, `${nombre}.odt`);
    if (!fs.existsSync(salida)) throw new Error('soffice no produjo el ODT');
    fs.copyFileSync(salida, destino);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return destino;
}

module.exports = { htmlAOdt, disponible };
