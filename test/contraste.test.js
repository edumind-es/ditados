'use strict';
// Contraste WCAG 2.1 calculado, no a ojo: texto normal ≥ 4,5:1 en todos los pares de color usados.
const test = require('node:test');
const assert = require('node:assert/strict');

function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); }

// Pares (texto, fondo) de los tres sistemas visuales: Alumno (presentación), Lámina (catálogo) e impresos.
const PARES = [
  ['#0f172a', '#fafbfc', 'Alumno: tinta sobre papel'],
  ['#0f172a', '#ffffff', 'Alumno: tinta sobre tarjeta'],
  ['#334155', '#ffffff', 'Alumno: texto secundario sobre tarjeta'],
  ['#334155', '#f1f4f8', 'Alumno: texto secundario sobre papel-2'],
  ['#ffffff', '#0f172a', 'Alumno: botón principal'],
  ['#1a1a1a', '#ece9e1', 'Lámina: tinta sobre papel'],
  ['#5c5a55', '#ece9e1', 'Lámina: texto secundario sobre papel'],
  ['#5c5a55', '#fbfaf7', 'Lámina: texto secundario sobre blanco'],
  ['#ece9e1', '#1a1a1a', 'Lámina: botón'],
  ['#000000', '#ffffff', 'Impresos'],
];

for (const [fg, bg, nombre] of PARES) {
  test(`contraste ≥ 4,5:1 · ${nombre}`, () => {
    const c = contraste(fg, bg);
    assert.ok(c >= 4.5, `${nombre}: ${c.toFixed(2)}:1`);
  });
}

test('el gris #7c7a74 que prohíbe el brief no cumple (comprobación del comprobador)', () => {
  assert.ok(contraste('#7c7a74', '#ece9e1') < 4.5);
});

module.exports = { contraste };
