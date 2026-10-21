'use strict';
// Migración única de los JSON del prototipo (octubre de 2026) al formato del apartado 4 del brief.
// Uso: node herramientas/migrar_prototipo.js
// Lee herramientas/prototipo/data/*.json y escribe contenido/<lang>-<num>.json.
const fs = require('node:fs');
const path = require('node:path');

const ORIGEN = path.join(__dirname, 'prototipo', 'data');
const DESTINO = path.join(__dirname, '..', 'contenido');

// Metadatos que el prototipo no tenía. Las etiquetas salen de la regla de cada dictado.
const EXTRA = {
  'gl-01': {
    etiquetas: ['acentuación', 'agudas', 'esdrúxulas', 'hiato', 'plural en -l', 'feminino en -án', 'exclamación'],
    tipo: 'Narración',
    datos: 'Ramón Cabanillas (1876-1959), poeta de Cambados. O texto é unha narración persoal sen datos que verificar.',
  },
  'gl-02': {
    etiquetas: ['substantivo', 'plural', 'plural en -l', 'acentuación', 'hiato', 'til diacrítico'],
    datos: {
      A: 'Polbo: tres corazóns, sangue azul (hemocianina), ventosas con quimiorreceptores e cambio de cor. Fonte pendente de completar polo autor.',
      B: 'Illas Cíes: Parque Nacional Marítimo-Terrestre das Illas Atlánticas de Galicia; acceso con autorización previa en tempada alta. Fonte pendente de completar polo autor.',
      C: 'Fonte pendente de completar polo autor.',
      D: 'Colmea: raíña, obreiras e abellóns. Fonte pendente de completar polo autor.',
    },
  },
  'es-01': {
    etiquetas: ['dos puntos', 'punto y coma', 'puntos suspensivos', 'signos de interrogación', 'signos de exclamación', 'tildes', 'carta'],
    tipo: 'Carta',
    datos: 'El español es lengua oficial en una veintena de países (cifra redonda defendible: 20 países más Puerto Rico y Guinea Ecuatorial según el Instituto Cervantes). Las cuatro lenguas citadas son las cooficiales del Estado.',
  },
  'es-02': {
    etiquetas: ['dos puntos', 'punto y coma', 'puntos suspensivos', 'signos de interrogación', 'signos de exclamación', 'esdrújulas', 'texto instructivo'],
    datos: {
      A: 'Texto instructivo: repaso de la UD1 (título, materiales, pasos con marcadores de orden e imperativos). Seguridad: la reacción de bicarbonato y vinagre es inocua, pero en clase se hace con el docente, en bandeja, con poco vinagre y lavándose las manos al terminar.',
      B: 'Ajolote: anfibio mexicano de los canales de Xochimilco (Ciudad de México); el texto no nombra Xochimilco para no dictar una palabra náhuatl. Regenera extremidades, cola y partes del corazón y del cerebro. En peligro crítico según la UICN. Aparece en el billete de 50 pesos emitido por el Banco de México en 2021.',
      C: '«Más de siete mil» lenguas y «más de ochocientas» en Papúa Nueva Guinea son cifras redondas de los catálogos de lenguas (Ethnologue). El orden por hablantes nativos (mandarín primero, español segundo) es el de esos catálogos; con hablantes totales, el inglés pasa delante.',
      D: 'Delfines: sueño unihemisférico (un hemisferio cerebral cada vez). El «silbido firma» está demostrado sobre todo en el delfín mular, por eso el texto dice «muchos delfines»; funciona como un nombre y sirve para mantener el contacto con el grupo.',
    },
  },
};

const FUENTES = {
  gl: ['https://academia.gal/dicionario', 'Normas ortográficas e morfolóxicas do idioma galego (RAG/ILG, 2003)'],
  es: ['https://dle.rae.es', 'https://www.rae.es/dpd', 'Ortografía de la lengua española (RAE, 2010)'],
};

for (const f of fs.readdirSync(ORIGEN).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(ORIGEN, f), 'utf8'));
  const id = `${d.lang}-${String(d.num).padStart(2, '0')}`;
  const extra = EXTRA[id] || {};
  // Formato antiguo: un solo texto en la raíz → una opción A.
  const opcions = d.opcions
    ? d.opcions.map((o) => ({ ...o, datos: (extra.datos && extra.datos[o.letra]) || '' }))
    : [{
      letra: 'A', tipo: extra.tipo || 'Texto', titulo: d.titulo.split('·').slice(1).join('·').trim(),
      texto: d.texto, segmentos: d.segmentos, foco: d.foco, datos: typeof extra.datos === 'string' ? extra.datos : '',
    }];
  const nuevo = {
    lang: d.lang, num: d.num, curso: '6', titulo: d.titulo, semana: d.semana || '', ud: d.ud, regra: d.regra,
    etiquetas: extra.etiquetas || [], fixome: d.fixome,
    estado: 'publicado',
    revision: {
      fecha: '2026-10-19', revisor: 'Luis Vilela Acuña', fuentes: FUENTES[d.lang],
      notas: 'Usado en un aula de 6.º en octubre de 2026 con el prototipo. Las fuentes de los datos de cada texto están en «datos» de cada opción; las marcadas como pendientes debe completarlas el autor.',
    },
    opcions,
  };
  fs.writeFileSync(path.join(DESTINO, `${id}.json`), JSON.stringify(nuevo, null, 2) + '\n');
  console.log('ok', id, opcions.length, 'opcións');
}
