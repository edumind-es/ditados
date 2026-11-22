'use strict';
// El texto que se manda a los motores de voz se limpia de signos que suenan mal o no existen en ISO-8859-1.
// No necesita ningún motor instalado: solo prueba la normalización.
const test = require('node:test');
const assert = require('node:assert/strict');
const { textoParaVoz, KOKORO } = require('../src/audio');

test('puntos suspensivos y raya se convierten en pausas normales', () => {
  assert.equal(textoParaVoz('apártate un paso… ¡La lava!', 'es'), 'apártate un paso. ¡La lava!');
  assert.equal(textoParaVoz('—¿Vienes? —preguntó—. Sí.', 'es'), '¿Vienes?, preguntó. Sí.');
  assert.equal(textoParaVoz('el catalán, el euskera… ¿Sabías?', 'gl'), 'el catalán, el euskera. ¿Sabías?');
});

test('las comillas no suenan y los dos puntos finales de un trozo se leen como punto', () => {
  assert.equal(textoParaVoz('Dijo «hola» y “adiós”', 'es'), 'Dijo hola y adiós');
  assert.equal(textoParaVoz('Es un hecho:', 'es'), 'Es un hecho.');
  assert.equal(textoParaVoz('Recuerda: pide ayuda', 'es'), 'Recuerda: pide ayuda');
});

test('un texto normal no cambia', () => {
  assert.equal(textoParaVoz('Hace años, en algunos zoos,', 'es'), 'Hace años, en algunos zoos,');
});

test('las voces de Kokoro tienen su nombre dentro del modelo', () => {
  assert.deepEqual(Object.keys(KOKORO).sort(), ['alex', 'dora', 'santa']);
  for (const v of Object.values(KOKORO)) assert.match(v, /^e[fm]_[a-z]+$/);
});
