'use strict';
// Impresos de un dictado como HTML de impresión: ficha de dos caras y dictado repetido.
// La conversión a PDF y el recuento de páginas los hace pdf.js. Aquí solo se compone el HTML.
const { esc, rellenar, leerPlantilla, cssFuentes } = require('./html');
const { FICHA } = require('./textos');
const { tituloCorto } = require('./validar');

const casilla = (t) => `<span class="casilla" role="img" aria-label="${esc(t.casilla)}"></span>`;
const linea = (clase = '') => `<span class="liña ${clase}" aria-hidden="true"></span>`;

function renglones(n) {
  return `<table class="renglons" aria-hidden="true">${'<tr><td></td></tr>'.repeat(n)}</table>`;
}

function cabecera(t, d) {
  return `<p class="cab">${esc(t.area)} · ${esc(d.curso)}.º · ${esc(t.tipo)} ${d.num} <span>· ${esc(d.ud)}</span></p>`;
}

function nombreFecha(t) {
  return `<p class="nome">${esc(t.nome)}: ${linea('longa')} &nbsp; ${esc(t.data)}: ${linea('curta')}</p>`;
}

/** Cara A y cara B de la ficha. nRenglones viene de config por curso. */
function cuerpoFicha(d, t, nRenglones) {
  const letras = d.opcions.map((o) => `${casilla(t)}${esc(o.letra)}`).join('');
  const nClaves = Math.min(...d.opcions.map((o) => o.foco.length));
  const caraA = `
<section class="pagina">
  ${cabecera(t, d)}
  <h1>${esc(tituloCorto(d))}</h1>
  ${nombreFecha(t)}
  <div class="caixa"><p><b>${esc(t.antes)}</b></p><ul>${d.fixome.map((x) => `<li>— ${esc(x)}</li>`).join('')}</ul></div>
  <div class="caixa"><p><b>${esc(t.criterios)}</b></p><ul>${t.crit.map((x) => `<li>${casilla(t)}${esc(x)}</li>`).join('')}</ul></div>
  <h2>${esc(t.escribo)}</h2>
  <p class="letras">${esc(t.textoDo)} ${letras}</p>
  ${renglones(nRenglones)}
</section>`;
  const filas = Array.from({ length: 5 }, () => `<tr>${t.cols.map(() => '<td></td>').join('')}</tr>`).join('');
  const caraB = `
<section class="pagina">
  ${cabecera(t, d)}
  <h1>${esc(t.reviso)}</h1>
  <h2>${esc(t.p1)}</h2>
  <p>${casilla(t)}${esc(t.p1a)}</p>
  <p>${casilla(t)}${esc(t.p1b)}</p>
  <h2>${esc(t.p2)}</h2>
  <table class="clasif"><thead><tr>${t.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
  <h2>${esc(t.p3)}</h2>
  <p>${esc(t.p3t(nClaves))}</p>
  <h2>${esc(t.p4)}</h2>
  <p>${esc(t.p4t[0])} ${linea()} ${esc(t.p4t[1])} ${linea('curta')}</p>
  <p>${esc(t.p4t[2])} ${linea('longa')} ${linea('longa')}</p>
  ${renglones(1)}
  <h2>${esc(t.p5)}</h2>
  <div class="duas"><p>1 ${linea()}</p><p>2 ${linea()}</p></div>
  <div class="duas"><p>3 ${linea()}</p><p>4 ${linea()}</p></div>
  <h2>${esc(t.p6)}</h2>
  <div class="duas"><p>${casilla(t)}${esc(t.sent[0])}</p><p>${casilla(t)}${esc(t.sent[1])}</p></div>
  <div class="duas"><p>${casilla(t)}${esc(t.sent[2])}</p><p>${casilla(t)}${esc(t.sent[3])}</p></div>
  <p>${esc(t.p6t)}</p>
  ${renglones(1)}
</section>`;
  return caraA + caraB;
}

function cuerpoRepetido(d, t) {
  const nClaves = Math.min(...d.opcions.map((o) => o.foco.length));
  return `
<section class="pagina">
  ${cabecera(t, d)}
  <h1>${esc(t.rep)}</h1>
  ${nombreFecha(t)}
  <p class="sub">${esc(t.repSub)}</p>
  ${renglones(12)}
  <h2>${esc(t.p3.replace(/^\d+\. /, ''))}</h2>
  <p>${esc(t.repT[0])} ${linea('curta')} ${esc('de')} ${nClaves}</p>
  <p>${esc(t.repT[1])} ${linea('curta')} ${esc('de')} ${nClaves}</p>
  <p>${esc(t.repQ)}</p>
  ${renglones(2)}
</section>`;
}

function envolver(d, titulo, cuerpo) {
  return rellenar(leerPlantilla('impreso.html'), {
    FONTS: cssFuentes({ inline: true }), LANG: d.lang, TITLE: esc(titulo), CUERPO: cuerpo, PE: esc(FICHA[d.lang].pe),
  });
}

/** @returns {{ficha: string, repetido: string}} HTML de cada impreso. */
function generarImpresos(d, config) {
  const t = FICHA[d.lang];
  const nRenglones = (config.cursos[d.curso] || {}).renglones || 10;
  const pre = `${t.tipo} ${d.num} · ${tituloCorto(d)}`;
  return {
    ficha: envolver(d, pre, cuerpoFicha(d, t, nRenglones)),
    repetido: envolver(d, `${pre} · ${t.rep}`, cuerpoRepetido(d, t)),
  };
}

/** Nombres de fichero: Ditado02_ficha_gl.pdf, Ditado02_repetido_gl.pdf */
function nombresImpresos(d) {
  const pre = (d.lang === 'gl' ? 'Ditado' : 'Dictado') + String(d.num).padStart(2, '0');
  return { ficha: `${pre}_ficha_${d.lang}.pdf`, repetido: `${pre}_repetido_${d.lang}.pdf` };
}

module.exports = { generarImpresos, nombresImpresos };
