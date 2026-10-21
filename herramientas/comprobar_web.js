'use strict';
// Comprobaciones de la web compilada (dist/) con un navegador real:
//  1. ninguna página lanza errores de JavaScript;
//  2. ninguna página pide recursos a otro dominio (fuentes, scripts, analítica);
//  3. ninguna página desborda horizontalmente a 390 px;
//  4. la presentación se navega con teclado (flechas, RePág/AvPág) y marca el paso con «Agora/Ahora»;
//  5. los objetivos táctiles de la presentación miden al menos 64 px (sobre la pizarra, a 1280 px).
// Usa el Playwright de otro proyecto del servidor (no es dependencia de este): se indica con NODE_PATH.
//   NODE_PATH=/var/www/edumind_miclase/node_modules node herramientas/comprobar_web.js
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const DIST = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const paginas = [];
(function andar(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else if (p.endsWith('.html')) paginas.push(p); } })(DIST);

(async () => {
  const browser = await chromium.launch();
  let fallos = 0;
  const fallo = (m) => { console.log('✗ ' + m); fallos++; };
  for (const p of paginas.sort()) {
    const rel = path.relative(DIST, p);
    for (const ancho of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width: ancho, height: 900 } });
      const errores = []; const externos = [];
      page.on('pageerror', (e) => errores.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
      page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) externos.push(r.url()); });
      await page.goto('file://' + p);
      await page.waitForTimeout(300);
      if (errores.length) fallo(`${rel} @${ancho}: errores JS: ${errores.join(' | ')}`);
      if (externos.length) fallo(`${rel} @${ancho}: recursos externos: ${externos.join(', ')}`);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > ancho) fallo(`${rel} @${ancho}: desbordamiento horizontal (${sw} px)`);

      if (rel.includes('_presentacion_') && ancho === 1280) {
        // Teclado
        await page.keyboard.press('ArrowRight');
        let paso = await page.evaluate(() => document.querySelector('#pasos li[aria-current="step"]').dataset.step);
        if (paso !== '1') fallo(`${rel}: la flecha derecha no cambia de paso`);
        const agora = await page.evaluate(() => getComputedStyle(document.querySelector('#pasos li[aria-current="step"] .now')).display);
        if (agora === 'none') fallo(`${rel}: el paso actual no muestra el texto «Agora/Ahora»`);
        await page.keyboard.press('PageUp');
        paso = await page.evaluate(() => document.querySelector('#pasos li[aria-current="step"]').dataset.step);
        if (paso !== '0') fallo(`${rel}: RePág no vuelve al paso anterior`);
        // Objetivos táctiles ≥ 64 px en los controles principales
        const pequenos = await page.evaluate(() => [...document.querySelectorAll('.btn,.a11y-btn,[role=tab],.opt,#pasos li')]
          .filter((b) => b.offsetParent !== null).map((b) => b.getBoundingClientRect()).filter((r) => r.height < 64 || r.width < 64).length);
        if (pequenos) fallo(`${rel}: ${pequenos} controles por debajo de 64×64 px`);
        // Botón de accesibilidad
        await page.click('#a11y');
        const a11y = await page.evaluate(() => document.body.classList.contains('a11y') && document.querySelector('#a11y').getAttribute('aria-pressed') === 'true');
        if (!a11y) fallo(`${rel}: el botón de accesibilidad no activa el modo`);
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(`páginas: ${paginas.length} · fallos: ${fallos}`);
  process.exit(fallos ? 1 : 0);
})();
