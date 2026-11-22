'use strict';
// Currículo de Galicia por lengua y curso (contenido/curriculo/<lengua>.json, generado por herramientas/importar_curriculo.py).
// Cada dictado declara en «curriculo» qué criterios y contenidos trabaja; aquí se leen y se resuelven sus códigos.
const fs = require('node:fs');
const path = require('node:path');

const CARPETA = path.join(__dirname, '..', 'contenido', 'curriculo');

/** {gl: {...}, es: {...}}; una lengua sin fichero simplemente no se comprueba. */
function leerCurriculo() {
  const out = {};
  for (const lang of ['gl', 'es']) {
    const f = path.join(CARPETA, `${lang}.json`);
    if (fs.existsSync(f)) out[lang] = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  return out;
}

/**
 * Criterios y contenidos de un dictado con su enunciado, listos para mostrar.
 * @returns {null | {norma: string, criterios: Array<{cod, texto}>, contenidos: Array<{cod, texto, bloque}>, bloques: string[], evaluar: string[]}}
 */
function resolver(d, curriculo) {
  const c = d.curriculo;
  const ref = curriculo && curriculo[d.lang] && curriculo[d.lang].cursos[d.curso];
  if (!c || !ref) return null;
  const criterios = (c.criterios || []).filter((k) => ref.criterios[k]).map((k) => ({ cod: k, texto: ref.criterios[k].texto, bloque: ref.criterios[k].bloque }));
  const contenidos = (c.contenidos || []).filter((k) => ref.contenidos[k]).map((k) => ({ cod: k, texto: ref.contenidos[k].texto, bloque: ref.contenidos[k].bloque }));
  const bloques = [...new Set([...contenidos, ...criterios].map((x) => x.bloque))].sort().map((b) => ref.bloques[b]).filter(Boolean);
  return { norma: ref.norma, oficiales: ref.codigos_contenido_oficiales, criterios, contenidos, bloques, evaluar: c.evaluar || [] };
}

/** Nombre corto de un bloque para filtrar: «Bloque 6. Reflexión sobre la lengua y sus usos en…» → «Reflexión sobre la lengua». */
function bloqueCorto(titulo) {
  return String(titulo).replace(/^Bloque \d+\.\s*/, '').replace(/ y sus usos.*$/, '').replace(/:.*$/, '').trim();
}

module.exports = { leerCurriculo, resolver, bloqueCorto };
