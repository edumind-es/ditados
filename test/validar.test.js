'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validar, contarPalabras, textoPlano } = require('../src/validar');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contenido', 'config.json'), 'utf8'));

function ditadoBase() {
  const texto = Array.from({ length: 70 }, (_, i) => `palabra${i}`).join(' ');
  const segmentos = [];
  const palabras = texto.split(' ');
  for (let i = 0; i < palabras.length; i += 5) segmentos.push(palabras.slice(i, i + 5).join(' '));
  return {
    lang: 'gl', num: 9, curso: '6', titulo: 'Ditado 9 · Proba', tema: 'Proba', regra: 'Regra', etiquetas: ['proba'],
    fixome: ['a', 'b', 'c'], estado: 'borrador',
    opcions: [{
      letra: 'A', tipo: 'Curiosidade', titulo: 'Un texto', texto, segmentos,
      foco: Array.from({ length: 12 }, (_, i) => ({ p: `palabra${i}`, por: 'porque si' })),
      datos: 'sen datos',
    }],
  };
}

test('cuenta palabras como el prototipo', () => {
  assert.equal(contarPalabras('Non che parece incrible?'), 4);
  assert.equal(contarPalabras('  a  b\nc '), 3);
  assert.equal(textoPlano('Querida avoa:\nOla.'), 'Querida avoa: Ola.');
});

test('un dictado correcto no da errores', () => {
  const r = validar(ditadoBase(), config);
  assert.deepEqual(r.errores, []);
});

test('detecta segmentos que no reproducen el texto', () => {
  const d = ditadoBase();
  d.opcions[0].segmentos[2] = 'palabra10 palabra11 cambiada palabra13 palabra14';
  const r = validar(d, config);
  assert.ok(r.errores.some((e) => e.includes('no reproducen el texto')));
});

test('detecta una clave que no está en el texto', () => {
  const d = ditadoBase();
  d.opcions[0].foco[0].p = 'inexistente';
  const r = validar(d, config);
  assert.ok(r.errores.some((e) => e.includes('«inexistente» no aparece')));
});

test('rango de palabras por curso', () => {
  const d = ditadoBase();
  d.opcions[0].texto = 'moi curto';
  d.opcions[0].segmentos = ['moi curto'];
  d.opcions[0].foco = [];
  const r = validar(d, config);
  assert.ok(r.errores.some((e) => e.includes('entre 60 y 90')));
  assert.ok(r.errores.some((e) => e.includes('palabras clave; tienen que ser entre 10 y 18')));
});

test('no se publica sin revisión completa', () => {
  const d = ditadoBase();
  d.estado = 'publicado';
  let r = validar(d, config);
  assert.ok(r.errores.some((e) => e.includes('bloque «revision»')));
  d.revision = { fecha: '2026-10-19', revisor: 'Luis', fuentes: [] };
  r = validar(d, config);
  assert.ok(r.errores.some((e) => e.includes('al menos una fuente')));
  d.revision.fuentes = ['https://academia.gal/dicionario'];
  r = validar(d, config);
  assert.deepEqual(r.errores, []);
});

test('los cuatro dictados iniciales pasan la validación', () => {
  const dir = path.join(__dirname, '..', 'contenido');
  const ficheros = fs.readdirSync(dir).filter((f) => /^(gl|es)-\d\d\.json$/.test(f));
  assert.ok(ficheros.length >= 4, 'faltan dictados iniciales');
  for (const f of ficheros) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = validar(d, config);
    assert.deepEqual(r.errores, [], `${f}: ${r.errores.join(' | ')}`);
  }
});
