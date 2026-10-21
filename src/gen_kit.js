'use strict';
// Kit fijo por lengua: tarjeta de reglas (2 páginas) y cuaderno de reglas acumulativo (1 página).
// Contenido revisado del prototipo. Fuentes: RAG (Normas ortográficas e morfolóxicas, 2003) y RAE (Ortografía, 2010).
const { esc, rellenar, leerPlantilla, cssFuentes } = require('./html');
const { PE } = require('./textos');

const K = {
  gl: {
    area: 'LINGUA GALEGA E LITERATURA',
    titulo: 'Tarxeta de regras do ditado',
    sub: 'Gárdaa na carpeta. Consúltaa cando corrixas.',
    consellos: 'Seis consellos para un bo ditado',
    cons: [
      ['Antes', 'Escoito a primeira lectura enteira sen escribir: así sei de que vai.'],
      ['Antes', 'Se non entendo unha palabra, pregunto antes de empezar.'],
      ['Durante', 'Se non me dá tempo, deixo un oco e sigo. Despois complétoo.'],
      ['Durante', 'Penso por que escribo unha palabra así e non doutro xeito.'],
      ['Despois', 'Releo palabra a palabra, co dedo ou co lapis.'],
      ['Despois', 'Un erro é unha regra que aínda estou aprendendo.'],
    ],
    til: 'Onde vai o til',
    tilCab: ['Palabras', 'Regra', 'Exemplos'],
    tilRows: [
      ['Agudas', 'Tónica na última sílaba. Til se rematan en vogal, -n, -s ou -ns.', 'alí, tamén, compás, cancións'],
      ['Graves', 'Tónica na penúltima. Til se rematan en consoante que non sexa -n nin -s.', 'fácil, cráter, túnel'],
      ['Esdrúxulas', 'Tónica na antepenúltima. Til sempre.', 'música, árbore, mércores'],
      ['Hiato', 'A i ou a u tónicas xunto a outra vogal, sen formar ditongo, levan til.', 'súa, había, dúas, país'],
    ],
    sen: 'Non levan til',
    senL: [
      'Os monosílabos, agás os do til diacrítico: pan, sol, mar.',
      'As agudas rematadas en ditongo decrecente: papeis, ademais, bailei. (Só as agudas.)',
      'Os adverbios en -mente: rapidamente, docemente.',
      'Os interrogativos e exclamativos: Que queres? Como chove! Só o levan se hai dúbida.',
    ],
    diac: 'Til diacrítico (os máis usados)',
    diacCab: ['Con til', 'Sen til'],
    diacL: [
      ['é (verbo ser)', 'e (conxunción)'], ['dá (verbo dar)', 'da (de + a)'], ['máis (cantidade)', 'mais (pero)'],
      ['nós, vós (pronomes)', 'nos, vos'], ['só (soamente)', 'so (debaixo de)'], ['pé (do corpo)', 'pe (letra)'],
      ['té (infusión)', 'te (pronome)'], ['vén (verbo vir)', 'ven (verbo ver)'], ['fóra (adverbio)', 'fora (verbo ser, ir)'],
      ['cómpre (é preciso)', 'compre (verbo comprar)'], ['póla (da árbore)', 'pola (por + a)'], ['óso (do corpo)', 'oso (animal)'],
    ],
    diacNota: 'Lista completa: Normas ortográficas e morfolóxicas do idioma galego (Real Academia Galega, 2003).',
    cast: 'Ollo co castelán',
    castL: [
      'En galego abonda normalmente co signo final: Que fas? Que ben! O de apertura pódese poñer se axuda a entender a frase: non é un erro.',
      'Palabras que se colan: tamén (non también), despois (non después), irmá (non hermana), mércores (non miércoles).',
    ],
    cad: 'O meu caderno de regras',
    cadSub: 'Cada semana copio aquí as palabras que quero lembrar e a regra que as explica.',
    cadCols: ['Palabra', 'Escríbese con…', 'Porque…', 'Outra palabra coa mesma regra'],
    nome: 'Nome',
  },
  es: {
    area: 'LENGUA CASTELLANA Y LITERATURA',
    titulo: 'Tarjeta de reglas del dictado',
    sub: 'Guárdala en la carpeta. Consúltala cuando corrijas.',
    consellos: 'Seis consejos para un buen dictado',
    cons: [
      ['Antes', 'Escucho la primera lectura entera sin escribir: así sé de qué trata.'],
      ['Antes', 'Si no entiendo una palabra, pregunto antes de empezar.'],
      ['Durante', 'Si no me da tiempo, dejo un hueco y sigo. Después lo completo.'],
      ['Durante', 'Pienso por qué escribo una palabra así y no de otra manera.'],
      ['Después', 'Releo palabra a palabra, con el dedo o con el lápiz.'],
      ['Después', 'Un error es una regla que todavía estoy aprendiendo.'],
    ],
    til: 'Dónde va la tilde',
    tilCab: ['Palabras', 'Regla', 'Ejemplos'],
    tilRows: [
      ['Agudas', 'Tónica en la última sílaba. Tilde si terminan en vocal, -n o -s.', 'sofá, camión, compás'],
      ['Llanas', 'Tónica en la penúltima. Tilde si no terminan en vocal, -n ni -s.', 'lápiz, árbol, fácil'],
      ['Esdrújulas', 'Tónica en la antepenúltima. Tilde siempre.', 'música, contártelo'],
      ['Sobresdrújulas', 'Tónica antes de la antepenúltima. Tilde siempre.', 'cómetelo, devuélvemelo'],
      ['Hiato', 'La i o la u tónicas junto a otra vocal, sin formar diptongo, llevan tilde.', 'país, día, desearía'],
    ],
    sen: 'No llevan tilde',
    senL: [
      'Los monosílabos, salvo los de la tilde diacrítica: pan, sol, fue, dio.',
      'Los adverbios en -mente llevan tilde solo si la llevaba el adjetivo: fácilmente, lentamente.',
    ],
    diac: 'Tilde diacrítica (las más usadas)',
    diacCab: ['Con tilde', 'Sin tilde'],
    diacL: [
      ['él (pronombre)', 'el (artículo)'], ['tú (pronombre)', 'tu (tu casa)'], ['mí (pronombre)', 'mi (mi perro)'],
      ['sí (afirmación)', 'si (condición)'], ['sé (verbo saber)', 'se (pronombre)'], ['dé (verbo dar)', 'de (preposición)'],
      ['té (infusión)', 'te (pronombre)'], ['más (cantidad; siempre)', 'mas (pero)'], ['aún (todavía)', 'aun (incluso)'],
      ['qué, cuál, quién (preguntan o exclaman, también sin signos: no sé qué hacer)', 'que, cual, quien'],
      ['cómo, cuándo, dónde (preguntan o exclaman, también sin signos)', 'como, cuando, donde'], ['por qué (pregunta)', 'porque (causa)'],
    ],
    diacNota: 'Fuente: Ortografía de la lengua española (Real Academia Española, 2010).',
    cast: 'Signos que van por parejas',
    castL: [
      'En castellano las preguntas y las exclamaciones se abren y se cierran: ¿Qué haces? ¡Qué bien!',
      'Dos puntos: saludo de una carta y antes de una enumeración anunciada (necesitas estos materiales: …). Punto y coma: separa partes que ya llevan comas. Puntos suspensivos: siempre tres.',
    ],
    cad: 'Mi cuaderno de reglas',
    cadSub: 'Cada semana copio aquí las palabras que quiero recordar y la regla que las explica.',
    cadCols: ['Palabra', 'Se escribe con…', 'Porque…', 'Otra palabra con la misma regla'],
    nome: 'Nombre',
  },
};

const ANCHOS = { 2: [22, 78], 3: [18, 52, 30] };
const tabla = (cab, filas, clase = 'clasif') =>
  `<table class="${clase}"><colgroup>${(clase.includes('diac') ? [50, 50] : ANCHOS[cab.length]).map((w) => `<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${cab.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
  filas.map((f) => `<tr>${f.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('') +
  '</tbody></table>';

function cuerpoTarxeta(k) {
  return `
<section class="pagina kit">
  <p class="cab">${esc(k.area)}</p>
  <h1>${esc(k.titulo)}</h1>
  <p class="sub">${esc(k.sub)}</p>
  <h2>${esc(k.consellos)}</h2>
  ${tabla(['Cando', 'Consello'], k.cons)}
  <h2>${esc(k.til)}</h2>
  ${tabla(k.tilCab, k.tilRows)}
  <h2>${esc(k.sen)}</h2>
  <ul class="guion">${k.senL.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>
<section class="pagina kit">
  <p class="cab">${esc(k.area)}</p>
  <h2 class="primeiro">${esc(k.diac)}</h2>
  ${tabla(k.diacCab, k.diacL, 'clasif diac')}
  <p class="nota">${esc(k.diacNota)}</p>
  <h2>${esc(k.cast)}</h2>
  <ul class="guion">${k.castL.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>`;
}

function cuerpoCaderno(k) {
  const filas = Array.from({ length: 14 }, () => `<tr>${k.cadCols.map(() => '<td></td>').join('')}</tr>`).join('');
  return `
<section class="pagina kit">
  <p class="cab">${esc(k.area)}</p>
  <h1>${esc(k.cad)}</h1>
  <p class="nome">${esc(k.nome)}: <span class="liña longa" aria-hidden="true"></span></p>
  <p class="sub">${esc(k.cadSub)}</p>
  <table class="clasif caderno"><thead><tr>${k.cadCols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
</section>`;
}

const CSS_KIT = `
.kit table.clasif td,.kit table.clasif th{height:auto;font-size:12.5pt;padding:1.2mm 2mm}
.kit table.clasif.diac td,.kit table.clasif.diac th{font-size:12.5pt;padding:1.2mm 2mm}
.kit table.clasif.diac th[scope=row]{width:50%;font-weight:400}
.kit table.caderno td{height:15mm}
.kit table.caderno th{width:25%}
.kit ul.guion{margin:0;padding:0;list-style:none}
.kit ul.guion li{padding-left:7mm;text-indent:-7mm;margin:1mm 0}
.kit ul.guion li::before{content:'— '}
.kit .nota{font-size:11pt;font-style:italic;margin-top:2mm}
.kit h2.primeiro{margin-top:0}
`;

/** @returns {{tarxeta: string, caderno: string}} HTML de impresión del kit de una lengua. */
function generarKit(lang) {
  const k = K[lang];
  const envolver = (titulo, cuerpo) => rellenar(leerPlantilla('impreso.html'), {
    FONTS: cssFuentes({ inline: true }), EXTRA: CSS_KIT, LANG: lang, TITLE: esc(titulo), CUERPO: cuerpo, PE: esc(PE),
  });
  return { tarxeta: envolver(k.titulo, cuerpoTarxeta(k)), caderno: envolver(k.cad, cuerpoCaderno(k)) };
}

function nombresKit(lang) {
  return lang === 'gl'
    ? { tarxeta: 'Kit_tarxeta-regras_gl.pdf', caderno: 'Kit_caderno-regras_gl.pdf' }
    : { tarxeta: 'Kit_tarjeta-reglas_es.pdf', caderno: 'Kit_cuaderno-reglas_es.pdf' };
}

module.exports = { generarKit, nombresKit, K };
