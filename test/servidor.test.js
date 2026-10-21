'use strict';
// Pruebas del servicio del editor contra una copia temporal del contenido.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// El servidor lee contenido/ del repo; para no tocar los dictados reales se prueba con un dictado nuevo gl-99
// que se borra al final. La autenticación se prueba con y sin cabecera.
process.env.DITADOS_SIN_AUTH = '';
process.env.DITADOS_AUTORES = 'luis';
const { crearServidor } = require('../src/servidor');
const CONTENIDO = path.join(__dirname, '..', 'contenido');
const F99 = path.join(CONTENIDO, 'gl-99.json');

let servidor; let base;
test.before(async () => {
  servidor = crearServidor();
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => { servidor.close(); fs.rmSync(F99, { force: true }); });

const pedir = (ruta, opts = {}) => fetch(base + ruta, {
  ...opts, headers: { 'Content-Type': 'application/json', 'X-Authentik-Username': 'luis', ...(opts.headers || {}) },
  body: opts.body ? JSON.stringify(opts.body) : undefined,
});

test('sin cabecera de Authentik, 403', async () => {
  const r = await fetch(base + '/api/ditados');
  assert.equal(r.status, 403);
  const r2 = await fetch(base + '/api/ditados', { headers: { 'X-Authentik-Username': 'otro' } });
  assert.equal(r2.status, 403);
});

test('lista y lee dictados', async () => {
  const lista = await (await pedir('/api/ditados')).json();
  assert.ok(lista.some((d) => d.id === 'gl-02'));
  const d = await (await pedir('/api/ditados/gl-02')).json();
  assert.equal(d.opcions.length, 4);
});

test('no guarda un dictado inválido y explica por qué', async () => {
  const d = JSON.parse(fs.readFileSync(path.join(CONTENIDO, 'gl-02.json'), 'utf8'));
  d.num = 99; d.opcions[0].foco[0].p = 'inexistente';
  const r = await pedir('/api/ditados/gl-99', { method: 'PUT', body: d });
  assert.equal(r.status, 422);
  const j = await r.json();
  assert.ok(j.errores.some((e) => e.includes('inexistente')));
  assert.ok(!fs.existsSync(F99));
});

test('guarda un dictado nuevo como borrador y avanza de estado de uno en uno', async () => {
  const d = JSON.parse(fs.readFileSync(path.join(CONTENIDO, 'gl-02.json'), 'utf8'));
  d.num = 99; d.estado = 'publicado'; // el servidor lo ignora: nace en borrador
  let r = await pedir('/api/ditados/gl-99', { method: 'PUT', body: d });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(fs.readFileSync(F99, 'utf8')).estado, 'borrador');
  r = await pedir('/api/ditados/gl-99/estado', { method: 'POST', body: { estado: 'publicado' } });
  assert.equal(r.status, 400, 'no se puede saltar de borrador a publicado');
  // Sin revisión no se pasa a revisado
  const sinRev = { ...d, revision: { fecha: '', revisor: '', fuentes: [] } };
  await pedir('/api/ditados/gl-99', { method: 'PUT', body: sinRev });
  r = await pedir('/api/ditados/gl-99/estado', { method: 'POST', body: { estado: 'revisado' } });
  assert.equal(r.status, 422);
});

test('propone segmentos', async () => {
  const r = await pedir('/api/segmentar', { method: 'POST', body: { texto: 'Unha frase curta. E outra frase un pouco máis longa, con coma.' } });
  const j = await r.json();
  assert.equal(j.segmentos.join(' '), 'Unha frase curta. E outra frase un pouco máis longa, con coma.');
});

test('el editor se sirve solo al autor', async () => {
  assert.equal((await fetch(base + '/editor/')).status, 403);
  const r = await pedir('/editor/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Editor del autor/);
});
