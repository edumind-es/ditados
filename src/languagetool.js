'use strict';
// Corrector automático opcional (LanguageTool tiene gallego y castellano). Es una ayuda: no sustituye
// la revisión humana. Solo se usa si está configurada la URL del servidor (DITADOS_LANGUAGETOOL_URL),
// por ejemplo http://127.0.0.1:8010 con el contenedor oficial; si no, se informa de que no está activo.
const URL_LT = process.env.DITADOS_LANGUAGETOOL_URL || '';

function activo() { return Boolean(URL_LT); }

/**
 * @param {string} texto
 * @param {'gl'|'es'} lang
 * @returns {Promise<Array<{mensaje: string, fragmento: string, sugerencias: string[], regla: string}>>}
 */
async function comprobar(texto, lang) {
  if (!activo()) throw new Error('LanguageTool no está configurado (DITADOS_LANGUAGETOOL_URL).');
  const cuerpo = new URLSearchParams({ text: texto, language: lang === 'gl' ? 'gl-ES' : 'es' });
  const r = await fetch(`${URL_LT.replace(/\/$/, '')}/v2/check`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: cuerpo, signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`LanguageTool respondió ${r.status}`);
  const j = await r.json();
  return (j.matches || []).map((m) => ({
    mensaje: m.message,
    fragmento: texto.slice(m.offset, m.offset + m.length),
    sugerencias: (m.replacements || []).slice(0, 3).map((x) => x.value),
    regla: m.rule ? m.rule.id : '',
  }));
}

/** Revisa todas las opciones y las explicaciones de un dictado. */
async function comprobarDitado(d) {
  const avisos = [];
  for (const o of d.opcions) {
    for (const m of await comprobar(o.texto, d.lang)) avisos.push({ donde: `Opción ${o.letra}, texto`, ...m });
    for (const f of o.foco) for (const m of await comprobar(f.por, d.lang)) avisos.push({ donde: `Opción ${o.letra}, explicación de «${f.p}»`, ...m });
  }
  return avisos;
}

module.exports = { activo, comprobar, comprobarDitado };
