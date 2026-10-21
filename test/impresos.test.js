'use strict';
// La ficha ocupa exactamente dos páginas y el dictado repetido una, en todos los dictados publicados.
// Necesita Chromium (Playwright) y pdfinfo; si faltan, la prueba se omite y lo dice.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generarImpresos } = require('../src/gen_impresos');
const { leerDitados, leerConfig } = require('../src/build');
const { generarKit } = require('../src/gen_kit');

let pdf;
try { pdf = require('../src/pdf'); pdf.chromium(); } catch (e) { pdf = null; }

const config = leerConfig();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ditados-test-'));

for (const { fichero, d } of leerDitados()) {
  for (const formato of ['A4', 'A3', 'grande']) {
    test(`${fichero} ${formato}: la ficha y el repetido ocupan las páginas previstas`, { skip: pdf ? false : 'sin Chromium o pdfinfo' }, () => {
      const h = generarImpresos(d, config, formato);
      assert.equal(pdf.htmlAPdf(h.ficha, path.join(tmp, `${fichero}-${formato}-ficha.pdf`)), h.paginas.ficha);
      assert.equal(pdf.htmlAPdf(h.repetido, path.join(tmp, `${fichero}-${formato}-rep.pdf`)), h.paginas.repetido);
    });
  }
}

for (const lang of ['gl', 'es']) {
  test(`kit ${lang}: tarjeta de 2 páginas y cuaderno de 1`, { skip: pdf ? false : 'sin Chromium o pdfinfo' }, () => {
    const k = generarKit(lang);
    assert.equal(pdf.htmlAPdf(k.tarxeta, path.join(tmp, `kit-${lang}-t.pdf`)), 2);
    assert.equal(pdf.htmlAPdf(k.caderno, path.join(tmp, `kit-${lang}-c.pdf`)), 1);
  });
}
