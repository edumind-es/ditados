#!/usr/bin/env node
'use strict';
// Línea de comandos del proyecto.
//   node bin/ditados.js validar            valida todos los dictados de contenido/
//   node bin/ditados.js build [--sin-audio] [--sin-pdf] [--solo gl-02]   compila la web en dist/
//   node bin/ditados.js servir           arranca el servicio del editor (ver src/servidor.js)
//   node bin/ditados.js corregir [--solo gl-02]   pasa LanguageTool por los dictados (DITADOS_LANGUAGETOOL_URL)
const { build, validarTodo } = require('../src/build');

const [, , orden, ...resto] = process.argv;
const flag = (f) => resto.includes(f);
const valor = (f) => { const i = resto.indexOf(f); return i >= 0 ? resto[i + 1] : undefined; };

if (orden === 'validar') {
  process.exit(validarTodo() ? 0 : 1);
} else if (orden === 'build') {
  const r = build({ sinAudio: flag('--sin-audio'), sinPdf: flag('--sin-pdf'), solo: valor('--solo') });
  console.log(`\n${r.publicados} dictado(s) publicados en dist/`);
  if (r.problemas.length) {
    console.error('\nPROBLEMAS:');
    r.problemas.forEach((p) => console.error('  ✗ ' + p));
    process.exit(1);
  }
} else if (orden === 'corregir') {
  // Pasa LanguageTool (DITADOS_LANGUAGETOOL_URL) por todos los dictados o por uno (--solo id). Es una ayuda, no sustituye la revisión.
  const lt = require('../src/languagetool');
  const { leerDitados } = require('../src/build');
  if (!lt.activo()) { console.error('Define DITADOS_LANGUAGETOOL_URL (por ejemplo http://127.0.0.1:8010).'); process.exit(1); }
  (async () => {
    let total = 0;
    for (const { fichero, d } of leerDitados()) {
      if (valor('--solo') && !fichero.startsWith(valor('--solo'))) continue;
      const avisos = await lt.comprobarDitado(d);
      total += avisos.length;
      console.log(`${fichero}: ${avisos.length} aviso(s)`);
      for (const a of avisos) console.log(`  · ${a.donde}: ${a.mensaje} («${a.fragmento}»${a.sugerencias.length ? ' → ' + a.sugerencias.join(', ') : ''}) [${a.regla}]`);
    }
    console.log(`\n${total} aviso(s) en total. Revisa cada uno contra la RAG o la RAE: el corrector también se equivoca.`);
  })().catch((e) => { console.error(e.message); process.exit(1); });
} else if (orden === 'servir') {
  require('../src/servidor');
} else {
  console.log('Uso: node bin/ditados.js validar | build [--sin-audio] [--sin-pdf] [--solo <id>] | corregir [--solo <id>] | servir');
  process.exit(orden ? 1 : 0);
}
