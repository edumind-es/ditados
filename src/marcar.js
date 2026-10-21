'use strict';
// Marca en HTML las palabras clave de un texto: numeradas, en negrita y subrayadas.
// Si la clave es una frase (lleva espacios), solo se marca la puntuación, no las palabras.
// Es el mismo algoritmo que el prototipo (gen_html.py), portado a JavaScript.
const { esc } = require('./html');

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const esAlfanum = (ch) => /[\p{L}\p{N}]/u.test(ch);

/**
 * @param {string} texto  Texto del dictado (puede llevar \n).
 * @param {Array<{p:string}>} foco  Palabras clave en orden.
 * @returns {string} HTML.
 */
function marcar(texto, foco) {
  const n = texto.length;
  const owner = Array.from({ length: n }, () => new Set());
  const starts = new Map();
  foco.forEach((f, idx) => {
    const i = idx + 1;
    const p = f.p;
    let pat = escapeRe(p);
    if (esAlfanum(p[0])) pat = '(?<![\\p{L}\\p{N}])' + pat;
    if (esAlfanum(p[p.length - 1])) pat = pat + '(?![\\p{L}\\p{N}])';
    const m = new RegExp(pat, 'u').exec(texto);
    if (!m) throw new Error(`No encuentro la palabra clave: ${p}`);
    const frase = p.includes(' ');
    for (let k = m.index; k < m.index + p.length; k++) {
      const ch = texto[k];
      if (!frase || !(esAlfanum(ch) || ch === ' ')) owner[k].add(i);
    }
    if (!starts.has(m.index)) starts.set(m.index, []);
    starts.get(m.index).push(i);
  });
  const out = [];
  let abierto = false;
  for (let k = 0; k < n; k++) {
    const ch = texto[k];
    const marcado = owner[k].size > 0;
    if (starts.has(k)) {
      if (abierto) { out.push('</span>'); abierto = false; }
      out.push(starts.get(k).map((i) => `<sup class="num" aria-hidden="true">${i}</sup>`).join(''));
    }
    if (marcado !== abierto) {
      if (abierto) { out.push('</span>'); abierto = false; } else { out.push('<span class="k">'); abierto = true; }
    }
    out.push(ch === '\n' ? '<br>' : esc(ch));
  }
  if (abierto) out.push('</span>');
  return out.join('');
}

module.exports = { marcar };
