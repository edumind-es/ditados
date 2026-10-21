'use strict';
// Convierte HTML a PDF con el Chromium sin interfaz de Playwright (ya instalado en el servidor)
// y cuenta las páginas con pdfinfo (poppler). No necesita ningún paquete de npm.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** Busca el ejecutable de Chromium: variable DITADOS_CHROME o la caché de Playwright. */
function chromium() {
  if (process.env.DITADOS_CHROME) return process.env.DITADOS_CHROME;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) throw new Error('No encuentro Chromium. Define DITADOS_CHROME con la ruta del ejecutable.');
  const candidatos = fs.readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell-')).sort();
  for (const d of candidatos.reverse()) {
    const bin = path.join(base, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (fs.existsSync(bin)) return bin;
  }
  throw new Error('No encuentro chrome-headless-shell en ~/.cache/ms-playwright. Define DITADOS_CHROME.');
}

/**
 * @param {string} html  Documento completo.
 * @param {string} destino  Ruta del PDF.
 * @returns {number} Número de páginas del PDF generado.
 */
function htmlAPdf(html, destino) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ditados-pdf-'));
  const src = path.join(tmp, 'doc.html');
  fs.writeFileSync(src, html);
  try {
    execFileSync(chromium(), [
      '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${path.resolve(destino)}`, `file://${src}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 120000 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return contarPaginas(destino);
}

function contarPaginas(pdf) {
  const out = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  const m = out.match(/^Pages:\s+(\d+)/m);
  if (!m) throw new Error(`pdfinfo no devolvió el número de páginas de ${pdf}`);
  return Number(m[1]);
}

module.exports = { htmlAPdf, contarPaginas, chromium };
