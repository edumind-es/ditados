'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { marcar } = require('../src/marcar');

test('marca palabras enteras, no trozos de otras', () => {
  const html = marcar('O mar e os corvos mariños.', [{ p: 'mar' }]);
  assert.ok(html.includes('<sup class="num" aria-hidden="true">1</sup><span class="k">mar</span>'));
  assert.ok(!html.includes('<span class="k">mar</span>iños'));
});

test('en una frase solo se marca la puntuación', () => {
  const html = marcar('Non che parece incrible?', [{ p: 'Non che parece incrible?' }]);
  assert.ok(html.includes('<span class="k">?</span>'));
  assert.ok(!html.includes('<span class="k">Non'));
});

test('numera en el orden de las claves y escapa el HTML', () => {
  const html = marcar('a <b> c', [{ p: 'c' }, { p: 'a' }]);
  assert.ok(html.indexOf('>2</sup><span class="k">a</span>') < html.indexOf('>1</sup><span class="k">c</span>'));
  assert.ok(html.includes('&lt;b&gt;'));
});

test('falla si la clave no está', () => {
  assert.throws(() => marcar('abc', [{ p: 'zzz' }]), /No encuentro/);
});
