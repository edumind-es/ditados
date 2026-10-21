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
  return `<p class="cab">${esc(t.area)} · ${esc(d.curso)}.º · ${esc(t.tipo)} ${d.num} <span>· ${esc(d.tema)}</span></p>`;
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

// Formatos de impresión (apartado 6: la versión común no sustituye el material de baja visión).
//  - A4: el estándar, 14 pt, ficha de 2 páginas.
//  - A3: la misma ficha ampliada (20 pt, renglones de 15,5 mm), 2 páginas A3.
//  - grande: A4 a 18 pt con renglones de 14 mm; cada cara ocupa dos páginas (4 en total).
const FORMATOS = {
  A4: { css: '', renglones: (n) => n, paginasFicha: 2, paginasRep: 1 },
  A3: { css: '@page{size:A3 portrait;margin:20mm} body{font-size:20pt} h1{font-size:31pt} h2{font-size:23pt} .cab{font-size:17pt} .pe{font-size:14pt} .renglons td{height:15.5mm} table.clasif td{height:13mm} .casilla{width:7mm;height:7mm} .liña{min-width:54mm}.liña.curta{min-width:31mm}.liña.longa{min-width:88mm}', renglones: (n) => n, paginasFicha: 2, paginasRep: 1 },
  grande: { css: 'body{font-size:18pt;line-height:1.3} h1{font-size:26pt} h2{font-size:20pt} .cab{font-size:14pt} .renglons td{height:14mm} table.clasif td{height:12mm} .casilla{width:6.5mm;height:6.5mm} .pagina.sigue{page-break-before:always}', renglones: (n) => n, paginasFicha: 4, paginasRep: 2 },
};

function envolver(d, titulo, cuerpo, formato = 'A4') {
  return rellenar(leerPlantilla('impreso.html'), {
    FONTS: cssFuentes({ inline: true }), EXTRA: FORMATOS[formato].css, LANG: d.lang, TITLE: esc(titulo), CUERPO: cuerpo, PE: esc(FICHA[d.lang].pe),
  });
}

/**
 * @param {'A4'|'A3'|'grande'} formato
 * @returns {{ficha: string, repetido: string, paginas: {ficha: number, repetido: number}}} HTML de cada impreso y páginas esperadas.
 */
function generarImpresos(d, config, formato = 'A4') {
  const t = FICHA[d.lang];
  const f = FORMATOS[formato];
  const nRenglones = f.renglones((config.cursos[d.curso] || {}).renglones || 10);
  const pre = `${t.tipo} ${d.num} · ${tituloCorto(d)}`;
  let ficha = cuerpoFicha(d, t, nRenglones);
  let repetido = cuerpoRepetido(d, t);
  if (formato === 'grande') {
    // En letra grande, cada cara se parte en dos páginas por un punto previsible: antes de los renglones y antes del punto 4.
    ficha = ficha.replace('<h2>' + esc(t.escribo) + '</h2>', '</section><section class="pagina sigue"><h2>' + esc(t.escribo) + '</h2>')
      .replace('<h2>' + esc(t.p4) + '</h2>', '</section><section class="pagina sigue"><h2>' + esc(t.p4) + '</h2>');
    repetido = repetido.replace('<h2>' + esc(t.p3.replace(/^\d+\. /, '')) + '</h2>', '</section><section class="pagina sigue"><h2>' + esc(t.p3.replace(/^\d+\. /, '')) + '</h2>');
  }
  return {
    ficha: envolver(d, pre, ficha, formato),
    repetido: envolver(d, `${pre} · ${t.rep}`, repetido, formato),
    paginas: { ficha: f.paginasFicha, repetido: f.paginasRep },
  };
}

/** Nombres de fichero: Ditado02_ficha_gl.pdf, Ditado02_ficha_gl_A3.pdf, Ditado02_ficha_gl_grande.pdf… */
function nombresImpresos(d, formato = 'A4') {
  const pre = (d.lang === 'gl' ? 'Ditado' : 'Dictado') + String(d.num).padStart(2, '0');
  const suf = formato === 'A4' ? '' : `_${formato}`;
  return { ficha: `${pre}_ficha_${d.lang}${suf}.pdf`, repetido: `${pre}_repetido_${d.lang}${suf}.pdf` };
}

module.exports = { generarImpresos, nombresImpresos, FORMATOS };
