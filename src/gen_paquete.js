'use strict';
// Paquete sin conexión de un dictado: un ZIP con la presentación (audio dentro), los impresos,
// los documentos del docente y el kit de reglas de su lengua. Se puede servir desde el NAS del aula.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const LEEME = {
  gl: (nome) => `${nome}\n\nContido deste paquete:\n- A presentación proxectable (HTML): ábrea no navegador; funciona sen conexión, o audio vai dentro.\n- descargas/: ficha de dúas caras, ditado repetido, textos para o docente e MiClase.\n- kit/: tarxeta e caderno de regras.\n\nEDUmind® · Luis Vilela Acuña · Textos, fichas e audio: CC BY-SA 4.0.\n`,
  es: (nome) => `${nome}\n\nContenido de este paquete:\n- La presentación proyectable (HTML): ábrela en el navegador; funciona sin conexión, el audio va dentro.\n- descargas/: ficha de dos caras, dictado repetido, textos para el docente y MiClase.\n- kit/: tarjeta y cuaderno de reglas.\n\nEDUmind® · Luis Vilela Acuña · Textos, fichas y audio: CC BY-SA 4.0.\n`,
};

/**
 * @param {object} d  Dictado.
 * @param {string} carpeta  dist/<id>, ya generada.
 * @param {object} kit  {tarxeta, caderno} rutas relativas a dist (o undefined).
 * @param {string} dist
 * @returns {string} Nombre del ZIP dentro de la carpeta del dictado.
 */
function generarPaquete(d, carpeta, kit, dist) {
  const id = `${d.lang}-${String(d.num).padStart(2, '0')}`;
  const nombre = `${d.lang === 'gl' ? 'Ditado' : 'Dictado'}${String(d.num).padStart(2, '0')}_paquete_${d.lang}.zip`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ditados-zip-'));
  const raiz = path.join(tmp, id);
  fs.mkdirSync(raiz);
  for (const f of fs.readdirSync(carpeta)) {
    if (f.endsWith('.html') && f !== 'index.html') fs.copyFileSync(path.join(carpeta, f), path.join(raiz, f));
  }
  fs.cpSync(path.join(carpeta, 'descargas'), path.join(raiz, 'descargas'), { recursive: true });
  if (kit) {
    fs.mkdirSync(path.join(raiz, 'kit'));
    for (const k of Object.values(kit)) fs.copyFileSync(path.join(dist, k), path.join(raiz, 'kit', path.basename(k)));
  }
  fs.writeFileSync(path.join(raiz, 'LEEME.txt'), LEEME[d.lang](d.titulo));
  const destino = path.join(carpeta, nombre);
  fs.rmSync(destino, { force: true });
  execFileSync('zip', ['-q', '-r', '-X', destino, id], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  return nombre;
}

module.exports = { generarPaquete };
