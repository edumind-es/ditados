// Xera as fichas imprimibles A4 dun ditado (DOCX). Despois convértense a PDF con LibreOffice.
// Uso: node gen_fichas.js data/gl-01.json out/
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  BorderStyle, AlignmentType, PageBreak, Footer, HeightRule, TableLayoutType, VerticalAlign,
} = require('docx');

const FONT = 'Atkinson Hyperlegible';
const PT = (n) => n * 2;           // tamaño en medios puntos
const BODY = PT(14);
const PAGE_W = 11906, MARGIN = 794; // A4, marxes de 14 mm
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LINE = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const THIN = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

const L = {
  gl: {
    area: 'LINGUA GALEGA E LITERATURA · 6.º',
    tipo: 'DITADO',
    nome: 'Nome', data: 'Data',
    antes: 'Antes de comezar. Hoxe fíxome en:',
    criterios: 'Sei que o fixen ben se…',
    crit: [
      'Escoitei a primeira lectura sen escribir.',
      'Escribín todas as palabras. Se perdín unha, deixei un oco e seguín.',
      'Coidei os tiles e os signos de puntuación.',
      'Relin o ditado palabra a palabra antes de entregalo.',
      'Clasifiquei os meus erros e expliquei unha regra.',
    ],
    escribo: 'Escribo o ditado',
    reviso: 'Reviso o meu ditado',
    p1: '1. Como corrixín hoxe',
    p1a: 'Eu, co texto proxectado.',
    p1b: 'En parella. A parella só pon un punto (•) debaixo da palabra que lle fai dúbida. Quen escribiu o ditado decide e corrixe.',
    p2: '2. Clasifico os meus erros. Escribo cada palabra ben escrita na súa columna.',
    cols: ['Despisteime: xa o sabía', 'Aínda non o sei', 'Castelanismo: escribín en castelán'],
    p3: '3. Palabras conquistadas (só para min)',
    p3t: (n) => `Das ${n} palabras clave, escribín ben ______.`,
    p4: '4. Explico unha regra',
    p4t: ['A palabra ', ' escríbese con ', ' porque '],
    p5: '5. Para sempre. Escollo 4 palabras difíciles e cópioas no meu caderno de regras.',
    p6: '6. Como me sentín?',
    sent: ['Tranquilo ou tranquila', 'Con présa', 'Nervioso ou nerviosa', 'Concentrado ou concentrada'],
    p6t: 'A próxima vez vou fixarme en:',
    rep: 'Ditado repetido',
    repSub: 'Fago de novo o mesmo ditado. Compárome só comigo.',
    repT: ['Palabras clave ben escritas a 1.ª vez:', 'Palabras clave ben escritas agora:'],
    repQ: 'Que palabras conquistei esta vez?',
    pe: 'Luis Vilela Acuña · Ditados de Lingua Galega · 6.º',
  },
  es: {
    area: 'LENGUA CASTELLANA Y LITERATURA · 6.º',
    tipo: 'DICTADO',
    nome: 'Nombre', data: 'Fecha',
    antes: 'Antes de empezar. Hoy me fijo en:',
    criterios: 'Sé que lo he hecho bien si…',
    crit: [
      'Escuché la primera lectura sin escribir.',
      'Escribí todas las palabras. Si perdí una, dejé un hueco y seguí.',
      'Cuidé las tildes y los signos de puntuación.',
      'Releí el dictado palabra a palabra antes de entregarlo.',
      'Clasifiqué mis errores y expliqué una regla.',
    ],
    escribo: 'Escribo el dictado',
    reviso: 'Reviso mi dictado',
    p1: '1. Cómo he corregido hoy',
    p1a: 'Yo, con el texto proyectado.',
    p1b: 'En pareja. La pareja solo pone un punto (•) debajo de la palabra que le hace dudar. Quien escribió el dictado decide y corrige.',
    p2: '2. Clasifico mis errores. Escribo cada palabra bien escrita en su columna.',
    cols: ['Me despisté: ya lo sabía', 'Todavía no lo sé'],
    p3: '3. Palabras conquistadas (solo para mí)',
    p3t: (n) => `De las ${n} palabras clave, escribí bien ______.`,
    p4: '4. Explico una regla',
    p4t: ['La palabra ', ' se escribe con ', ' porque '],
    p5: '5. Para siempre. Elijo 4 palabras difíciles y las copio en mi cuaderno de reglas.',
    p6: '6. ¿Cómo me he sentido?',
    sent: ['Tranquilo o tranquila', 'Con prisa', 'Nervioso o nerviosa', 'Concentrado o concentrada'],
    p6t: 'La próxima vez me voy a fijar en:',
    rep: 'Dictado repetido',
    repSub: 'Hago otra vez el mismo dictado. Me comparo solo conmigo.',
    repT: ['Palabras clave bien escritas la 1.ª vez:', 'Palabras clave bien escritas ahora:'],
    repQ: '¿Qué palabras he conquistado esta vez?',
    pe: 'Luis Vilela Acuña · Dictados de Lengua Castellana · 6.º',
  },
};

const r = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || BODY, bold: o.bold, italics: o.italics });
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [r(runs, o)],
  spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line ?? 300 },
  alignment: o.align, keepNext: o.keepNext, indent: o.indent,
  border: o.border,
});
const h = (text, o = {}) => p([r(text, { bold: true, size: o.size || PT(16) })], { before: o.before ?? 160, after: 80, keepNext: true, border: o.rule ? { bottom: { ...LINE, space: 2 } } : undefined });
const box = '☐ '; // ☐ casilla baleira

function cell(children, w, o = {}) {
  return new TableCell({
    children, width: { size: w, type: WidthType.DXA },
    borders: o.borders || { top: THIN, bottom: THIN, left: THIN, right: THIN },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: o.v || VerticalAlign.TOP,
  });
}
function frame(children) { // recadro dunha soa cela
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [cell(children, CONTENT_W, { borders: { top: LINE, bottom: LINE, left: LINE, right: LINE } })] })],
  });
}
function lines(n, h = 640) { // liñas de escritura de 11 mm
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], layout: TableLayoutType.FIXED,
    rows: Array.from({ length: n }, () => new TableRow({
      height: { value: h, rule: HeightRule.EXACT },
      children: [cell([p('')], CONTENT_W, { borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } } })],
    })),
  });
}
function header(t, d, sub) {
  return [
    p([r(`${t.area} · ${t.tipo} ${d.num}`, { bold: true, size: PT(12) }), r(`   ${d.ud}`, { size: PT(12) })], { after: 140 }),
    p([r(sub, { bold: true, size: PT(22) })], { after: 60, border: { bottom: { ...LINE, size: 12, space: 4 } } }),
    p([r(`${t.nome}: ______________________________   ${t.data}: ____________`)], { before: 120, after: 120 }),
  ];
}
function footer(t) {
  return { default: new Footer({ children: [p([r(t.pe, { size: PT(10) })], { align: AlignmentType.RIGHT, after: 0 })] }) };
}
const section = (t, children) => ({
  properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 400 } } },
  footers: footer(t), children,
});

function ficha(d, t) {
  const caraA = [
    ...header(t, d, d.titulo.split('·')[1].trim()),
    frame([
      p([r(t.antes, { bold: true })], { after: 60 }),
      ...d.fixome.map((x) => p([r('— ' + x)], { after: 40, indent: { left: 280, hanging: 280 } })),
    ]),
    p('', { after: 60 }),
    frame([
      p([r(t.criterios, { bold: true })], { after: 60 }),
      ...t.crit.map((x) => p([r(box + x)], { after: 30, indent: { left: 360, hanging: 360 } })),
    ]),
    h(t.escribo, { before: 160 }),
    ...(d.opcions ? [p([r((d.lang === 'gl' ? 'Texto do ditado: ' : 'Texto del dictado: ') + d.opcions.map((o) => box + o.letra).join('    '))], { after: 40 })] : []),
    lines(d.opcions ? 10 : 12),
  ];
  const n = d.foco ? d.foco.length : '____';
  const cw = Math.floor(CONTENT_W / t.cols.length);
  const colW = t.cols.map((_, i) => (i === t.cols.length - 1 ? CONTENT_W - cw * (t.cols.length - 1) : cw));
  const clasif = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colW, layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: t.cols.map((c, i) => cell([p([r(c, { bold: true })], { after: 0 })], colW[i])) }),
      ...Array.from({ length: 5 }, () => new TableRow({ height: { value: 600, rule: HeightRule.EXACT }, children: colW.map((w) => cell([p('')], w)) })),
    ],
  });
  const caraB = [
    new Paragraph({ children: [new PageBreak()] }),
    p([r(`${t.area} · ${t.tipo} ${d.num}`, { bold: true, size: PT(12) })], { after: 140 }),
    p([r(t.reviso, { bold: true, size: PT(22) })], { after: 60, border: { bottom: { ...LINE, size: 12, space: 4 } } }),
    h(t.p1, { before: 120 }),
    p([r(box + t.p1a)], { after: 30, indent: { left: 360, hanging: 360 } }),
    p([r(box + t.p1b)], { after: 40, indent: { left: 360, hanging: 360 } }),
    h(t.p2),
    clasif,
    h(t.p3),
    p(t.p3t(n)),
    h(t.p4),
    p([r(t.p4t[0]), r('__________________'), r(t.p4t[1]), r('______________')], { after: 40 }),
    p([r(t.p4t[2].trim() + ' ')], { after: 0 }),
    lines(2, 560),
    h(t.p5),
    p([r('1 _________________     2 _________________')], { after: 120 }),
    p([r('3 _________________     4 _________________')]),
    h(t.p6),
    p([r(box + t.sent[0] + '        ' + box + t.sent[1])], { after: 30 }),
    p([r(box + t.sent[2] + '        ' + box + t.sent[3])], { after: 80 }),
    p([r(t.p6t + ' ')], { after: 0 }),
    lines(1, 560),
  ];
  return [section(t, [...caraA, ...caraB])];
}

function repetido(d, t) {
  return [section(t, [
    ...header(t, d, t.rep),
    p([r(t.repSub, { italics: true })], { after: 120 }),
    lines(14),
    h(t.p3.replace(/^\d+\. /, ''), { before: 200 }),
    p([r(t.repT[0] + ` ______ de ${d.foco ? d.foco.length : "____"}`)], { after: 40 }),
    p([r(t.repT[1] + ` ______ de ${d.foco ? d.foco.length : "____"}`)], { after: 80 }),
    p([r(t.repQ)], { after: 0 }),
    lines(2, 560),
  ])];
}

// ---------- KIT FIXO: tarxeta de regras + caderno de regras ----------
const K = {
  gl: {
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
    tilRows: [
      ['Agudas', 'Tónica na última sílaba. Til se rematan en vogal, -n, -s ou -ns.', 'alí, tamén, compás, cancións'],
      ['Graves', 'Tónica na penúltima. Til se rematan en consoante que non sexa -n nin -s.', 'fácil, cráter, túnel'],
      ['Esdrúxulas', 'Tónica na antepenúltima. Til sempre.', 'música, árbore, mércores'],
      ['Hiato', 'A i ou a u tónicas xunto a outra vogal, sen formar ditongo, levan til.', 'súa, había, dúas, país'],
    ],
    sen: 'Non levan til',
    senL: [
      'Os monosílabos, agás os do til diacrítico: pan, sol, mar.',
      'As agudas rematadas en ditongo decrecente: papeis, ademais, bailei.',
      'Os adverbios en -mente: rapidamente, docemente.',
      'Os interrogativos e exclamativos: Que queres? Como chove! Só o levan se hai dúbida.',
    ],
    diac: 'Til diacrítico (os máis usados)',
    diacL: [
      ['é (verbo ser)', 'e (conxunción)'], ['dá (verbo dar)', 'da (de + a)'], ['máis (cantidade)', 'mais (pero)'],
      ['nós, vós (pronomes)', 'nos, vos'], ['só (soamente)', 'so (debaixo de)'], ['pé (do corpo)', 'pe (letra)'],
      ['té (infusión)', 'te (pronome)'], ['vén (verbo vir)', 'ven (verbo ver)'], ['fóra (adverbio)', 'fora (verbo ser, ir)'],
      ['cómpre (é preciso)', 'compre (verbo comprar)'], ['póla (da árbore)', 'pola (por + a)'], ['óso (do corpo)', 'oso (animal)'],
    ],
    diacNota: 'Lista completa: Normas ortográficas e morfolóxicas do idioma galego (Real Academia Galega).',
    cast: 'Ollo co castelán',
    castL: [
      'En galego abonda normalmente co signo final: Que fas? Que ben! O de apertura pódese poñer se axuda a entender a frase.',
      'Palabras que se colan: tamén (non también), despois (non después), irmá (non hermana), mércores (non miércoles).',
    ],
    cad: 'O meu caderno de regras',
    cadSub: 'Cada semana copio aquí as palabras que quero lembrar para sempre e a regra que as explica.',
    cadCols: ['Palabra', 'Escríbese con…', 'Porque…', 'Outra palabra coa mesma regra'],
    area: 'LINGUA GALEGA E LITERATURA · 6.º', pe: 'Luis Vilela Acuña · Ditados de Lingua Galega · 6.º',
  },
  es: {
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
    tilRows: [
      ['Agudas', 'Tónica en la última sílaba. Tilde si terminan en vocal, -n o -s.', 'sofá, camión, compás'],
      ['Llanas', 'Tónica en la penúltima. Tilde si no terminan en vocal, -n ni -s.', 'lápiz, árbol, fácil'],
      ['Esdrújulas y sobresdrújulas', 'Tónica en la antepenúltima o antes. Tilde siempre.', 'música, contártelo, cómetelo'],
      ['Hiato', 'La i o la u tónicas junto a otra vocal, sin formar diptongo, llevan tilde.', 'país, día, desearía'],
    ],
    sen: 'No llevan tilde',
    senL: [
      'Los monosílabos, salvo los de la tilde diacrítica: pan, sol, fue, dio.',
      'Los adverbios en -mente llevan tilde solo si la llevaba el adjetivo: fácilmente, lentamente.',
    ],
    diac: 'Tilde diacrítica (las más usadas)',
    diacL: [
      ['él (pronombre)', 'el (artículo)'], ['tú (pronombre)', 'tu (tu casa)'], ['mí (pronombre)', 'mi (mi perro)'],
      ['sí (afirmación)', 'si (condición)'], ['sé (verbo saber)', 'se (pronombre)'], ['dé (verbo dar)', 'de (preposición)'],
      ['té (infusión)', 'te (pronombre)'], ['más (cantidad)', 'mas (pero)'], ['aún (todavía)', 'aun (incluso)'],
      ['qué, cuál, quién (preguntan o exclaman)', 'que, cual, quien'], ['cómo, cuándo, dónde (preguntan o exclaman)', 'como, cuando, donde'], ['por qué (pregunta)', 'porque (causa)'],
    ],
    diacNota: 'Fuente: Ortografía de la lengua española (Real Academia Española, 2010).',
    cast: 'Signos que van por parejas',
    castL: [
      'En castellano las preguntas y las exclamaciones se abren y se cierran: ¿Qué haces? ¡Qué bien!',
      'Dos puntos: saludo de una carta y antes de una enumeración. Punto y coma: separa partes que ya llevan comas. Puntos suspensivos: siempre tres.',
    ],
    cad: 'Mi cuaderno de reglas',
    cadSub: 'Cada semana copio aquí las palabras que quiero recordar para siempre y la regla que las explica.',
    cadCols: ['Palabra', 'Se escribe con…', 'Porque…', 'Otra palabra con la misma regla'],
    area: 'LENGUA CASTELLANA Y LITERATURA · 6.º', pe: 'Luis Vilela Acuña · Dictados de Lengua Castellana · 6.º',
  },
};

function grid(colW, rows, o = {}) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colW, layout: TableLayoutType.FIXED,
    rows: rows.map((row, i) => new TableRow({
      tableHeader: o.head && i === 0,
      height: o.h ? { value: o.h, rule: HeightRule.ATLEAST } : undefined,
      children: row.map((c, j) => cell([p([r(c, { bold: (o.head && i === 0) || (o.boldFirst && j === 0), size: o.size })], { after: 0, line: 276 })], colW[j])),
    })),
  });
}

function kit(lang) {
  const k = K[lang];
  const t = { pe: k.pe };
  const top = (title, sub) => [
    p([r(k.area, { bold: true, size: PT(12) })], { after: 140 }),
    p([r(title, { bold: true, size: PT(22) })], { after: 60, border: { bottom: { ...LINE, size: 12, space: 4 } } }),
    p([r(sub, { italics: true })], { before: 80, after: 80 }),
  ];
  const w3 = [2700, 4900, CONTENT_W - 7600];
  const w2 = [Math.floor(CONTENT_W / 2), CONTENT_W - Math.floor(CONTENT_W / 2)];
  const diacRows = k.diacL.map(([a, b]) => [a, b]);
  const tarxeta = [
    ...top(k.titulo, k.sub),
    h(k.consellos, { before: 60 }),
    grid([1700, CONTENT_W - 1700], k.cons, { boldFirst: true }),
    h(k.til),
    grid(w3, k.tilRows, { boldFirst: true }),
    h(k.sen),
    ...k.senL.map((x) => p([r('— ' + x)], { after: 40, indent: { left: 280, hanging: 280 } })),
    new Paragraph({ children: [new PageBreak()] }),
    p([r(k.area, { bold: true, size: PT(12) })], { after: 140 }),
    h(k.diac, { before: 0 }),
    grid(w2, diacRows),
    p([r(k.diacNota, { size: PT(12), italics: true })], { before: 60 }),
    h(k.cast),
    ...k.castL.map((x) => p([r('— ' + x)], { after: 60, indent: { left: 280, hanging: 280 } })),
  ];
  const cw = [2300, 2300, 3200, CONTENT_W - 7800];
  const caderno = [
    ...top(k.cad, k.cadSub),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: cw, layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ tableHeader: true, children: k.cadCols.map((c, i) => cell([p([r(c, { bold: true })], { after: 0, line: 276 })], cw[i])) }),
        ...Array.from({ length: 13 }, () => new TableRow({ height: { value: 860, rule: HeightRule.EXACT }, children: cw.map((w) => cell([p('')], w)) })),
      ],
    }),
  ];
  return { tarxeta: [section(t, tarxeta)], caderno: [section(t, caderno)] };
}

async function main() {
  if (process.argv[2] === '--kit') {
    const [, , , lang, out] = process.argv;
    fs.mkdirSync(out, { recursive: true });
    const kk = kit(lang);
    const names = lang === 'gl'
      ? { tarxeta: 'Kit_tarxeta-regras_gl', caderno: 'Kit_caderno-regras_gl' }
      : { tarxeta: 'Kit_tarjeta-reglas_es', caderno: 'Kit_cuaderno-reglas_es' };
    for (const key of ['tarxeta', 'caderno']) {
      const doc = new Document({ creator: 'Luis Vilela Acuña', title: names[key], styles: { default: { document: { run: { font: FONT, size: BODY } } } }, sections: kk[key] });
      fs.writeFileSync(path.join(out, names[key] + '.docx'), await Packer.toBuffer(doc));
      console.log('ok', names[key]);
    }
    return;
  }
  const [src, out] = process.argv.slice(2);
  const d = JSON.parse(fs.readFileSync(src, 'utf8'));
  const t = L[d.lang];
  fs.mkdirSync(out, { recursive: true });
  const pre = d.lang === 'gl' ? 'Ditado' : 'Dictado';
  const nn = String(d.num).padStart(2, '0');
  const docs = {
    [`${pre}${nn}_ficha_${d.lang}`]: ficha(d, t),
    [`${pre}${nn}_repetido_${d.lang}`]: repetido(d, t),
  };
  for (const [name, sections] of Object.entries(docs)) {
    const doc = new Document({ creator: 'Luis Vilela Acuña', title: name, styles: { default: { document: { run: { font: FONT, size: BODY } } } }, sections });
    fs.writeFileSync(path.join(out, name + '.docx'), await Packer.toBuffer(doc));
    console.log('ok', name);
  }
}
main();
