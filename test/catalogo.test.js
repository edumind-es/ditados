'use strict';
// Portada del catálogo: mapa de niveles (primaria y ESO), orden por lengua y curso, y vista previa de los textos.
const test = require('node:test');
const assert = require('node:assert/strict');
const { paginaIndice, paginaDitado } = require('../src/gen_catalogo');
const { leerConfig } = require('../src/build');
const { nombreCurso, etapaDe, validar } = require('../src/validar');

const ditado = (lang, num, curso) => ({
  lang, num, curso, titulo: `Dictado ${num} · Prueba`, tema: 'La b', regra: 'Palabras con b', etiquetas: ['b'], fixome: ['Una.', 'Dos.', 'Tres.'], estado: 'publicado',
  revision: { fecha: '2026-11-19', revisor: 'Prueba', fuentes: ['https://www.rae.es'] },
  opcions: [{ letra: 'A', tipo: 'Carta', titulo: 'La abuela', texto: 'Querida abuela: hoy fui al mar.', segmentos: ['Querida abuela:', 'hoy fui al mar.'], foco: [{ p: 'abuela', por: 'Con b.' }] }],
});
const ficheros = { presentacion: 'p.html', miclase: [], audio: ['audio/es-01a-completo.mp3'] };
const entrada = (d) => ({ d, ficheros, voz: null });

test('nombre y etapa de los cursos', () => {
  assert.equal(nombreCurso('3'), '3.º');
  assert.equal(nombreCurso('3', true), '3.º de primaria');
  assert.equal(nombreCurso('2eso'), '2.º ESO');
  assert.equal(etapaDe('6'), 'primaria');
  assert.equal(etapaDe('4eso'), 'eso');
});

test('la configuración tiene los diez niveles, de 1.º de primaria a 4.º de ESO', () => {
  assert.deepEqual(Object.keys(leerConfig().cursos), ['1', '2', '3', '4', '5', '6', '1eso', '2eso', '3eso', '4eso']);
});

test('un dictado de ESO valida con los rangos de su curso', () => {
  const d = ditado('es', 1, '1eso');
  const errores = validar(d, leerConfig()).errores.join(' ');
  assert.match(errores, /para 1\.º ESO tiene que tener entre 80 y 110/);
  assert.doesNotMatch(errores, /El curso/);
});

test('la portada muestra el mapa de niveles y enlaza cada nivel con sus dictados', () => {
  const html = paginaIndice([entrada(ditado('es', 1, '1eso')), entrada(ditado('gl', 2, '3')), entrada(ditado('gl', 1, '3'))], {}, leerConfig());
  assert.ok(html.includes('href="?lang=gl&amp;curso=3#lista">2 dictados · 2 textos</a>'));
  assert.ok(html.includes('href="?lang=es&amp;curso=1eso#lista">1 dictado · 1 texto</a>'));
  assert.equal(html.split('class="vacia"').length - 1, 18);   // 10 niveles × 2 lenguas − 2 con dictados
  assert.ok(html.includes('<optgroup label="ESO">'));
  // Orden: gallego antes que castellano y, dentro, por número
  assert.ok(html.indexOf('href="gl-01/"') < html.indexOf('href="gl-02/"'));
  assert.ok(html.indexOf('href="gl-02/"') < html.indexOf('href="es-01/"'));
});

test('la portada deja ver cada texto, con las claves marcadas, sin abrir la presentación', () => {
  const html = paginaIndice([entrada(ditado('es', 1, '6'))], {}, leerConfig());
  assert.ok(html.includes('<details class="previa">'));
  assert.ok(html.includes('<span class="k">abuela</span>: hoy fui al mar.'));
});

test('la ficha del dictado trae el texto completo, la explicación de las claves y el audio', () => {
  const html = paginaDitado(ditado('es', 1, '6'), ficheros, null, null);
  assert.ok(html.includes('<span class="k">abuela</span>'));
  assert.ok(html.includes('<li><strong>abuela</strong> Con b.</li>'));
  assert.ok(html.includes('<audio controls preload="none" src="audio/es-01a-completo.mp3"'));
});

test('la ficha y la portada muestran el currículo: qué se evalúa, criterios, contenidos y bloque', () => {
  const config = leerConfig();
  const d = ditado('es', 1, '6');
  d.curriculo = { criterios: ['CE6.6'], contenidos: ['B6.10'], evaluar: ['Pone las tildes.', 'Escribe con b.'] };
  const ficha = paginaDitado(d, ficheros, null, null, config.curriculo);
  assert.ok(ficha.includes('Con este dictado se puede evaluar'));
  assert.ok(ficha.includes('<li>Pone las tildes.</li>'));
  assert.ok(ficha.includes('<dt>CE6.6</dt><dd>Aplicar los conocimientos sobre las categorías gramaticales'));
  assert.ok(ficha.includes('<dt>B6.10</dt>'));
  const portada = paginaIndice([entrada(d)], {}, config);
  assert.ok(portada.includes('data-bloque="Reflexión sobre la lengua"'));
  assert.ok(portada.includes('<option value="Reflexión sobre la lengua">'));
  assert.ok(portada.includes('>CE6.6</abbr>'));
});

test('con varias voces, la ficha deja elegir y la portada abre la presentación de la voz preferida', () => {
  const { paginaVoces } = require('../src/gen_catalogo');
  const config = leerConfig();
  const d = ditado('es', 1, '6');
  const f = { ...ficheros, voces: [{ voz: 'dora', presentacion: 'p.html', audio: 'audio' }, { voz: 'alex', presentacion: 'voz-alex/p.html', audio: 'audio/alex' }] };
  const ficha = paginaDitado(d, f, 'dora', null, config.curriculo);
  assert.ok(ficha.includes('<input type="radio" name="voz" value="dora" data-pres="p.html" data-audio="audio" checked>'));
  assert.ok(ficha.includes('value="alex" data-pres="voz-alex/p.html" data-audio="audio/alex"'));
  assert.ok(ficha.includes('data-fichero="es-01a-completo.mp3"'));
  assert.ok(ficha.includes('Voz sintética: Alex'));          // crédito de cada voz ofrecida
  const portada = paginaIndice([{ d, ficheros: f, voz: 'dora' }], {}, config, { voces: true });
  assert.ok(portada.includes('data-voces="{&quot;dora&quot;:&quot;es-01/p.html&quot;,&quot;alex&quot;:&quot;es-01/voz-alex/p.html&quot;}"'));
  assert.ok(portada.includes('href="voces/"'));
  // Con una sola voz no hay selector
  assert.ok(!paginaDitado(d, ficheros, null, null, config.curriculo).includes('name="voz"'));
  const voces = paginaVoces({ es: [{ voz: 'dora', clips: ['audio/es/dora-1.mp3'] }, { voz: 'alex', clips: ['audio/es/alex-1.mp3'] }] }, config);
  assert.ok(voces.includes('<article class="voz" data-voz="alex">'));
  assert.ok(voces.includes('src="audio/es/dora-1.mp3"'));
});

test('las voces publicadas existen, tienen crédito y cada una sabe su motor', () => {
  const { VOCES } = require('../src/textos');
  const { motorDe } = require('../src/audio');
  const v = leerConfig().voces;
  for (const lang of ['gl', 'es']) {
    assert.ok(v[lang].publicadas.includes(v[lang].defecto));
    for (const voz of v[lang].publicadas) {
      assert.ok(v[lang].disponibles.includes(voz), voz);
      assert.ok(VOCES[voz], `falta el crédito de ${voz}`);
    }
  }
  assert.equal(motorDe('dora'), 'kokoro');
  assert.equal(motorDe('sharvard'), 'piper');
  assert.equal(motorDe('iago'), 'ahotts');
});
