'use strict';
// Genera la presentación proyectable de un dictado: un HTML autónomo con fuentes y audio dentro.
// Si no hay audio para alguna opción, la página usa la voz del navegador.
const fs = require('node:fs');
const path = require('node:path');
const { esc, rellenar, leerPlantilla, cssFuentes } = require('./html');
const { marcar } = require('./marcar');
const { PRESENTACION, VOCES, CATALOGO } = require('./textos');
const { idDitado, idOpcion, tituloCorto, textoPlano } = require('./validar');

/** Lee los MP3 de una opción si están todos; si no, devuelve null. */
function audioBase64(audioDir, ident, nSeg) {
  if (!audioDir) return null;
  const ficheros = [`${ident}-completo.mp3`, ...Array.from({ length: nSeg }, (_, i) => `${ident}-s${String(i + 1).padStart(2, '0')}.mp3`)];
  const rutas = ficheros.map((f) => path.join(audioDir, f));
  if (!rutas.every((r) => fs.existsSync(r))) return null;
  const enc = (r) => 'data:audio/mpeg;base64,' + fs.readFileSync(r).toString('base64');
  return { completo: enc(rutas[0]), seg: rutas.slice(1).map(enc) };
}

/**
 * @param {object} d  Dictado validado.
 * @param {{audioDir?: string, voz?: string}} opts
 * @returns {{html: string, conAudio: boolean}}
 */
function generarPresentacion(d, opts = {}) {
  const t = PRESENTACION[d.lang];
  const titulo = tituloCorto(d);
  const ops = d.opcions.map((o) => ({ ...o, ident: idOpcion(d, o), audio: audioBase64(opts.audioDir, idOpcion(d, o), o.segmentos.length) }));
  const conAudio = ops.every((o) => o.audio);

  const pasos = t.pasos.map((p, i) => `<li data-step="${i}"><span class="n">${i + 1}</span><span class="lbl">${esc(p)}</span><span class="now">${esc(t.agora)}</span></li>`).join('');
  const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join('');

  const corr = ops.map((o, k) => {
    const claves = o.foco.map((f, i) =>
      `<li><button class="kw" aria-expanded="false" aria-controls="kx${k}-${i + 1}"><span class="kn">${i + 1}</span>${esc(f.e || f.p)}</button>` +
      `<p class="kx" id="kx${k}-${i + 1}" hidden>${esc(f.por)}</p></li>`).join('');
    return `<div class="op" data-op="${k}"${k ? ' hidden' : ''}><p class="texto">${marcar(o.texto, o.foco)}</p>` +
      `<h2>${esc(t.clave)}</h2><p class="lead">${esc(t.claveP)}</p><ul class="claves">${claves}</ul></div>`;
  }).join('');

  let opsel = '';
  if (ops.length > 1) {
    const btns = ops.map((o, k) =>
      `<button class="opt" data-op="${k}" aria-pressed="${k === 0 ? 'true' : 'false'}">` +
      `<span class="ol">${esc(o.letra)}</span><span class="ot"><b>${esc(o.titulo)}</b><span>${esc(o.tipo)}</span></span></button>`).join('');
    opsel = `<div class="card soc2"><h2>${esc(t.optH)}</h2><p class="lead">${esc(t.optLead)}</p><div class="opts" role="group" aria-label="${esc(t.optH)}">${btns}</div></div>`;
  }

  const data = {
    lang: d.lang, titulo,
    ops: ops.map((o) => ({ seg: o.segmentos, texto: textoPlano(o.texto), audio: o.audio, titulo: o.titulo, letra: o.letra })),
    t,
  };
  const voz = conAudio && opts.voz && VOCES[opts.voz] ? VOCES[opts.voz] : t.vozNav;

  const html = rellenar(leerPlantilla('presentacion.html'), {
    FONTS: cssFuentes({ inline: true }),
    LANG: d.lang, TITLE: esc(`${t.tipo} ${d.num} · ${titulo}`), TIPO: esc(t.tipo), NUM: String(d.num), CURSO: esc(d.curso),
    TITULO: esc(ops.length === 1 ? titulo : `${titulo} · ${ops[0].titulo}`), UD: esc(d.ud), PASOS: pasos, NAV: esc(t.nav),
    A11Y: esc(t.a11y), S1T: esc(t.s1t), S1P: esc(t.s1p), S1L: li(t.s1l), S2T: esc(t.s2t),
    REGRA: esc(d.regra), FIX: li(d.fixome), OPSEL: opsel, CORR: corr,
    L1: esc(t.l1), L1P: esc(t.l1p), L2: esc(t.l2), L2P: esc(t.l2p), L3: esc(t.l3), L3P: esc(t.l3p),
    PLAY: esc(t.play), START: esc(t.start), PAUSE: esc(t.pause), REP: esc(t.rep), PREV: esc(t.prev), NEXT: esc(t.next),
    TEMPO: esc(t.tempo), TC: esc(t.tCurto), TM: esc(t.tMedio), TL: esc(t.tLongo), VEL: esc(t.vel), VLE: esc(t.vLenta), VNO: esc(t.vNormal),
    S4T: esc(t.s4t), MODO1: esc(t.modo1), MODO2: esc(t.modo2), M1P: esc(t.m1p), M2P: esc(t.m2p), AMOSAR: esc(t.amosar),
    S5T: esc(t.s5t), S5L: li(t.s5l), S5P: esc(t.s5p), VOZ: esc(voz), PE: esc(t.pe), AREA: esc(t.area), LICENCIA: esc(CATALOGO.licencia),
    ANT: esc(t.anterior), SEG: esc(t.seguinte), NSEG: String(ops[0].segmentos.length), ANACO: esc(t.anaco), DE: esc(t.de),
    DATA: JSON.stringify(data).replace(/<\//g, '<\\/'),
  });
  return { html, conAudio };
}

/** Nombre de fichero de la presentación: Ditado02_presentacion_gl.html */
function nombrePresentacion(d) {
  return `${PRESENTACION[d.lang].tipo}${String(d.num).padStart(2, '0')}_presentacion_${d.lang}.html`;
}

module.exports = { generarPresentacion, nombrePresentacion, idDitado };
