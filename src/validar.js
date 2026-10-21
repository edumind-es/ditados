'use strict';
// Validación de un dictado. Es el único sitio donde viven las reglas del apartado 4 del brief:
// la usan la línea de comandos, el generador, las pruebas y (en la fase 2) el editor.
// Devuelve mensajes en lenguaje llano, pensados para que los lea el autor, no un programador.

const LANGS = ['gl', 'es'];
const ESTADOS = ['borrador', 'revisado', 'publicado'];

/** Cuenta palabras como lo hace el prototipo: trozos separados por espacios. */
function contarPalabras(texto) {
  return String(texto || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Texto plano del dictado: los saltos de línea se convierten en espacios. */
function textoPlano(texto) {
  return String(texto || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function esCadena(v) { return typeof v === 'string' && v.trim().length > 0; }

/**
 * Valida un dictado completo.
 * @param {object} d  El dictado (objeto JSON).
 * @param {object} config  Contenido de contenido/config.json.
 * @returns {{errores: string[], avisos: string[]}}  Errores impiden guardar; avisos solo informan.
 */
function validar(d, config) {
  const errores = [];
  const avisos = [];
  const err = (m) => errores.push(m);
  const aviso = (m) => avisos.push(m);

  if (!d || typeof d !== 'object') return { errores: ['El dictado no es un objeto JSON.'], avisos };

  // --- Cabecera ---
  if (!LANGS.includes(d.lang)) err(`La lengua («lang») tiene que ser «gl» o «es», no «${d.lang}».`);
  if (!Number.isInteger(d.num) || d.num < 1) err('El número del dictado («num») tiene que ser un entero mayor que 0.');
  if (!esCadena(d.curso) || !config.cursos[d.curso]) {
    err(`El curso («curso») tiene que ser uno de: ${Object.keys(config.cursos).join(', ')}.`);
  }
  if (!esCadena(d.titulo)) err('Falta el título del dictado («titulo»).');
  if (!esCadena(d.ud)) err('Falta la unidad didáctica («ud»): cada dictado va anclado a una unidad.');
  if (!esCadena(d.regra)) err('Falta el resumen de la regla trabajada («regra»).');
  if (!Array.isArray(d.etiquetas) || d.etiquetas.length === 0) {
    err('Hacen falta etiquetas («etiquetas»): al menos una, para que el catálogo pueda filtrar por regla.');
  }
  if (!Array.isArray(d.fixome) || d.fixome.length < 3 || d.fixome.length > 4) {
    err('«Hoy me fijo en» («fixome») tiene que tener 3 o 4 frases breves.');
  }
  if (!ESTADOS.includes(d.estado)) err(`El estado tiene que ser uno de: ${ESTADOS.join(', ')}.`);

  // --- Opciones ---
  const rango = config.cursos[d.curso] ? config.cursos[d.curso].palabras : null;
  const [minClaves, maxClaves] = config.claves;
  const [minSeg, maxSeg] = config.segmento_palabras;

  if (!Array.isArray(d.opcions) || d.opcions.length === 0) {
    err('El dictado necesita al menos una opción de texto («opcions»).');
  } else {
    const letras = new Set();
    d.opcions.forEach((o, idx) => {
      const nombre = `Opción ${o && o.letra ? o.letra : idx + 1}`;
      if (!o || typeof o !== 'object') { err(`${nombre}: no es un objeto.`); return; }
      if (!esCadena(o.letra)) err(`${nombre}: falta la letra (A, B, C…).`);
      else if (letras.has(o.letra)) err(`${nombre}: la letra «${o.letra}» está repetida.`);
      letras.add(o.letra);
      if (!esCadena(o.tipo)) err(`${nombre}: falta el tipo de texto (curiosidad, noticia, carta…).`);
      if (!esCadena(o.titulo)) err(`${nombre}: falta el título del texto.`);
      if (!esCadena(o.texto)) { err(`${nombre}: falta el texto.`); return; }

      // 1. Los segmentos reproducen exactamente el texto.
      if (!Array.isArray(o.segmentos) || o.segmentos.length === 0) {
        err(`${nombre}: falta la segmentación («segmentos»).`);
      } else {
        const unidos = o.segmentos.map((s) => String(s).trim()).join(' ');
        const plano = textoPlano(o.texto);
        if (unidos !== plano) {
          const pos = primeraDiferencia(unidos, plano);
          err(`${nombre}: los trozos, unidos con un espacio, no reproducen el texto. ` +
              `La diferencia empieza en «…${plano.slice(Math.max(0, pos - 15), pos + 20)}…».`);
        }
        o.segmentos.forEach((s, i) => {
          const n = contarPalabras(s);
          if (n < minSeg || n > maxSeg) aviso(`${nombre}, trozo ${i + 1}: tiene ${n} palabras; lo recomendable son de ${minSeg} a ${maxSeg}.`);
        });
      }

      // 2. Cada palabra clave aparece literalmente en el texto.
      if (!Array.isArray(o.foco)) {
        err(`${nombre}: faltan las palabras clave («foco»).`);
      } else {
        o.foco.forEach((f, i) => {
          if (!f || !esCadena(f.p)) { err(`${nombre}, clave ${i + 1}: falta la palabra («p»).`); return; }
          if (!o.texto.includes(f.p)) err(`${nombre}, clave ${i + 1}: «${f.p}» no aparece tal cual en el texto.`);
          if (!esCadena(f.por)) err(`${nombre}, clave ${i + 1} («${f.p}»): falta la explicación («por»).`);
          if (f.p.includes(' ') && !esCadena(f.e)) {
            aviso(`${nombre}, clave ${i + 1}: «${f.p}» es una frase; conviene darle una etiqueta corta («e») para la lista y para MiClase.`);
          }
        });
        // 4. Entre 10 y 18 palabras clave.
        if (o.foco.length < minClaves || o.foco.length > maxClaves) {
          err(`${nombre}: tiene ${o.foco.length} palabras clave; tienen que ser entre ${minClaves} y ${maxClaves}.`);
        }
      }

      // 3. Palabras del texto dentro del rango del curso.
      const n = contarPalabras(textoPlano(o.texto));
      if (rango && (n < rango[0] || n > rango[1])) {
        err(`${nombre}: el texto tiene ${n} palabras; para ${d.curso}.º tiene que tener entre ${rango[0]} y ${rango[1]}.`);
      }

      // Datos verificables: solo aviso, porque no todos los textos llevan datos.
      if (!esCadena(o.datos)) aviso(`${nombre}: no tiene notas de datos y fuentes («datos») para el docente.`);
    });
  }

  // --- Publicación ---
  if (d.estado === 'publicado' || d.estado === 'revisado') {
    const r = d.revision;
    if (!r || typeof r !== 'object') {
      err('Para pasar a «revisado» o «publicado» hace falta el bloque «revision» con fecha, revisor y fuentes.');
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha || ''))) err('La fecha de revisión tiene que tener el formato AAAA-MM-DD.');
      if (!esCadena(r.revisor)) err('Falta el nombre de quien revisó («revision.revisor»).');
      if (!Array.isArray(r.fuentes) || r.fuentes.length === 0 || !r.fuentes.every(esCadena)) {
        err('La revisión necesita al menos una fuente (URL de la RAG o de la RAE) en «revision.fuentes».');
      }
    }
  }

  return { errores, avisos };
}

function primeraDiferencia(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

/** Identificador corto del dictado: gl-02. */
function idDitado(d) { return `${d.lang}-${String(d.num).padStart(2, '0')}`; }

/** Identificador de una opción: gl-02a. */
function idOpcion(d, o) { return idDitado(d) + String(o.letra).toLowerCase(); }

/** Título corto sin el prefijo «Ditado 2 ·». */
function tituloCorto(d) {
  const partes = String(d.titulo).split('·');
  return (partes.length > 1 ? partes.slice(1).join('·') : partes[0]).trim();
}

module.exports = { validar, contarPalabras, textoPlano, idDitado, idOpcion, tituloCorto, LANGS, ESTADOS };
