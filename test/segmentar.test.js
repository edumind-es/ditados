'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { segmentar } = require('../src/segmentar');
const { textoPlano, contarPalabras } = require('../src/validar');

test('los trozos reproducen el texto y respetan el rango en los dictados reales', () => {
  const dir = path.join(__dirname, '..', 'contenido');
  for (const f of fs.readdirSync(dir).filter((x) => /^(gl|es)-\d\d\.json$/.test(x))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const o of d.opcions) {
      const segs = segmentar(o.texto);
      assert.equal(segs.join(' '), textoPlano(o.texto), `${f} ${o.letra}: no reproduce el texto`);
      const largos = segs.filter((s) => contarPalabras(s) > 8);
      assert.equal(largos.length, 0, `${f} ${o.letra}: trozos de más de 8 palabras: ${largos.join(' | ')}`);
      const cortos = segs.filter((s) => contarPalabras(s) < 3);
      assert.ok(cortos.length <= 2, `${f} ${o.letra}: trozos de menos de 3 palabras: ${cortos.join(' | ')}`);
    }
  }
});

test('corta por frases y comas', () => {
  const segs = segmentar('O polbo é un animal curioso. Ten tres corazóns, oito brazos e sangue azul.');
  assert.equal(segs[0], 'O polbo é un animal curioso.');
  assert.ok(segs.every((s) => contarPalabras(s) <= 8));
});

test('un texto vacío da una lista vacía', () => {
  assert.deepEqual(segmentar(''), []);
});
