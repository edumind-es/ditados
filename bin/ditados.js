#!/usr/bin/env node
'use strict';
// Línea de comandos del proyecto.
//   node bin/ditados.js validar            valida todos los dictados de contenido/
//   node bin/ditados.js build [--sin-audio] [--sin-pdf] [--solo gl-02]   compila la web en dist/
//   node bin/ditados.js servir           arranca el servicio del editor (ver src/servidor.js)
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
} else if (orden === 'servir') {
  require('../src/servidor');
} else {
  console.log('Uso: node bin/ditados.js validar | build [--sin-audio] [--sin-pdf] [--solo <id>] | servir');
  process.exit(orden ? 1 : 0);
}
