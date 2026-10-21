'use strict';
// Catálogo público (índice con filtros) y ficha de cada dictado, en estilo EDUmind-Lámina.
// El filtrado se hace en el navegador sobre atributos data-*, sin ninguna dependencia.
const fs = require('node:fs');
const path = require('node:path');
const { esc, cssFuentes, RAIZ } = require('./html');
const { CATALOGO: C, PRESENTACION, VOCES } = require('./textos');
const { idDitado, tituloCorto, contarPalabras, textoPlano } = require('./validar');

const CSS = fs.readFileSync(path.join(RAIZ, 'plantillas', 'lamina.css'), 'utf8');

function fuentesLamina(prefijo) {
  return [
    `@font-face{font-family:'Archivo';font-style:normal;font-weight:400 800;font-display:swap;src:url('${prefijo}Archivo.woff2') format('woff2')}`,
    `@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:400 500;font-display:swap;src:url('${prefijo}JetBrainsMono.woff2') format('woff2')}`,
  ].join('\n');
}

const franja = '<div class="franja" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>';

function pagina({ lang, titulo, descripcion, cuerpo, prefijo, vocesUsadas }) {
  const voces = vocesUsadas.map((v) => VOCES[v]).filter(Boolean).map((v) => `<p>${esc(v)}</p>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(descripcion)}">
<title>${esc(titulo)}</title>
<style>
${fuentesLamina(prefijo + 'fonts/')}
${CSS}
</style>
</head>
<body>
${franja}
${cuerpo}
<footer class="pe"><div class="wrap">
<p>${esc(C.pe)}</p>
<p>${esc(C.licencia)}</p>
${voces}
</div></footer>
</body>
</html>`;
}

/** Ficha de un dictado dentro del catálogo. */
function paginaDitado(d, ficheros, voz) {
  const t = PRESENTACION[d.lang];
  const id = idDitado(d);
  const opciones = d.opcions.map((o) => `
<tr><th scope="row">${esc(o.letra)}</th><td>${esc(o.titulo)}</td><td>${esc(o.tipo)}</td><td>${contarPalabras(textoPlano(o.texto))}</td><td>${o.foco.length}</td></tr>`).join('');
  const datos = d.opcions.filter((o) => o.datos).map((o) => `<dt>${esc(o.letra)} · ${esc(o.titulo)}</dt><dd>${esc(o.datos)}</dd>`).join('');
  const descargas = [
    [ficheros.presentacion, C.presDescarga],
    [ficheros.ficha, C.ficha], [ficheros.repetido, C.repetido],
    [ficheros.textos, C.textosDocente],
    ...ficheros.miclase.map((m, i) => [m, `${C.miclase} · ${d.opcions[i].letra}`]),
  ].filter(([f]) => f).map(([f, l]) => `<li><a href="${esc(f)}" download>${esc(l)}</a></li>`).join('');
  const audio = ficheros.audio.length
    ? `<li>${esc(C.audio)}: ${ficheros.audio.map((a) => `<a href="${esc(a)}" download>${esc(path.basename(a, '.mp3'))}</a>`).join(' · ')}</li>` : '';
  const cuerpo = `
<header class="cab"><div class="wrap">
  <p class="kicker"><a href="../">${esc(C.titulo)}</a> · ${esc(C.langs[d.lang])} · ${esc(d.curso)}.º · ${esc(d.ud)}</p>
  <h1>${esc(t.tipo)} ${d.num} · ${esc(tituloCorto(d))}</h1>
  <p class="sub">${esc(d.regra)}</p>
</div></header>
<main class="wrap">
<section>
  <p><a class="boton" href="${esc(ficheros.presentacion)}">${esc(C.presentacion)}</a></p>
</section>
<section>
  <h2><span class="n">01</span>${esc(C.fixome)}</h2>
  <ul>${d.fixome.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>
<section>
  <h2><span class="n">02</span>${esc(C.opcionesH)}</h2>
  <table class="tabla"><thead><tr><th scope="col">${esc(t.opcion)}</th><th scope="col">Título</th><th scope="col">Tipo</th><th scope="col">${esc(C.palabras)}</th><th scope="col">${esc(C.claves)}</th></tr></thead><tbody>${opciones}</tbody></table>
  <ul class="etq">${d.etiquetas.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
</section>
<section>
  <h2><span class="n">03</span>${esc(C.descargas)}</h2>
  <ul class="descargas">${descargas}${audio}</ul>
  <p class="aviso">${esc(PRESENTACION[d.lang].vozNav)} ${voz && VOCES[voz] ? esc(VOCES[voz]) : ''}</p>
</section>
${datos ? `<section><h2><span class="n">04</span>${esc(C.datos)}</h2><dl>${datos}</dl></section>` : ''}
<section>
  <h2><span class="n">${datos ? '05' : '04'}</span>${esc(C.revision)}</h2>
  <dl><dt>${esc(C.revision)}</dt><dd>${esc(d.revision.fecha)} · ${esc(d.revision.revisor)}</dd>
  <dt>${esc(C.fuentes)}</dt><dd>${d.revision.fuentes.map((f) => /^https?:/.test(f) ? `<a href="${esc(f)}" rel="noopener">${esc(f)}</a>` : esc(f)).join(' · ')}</dd>
  ${d.revision.notas ? `<dt>Notas</dt><dd>${esc(d.revision.notas)}</dd>` : ''}</dl>
</section>
</main>`;
  return pagina({ lang: d.lang, titulo: `${t.tipo} ${d.num} · ${tituloCorto(d)}`, descripcion: d.regra, cuerpo, prefijo: '../', vocesUsadas: voz ? [voz] : [] });
}

/** Índice con filtros. `entradas` = [{d, ficheros, voz}] solo de dictados publicados. */
function paginaIndice(entradas) {
  const valores = (fn) => [...new Set(entradas.flatMap(fn))].sort((a, b) => a.localeCompare(b, 'es'));
  const cursos = valores(({ d }) => [d.curso]);
  const uds = valores(({ d }) => [d.ud]);
  const etiquetas = valores(({ d }) => d.etiquetas);
  const tipos = valores(({ d }) => d.opcions.map((o) => o.tipo));
  const opt = (xs, todas) => `<option value="">${esc(todas)}</option>` + xs.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  const items = entradas.map(({ d, ficheros }) => {
    const t = PRESENTACION[d.lang];
    const id = idDitado(d);
    const nPal = d.opcions.map((o) => contarPalabras(textoPlano(o.texto)));
    return `<li data-lang="${d.lang}" data-curso="${esc(d.curso)}" data-ud="${esc(d.ud)}" data-etq="${esc(d.etiquetas.join('|'))}" data-tipo="${esc(d.opcions.map((o) => o.tipo).join('|'))}" data-texto="${esc([d.titulo, d.regra, ...d.opcions.map((o) => o.titulo)].join(' ').toLowerCase())}">
  <div>
    <p class="meta">${esc(C.langs[d.lang])} · ${esc(d.curso)}.º · ${esc(d.ud)}</p>
    <h3><a href="${id}/">${esc(t.tipo)} ${d.num} · ${esc(tituloCorto(d))}</a></h3>
    <p class="regra">${esc(d.regra)}</p>
    <p class="meta">${d.opcions.length === 1 ? '1 ' + esc(C.opcion) : d.opcions.length + ' ' + esc(C.opciones)} · ${Math.min(...nPal) === Math.max(...nPal) ? Math.min(...nPal) : Math.min(...nPal) + '–' + Math.max(...nPal)} ${esc(C.palabras)} · ${d.opcions.map((o) => esc(o.tipo)).join(', ')}</p>
    <ul class="etq">${d.etiquetas.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
  </div>
  <div class="acciones"><a class="boton" href="${id}/${esc(ficheros.presentacion)}">${esc(C.presentacion)}</a><a class="boton alt" href="${id}/">${esc(C.descargas)}</a></div>
</li>`;
  }).join('\n');
  const cuerpo = `
<header class="cab"><div class="wrap">
  <p class="kicker">EDUmind</p>
  <h1>${esc(C.titulo)}</h1>
  <p class="sub">${esc(C.sub)}</p>
</div></header>
<main class="wrap">
<form class="filtros" id="filtros" role="search" aria-label="${esc(C.filtros.buscar)}">
  <label>${esc(C.filtros.lang)}<select name="lang"><option value="">${esc(C.todas)}</option><option value="gl">${esc(C.langs.gl)}</option><option value="es">${esc(C.langs.es)}</option></select></label>
  <label>${esc(C.filtros.curso)}<select name="curso">${opt(cursos, C.todos)}</select></label>
  <label>${esc(C.filtros.ud)}<select name="ud">${opt(uds, C.todas)}</select></label>
  <label>${esc(C.filtros.etiqueta)}<select name="etq">${opt(etiquetas, C.todas)}</select></label>
  <label>${esc(C.filtros.tipo)}<select name="tipo">${opt(tipos, C.todos)}</select></label>
  <label>${esc(C.filtros.buscar)}<input type="search" name="q" autocomplete="off"></label>
</form>
<p class="recuento" id="recuento" aria-live="polite"></p>
<ul class="lista" id="lista">
${items}
</ul>
<p id="vacio" hidden>${esc(C.sinResultados)}</p>
</main>
<script>
(function () {
  var f = document.getElementById('filtros'), items = [].slice.call(document.querySelectorAll('#lista > li'));
  var rec = document.getElementById('recuento'), vacio = document.getElementById('vacio');
  function texto(n) { return n + (n === 1 ? ' dictado' : ' dictados'); }
  function aplicar() {
    var v = {}; [].forEach.call(f.elements, function (e) { if (e.name) v[e.name] = e.value; });
    var q = (v.q || '').toLowerCase().trim(), n = 0;
    items.forEach(function (li) {
      var ok = (!v.lang || li.dataset.lang === v.lang) && (!v.curso || li.dataset.curso === v.curso) && (!v.ud || li.dataset.ud === v.ud)
        && (!v.etq || li.dataset.etq.split('|').indexOf(v.etq) >= 0) && (!v.tipo || li.dataset.tipo.split('|').indexOf(v.tipo) >= 0)
        && (!q || li.dataset.texto.indexOf(q) >= 0);
      li.hidden = !ok; if (ok) n++;
    });
    rec.textContent = texto(n); vacio.hidden = n > 0;
  }
  f.addEventListener('input', aplicar); f.addEventListener('submit', function (e) { e.preventDefault(); aplicar(); });
  aplicar();
})();
</script>`;
  const voces = [...new Set(entradas.map((e) => e.voz).filter(Boolean))];
  return pagina({ lang: 'es', titulo: C.titulo, descripcion: C.sub, cuerpo, prefijo: '', vocesUsadas: voces });
}

module.exports = { paginaIndice, paginaDitado };
