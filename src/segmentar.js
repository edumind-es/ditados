'use strict';
// Segmentación automática de un texto en trozos para dictar (de 3 a 8 palabras).
// Corta primero por puntuación fuerte y después por puntuación débil; si un trozo sigue siendo
// largo, lo parte por la mitad buscando una conjunción o preposición. La propuesta es editable.
const { textoPlano, contarPalabras } = require('./validar');

const NEXOS = /^(e|y|ou|u|pero|mais|que|porque|cando|cuando|onde|donde|mentres|mientras|para|por|con|sen|sin|se|si)$/i;

function partir(palabras, max) {
  if (palabras.length <= max) return [palabras];
  // Busca el mejor punto de corte cerca de la mitad: justo antes de un nexo.
  const mitad = Math.floor(palabras.length / 2);
  let corte = mitad;
  for (let d = 0; d <= 2; d++) {
    for (const c of [mitad - d, mitad + d]) {
      if (c >= 3 && c <= palabras.length - 3 && NEXOS.test(palabras[c].replace(/[^\p{L}]/gu, ''))) { corte = c; d = 99; break; }
    }
  }
  return [...partir(palabras.slice(0, corte), max), ...partir(palabras.slice(corte), max)];
}

/**
 * @param {string} texto
 * @param {{min?: number, max?: number}} opts
 * @returns {string[]} Trozos que, unidos con un espacio, reproducen el texto plano.
 */
function segmentar(texto, { min = 3, max = 8 } = {}) {
  const plano = textoPlano(texto);
  if (!plano) return [];
  // 1. Frases: cortes tras . ! ? … ; :
  // Frase = texto + puntuación fuerte, con sus comillas de cierre y la puntuación que las sigue («…!».)
  const frases = plano.match(/[^.!?…;:]+[.!?…;:]+(?:\s*[»”")\]]+[.!?…;:]*)?|[^.!?…;:]+$/g).map((f) => f.trim()).filter(Boolean);
  const trozos = [];
  for (const frase of frases) {
    // 2. Dentro de la frase, por comas
    const porComas = frase.match(/[^,]+,?/g).map((x) => x.trim()).filter(Boolean);
    let acumulado = [];
    const vaciar = () => { if (acumulado.length) { trozos.push(...partir(acumulado, max)); acumulado = []; } };
    for (const parte of porComas) {
      const palabras = parte.split(/\s+/);
      if (acumulado.length && acumulado.length + palabras.length > max) vaciar();
      acumulado.push(...palabras);
      if (acumulado.length >= min + 2) vaciar();
    }
    vaciar();
  }
  // 3. Trozos demasiado cortos: se pegan al anterior (o al siguiente si es el primero)
  const final = [];
  for (const t of trozos) {
    const n = t.length;
    if (n < min && final.length && contarPalabras(final[final.length - 1]) + n <= max) final[final.length - 1] += ' ' + t.join(' ');
    else final.push(t.join(' '));
  }
  if (final.length > 1 && contarPalabras(final[0]) < min && contarPalabras(final[0]) + contarPalabras(final[1]) <= max) { final[1] = final[0] + ' ' + final[1]; final.shift(); }
  return final;
}

module.exports = { segmentar };
