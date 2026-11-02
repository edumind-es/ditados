'use strict';
// El dictado rápido genera la presentación en el navegador con el mismo código que la compilación.
// Aquí se ejecuta el paquete en un contexto sin Node (node:vm) y se comprueba que funciona igual.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { empaquetar } = require('../src/navegador');
const { generarRapido } = require('../src/gen_rapido');
const { generarPresentacion } = require('../src/gen_presentacion');
const { leerConfig } = require('../src/build');
const { leerPlantilla } = require('../src/html');
const { segmentar } = require('../src/segmentar');

const ditado = {
  lang: 'es', num: 1, curso: '3', titulo: 'Dictado 1 · La abuela', tema: 'La abuela', regra: 'La abuela', etiquetas: [], fixome: ['Una cosa.'], estado: 'borrador',
  opcions: [{ letra: 'A', tipo: 'Carta', titulo: 'La abuela', texto: 'Querida abuela: hoy fui al mar.', segmentos: ['Querida abuela:', 'hoy fui al mar.'], foco: [{ p: 'abuela', por: 'Con b.' }] }],
};

test('el paquete para el navegador carga sin Node y expone las funciones', () => {
  const ctx = vm.createContext({});
  vm.runInContext(empaquetar(), ctx);
  const D = ctx.Ditados;
  assert.equal(typeof D.generarPresentacion, 'function');
  const frase = 'Una frase corta. Y otra frase un poco más larga que esta.';
  // Los arrays del contexto vm son de otro «reino»: se comparan por contenido.
  assert.equal(D.segmentar(frase, { min: 3, max: 8 }).join('|'), segmentar(frase, { min: 3, max: 8 }).join('|'));
  const { html } = D.generarPresentacion(ditado, { plantilla: leerPlantilla('presentacion.html'), fuentesCss: '', licencia: 'L' });
  const esperado = generarPresentacion(ditado, { fuentesCss: '', licencia: 'L' }).html;
  assert.equal(html, esperado);
  assert.ok(html.includes('<span class="k">abuela</span>'));
  assert.equal(D.nombrePresentacion(ditado), 'Dictado01_presentacion_es.html');
});

test('la página del dictado rápido lleva los datos, el paquete y las fuentes dentro', () => {
  const html = generarRapido(leerConfig());
  assert.ok(html.includes('globalThis.Ditados'));
  assert.ok(html.includes('"cursos":'));
  assert.ok(!html.includes('/*BUNDLE*/') && !html.includes('/*DATOS*/'));
  // La plantilla de la presentación va como JSON: sus «</script>» tienen que ir escapados para no cerrar el script de la página.
  const nScripts = (html.match(/<\/script>/g) || []).length;
  assert.equal(nScripts, 3, 'solo los tres scripts de la propia página (PWA, paquete y lógica)');
  assert.ok(html.includes('data:font/woff2;base64,'), 'las fuentes van dentro para que la presentación descargada sea autónoma');
});
