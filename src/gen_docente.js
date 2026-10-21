'use strict';
// Documentos para el docente: Markdown de importación en MiClase (uno por opción)
// y «textos para el docente» con las opciones, las claves explicadas y las notas de datos.
const { DOCENTE } = require('./textos');
const { tituloCorto, contarPalabras, textoPlano } = require('./validar');

const LIMITE_PREGUNTAS = 50; // límite de MiClase

/** Markdown de MiClase para una opción: cada clave es una pregunta con dos respuestas. */
function miclase(d, o) {
  const l = DOCENTE[d.lang];
  if (o.foco.length > LIMITE_PREGUNTAS) throw new Error(`MiClase admite ${LIMITE_PREGUNTAS} preguntas como máximo.`);
  const lineas = [`# ${l.tipo} ${d.num}${o.letra} · ${o.titulo} (autocorrección)`, 'Penalización: 0', ''];
  o.foco.forEach((f, i) => { lineas.push(`${i + 1}. ${f.e || f.p}`, `a) ${l.a}*`, `b) ${l.b}`, ''); });
  return lineas.join('\n');
}

function textosDocente(d) {
  const l = DOCENTE[d.lang];
  const md = ['---', `title: "${l.tipo} ${d.num} · ${tituloCorto(d)} · ${l.tit}"`, 'author: "Luis Vilela Acuña"', `lang: ${d.lang}`, '---', '',
    `${d.tema} · ${l.intro}`, '', `> ${l.miclaseAviso}`, ''];
  for (const o of d.opcions) {
    md.push(`# ${o.letra} · ${o.titulo} (${o.tipo}, ${contarPalabras(textoPlano(o.texto))} ${l.pal})`, '', o.texto.replace(/\n/g, '  \n'), '', `**${l.clave}**`, '');
    o.foco.forEach((f, i) => md.push(`${i + 1}. **${f.e || f.p}**: ${f.por}`));
    md.push('');
    if (o.datos) md.push(`**${l.datos}.** ${o.datos}`, '');
  }
  return md.join('\n');
}

/** Nombres: Ditado02A_MiClase_gl.md y Ditado02_textos_docente_gl.md */
function nombresDocente(d) {
  const pre = `${DOCENTE[d.lang].tipo}${String(d.num).padStart(2, '0')}`;
  return {
    textos: `${pre}_textos_docente_${d.lang}.md`,
    miclase: (o) => `${pre}${o.letra}_MiClase_${d.lang}.md`,
  };
}

module.exports = { miclase, textosDocente, nombresDocente, LIMITE_PREGUNTAS };
