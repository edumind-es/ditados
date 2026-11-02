'use strict';
// Página «Dictado rápido» del catálogo: el docente pega un texto, marca las palabras clave y la presentación
// se genera en su navegador con el mismo código que la compilación. No se guarda nada en el servidor.
const { esc, rellenar, leerPlantilla, cssFuentes } = require('./html');
const { pagina } = require('./gen_catalogo');
const { empaquetar } = require('./navegador');
const { CATALOGO: C } = require('./textos');

/**
 * @param {object} config  Contenido de contenido/config.json.
 * @returns {string} HTML completo de la página.
 */
function generarRapido(config) {
  const datos = {
    cursos: config.cursos, claves: config.claves, segmento_palabras: config.segmento_palabras, tipos: config.tipos,
    plantilla: leerPlantilla('presentacion.html'),
    fuentes: cssFuentes({ inline: true }),
    licencia: C.licenciaRapido,
  };
  // Primero los textos (rellenar comprueba que no queda ningún marcador); el paquete JS y los datos van después,
  // porque contienen los marcadores {{…}} de la plantilla de la presentación.
  const cuerpo = rellenar(leerPlantilla('rapido.html'), {
    CATALOGO: esc(C.titulo), RAPIDO: esc(C.rapido), SUB: esc(C.rapidoSub),
  }).split('/*BUNDLE*/').join(empaquetar())
    .split('/*DATOS*/null').join(JSON.stringify(datos).replace(/<\//g, '<\\/'));
  return pagina({ lang: 'es', titulo: `${C.rapido} · ${C.titulo}`, descripcion: C.rapidoSub, cuerpo, prefijo: '../', vocesUsadas: [] });
}

module.exports = { generarRapido };
