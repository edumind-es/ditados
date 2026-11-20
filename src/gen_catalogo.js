'use strict';
// Catálogo público (índice con filtros) y ficha de cada dictado, en estilo EDUmind-Lámina.
// El filtrado se hace en el navegador sobre atributos data-*, sin ninguna dependencia.
const fs = require('node:fs');
const path = require('node:path');
const { esc, cssFuentes, RAIZ } = require('./html');
const { CATALOGO: C, PRESENTACION, VOCES, nombreVoz, MUESTRAS_VOZ } = require('./textos');

// Preferencia de voz del docente: solo en su navegador, por lengua. Sin almacenamiento, todo funciona con la voz por defecto.
const JS_PREF = "function vozGuardada(lang) { try { return localStorage.getItem('ditados.voz.' + lang); } catch (e) { return null; } }\nfunction guardarVoz(lang, voz) { try { localStorage.setItem('ditados.voz.' + lang, voz); } catch (e) {} }";
const { idDitado, idOpcion, tituloCorto, contarPalabras, textoPlano, etapaDe, nombreCurso } = require('./validar');
const { marcar } = require('./marcar');
const { resolver, bloqueCorto } = require('./curriculo');

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
<meta name="theme-color" content="#1a1a1a">
<link rel="manifest" href="${prefijo}manifest.webmanifest">
<link rel="icon" href="${prefijo}icono.svg" type="image/svg+xml">
<title>${esc(titulo)}</title>
<style>
${fuentesLamina(prefijo + 'fonts/')}
${CSS}
</style>
</head>
<body>
${franja}
${cuerpo}
<script>
/* PWA: el catálogo se puede instalar y lo visitado queda disponible sin conexión. Sin datos de nadie. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('${prefijo}sw.js').then(function (reg) {
    var b = document.getElementById('guardar-sc'), est = document.getElementById('sc-estado');
    if (!b) return;
    b.hidden = false;
    b.addEventListener('click', function () {
      var rutas = Array.prototype.map.call(document.querySelectorAll('a[download], a.boton[href]'), function (a) { return new URL(a.getAttribute('href'), location.href).href; }).filter(function (u, i, arr) { return arr.indexOf(u) === i; });
      est.hidden = false; est.textContent = ${JSON.stringify(C.guardando)};
      navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.tipo === 'guardado') est.textContent = ${JSON.stringify(C.guardado)}; if (e.data && e.data.tipo === 'error') est.textContent = e.data.mensaje; });
      (reg.active || navigator.serviceWorker.controller).postMessage({ tipo: 'guardar', rutas: rutas });
    });
  }).catch(function () {});
}
</script>
<footer class="pe"><div class="wrap">
<p>${esc(C.pe)}</p>
<p>${esc(C.licencia)}</p>
${voces}
</div></footer>
</body>
</html>`;
}

/** Ficha de un dictado dentro del catálogo. */
function paginaDitado(d, ficheros, voz, kit, curriculo) {
  const cur = resolver(d, curriculo);
  const t = PRESENTACION[d.lang];
  const id = idDitado(d);
  const opciones = d.opcions.map((o) => `
<tr><th scope="row">${esc(o.letra)}</th><td>${esc(o.titulo)}</td><td>${esc(o.tipo)}</td><td>${contarPalabras(textoPlano(o.texto))}</td><td>${o.foco.length}</td></tr>`).join('');
  // Cada texto completo, para leerlo (y oírlo, si hay audio) antes de proyectarlo
  const textos = d.opcions.map((o) => {
    const mp3 = ficheros.audio.find((a) => a.endsWith(`${idOpcion(d, o)}-completo.mp3`));
    return `
<article class="texto">
  <h3>${esc(o.letra)} · ${esc(o.titulo)}</h3>
  <p class="meta">${esc(o.tipo)} · ${contarPalabras(textoPlano(o.texto))} ${esc(C.palabras)} · ${o.foco.length} ${esc(C.claves)}</p>
  <p class="texto-op" lang="${d.lang}">${marcar(o.texto, o.foco)}</p>
  ${mp3 ? `<p><audio controls preload="none" src="${esc(mp3)}" data-fichero="${esc(path.basename(mp3))}" aria-label="${esc(C.escuchar)}: ${esc(o.titulo)}"></audio></p>` : ''}
  <details><summary>${esc(C.verClaves(o.foco.length))}</summary>
  <ol class="claves" lang="${d.lang}">${o.foco.map((f) => `<li><strong>${esc(f.e || f.p)}</strong> ${esc(f.por)}</li>`).join('')}</ol></details>
</article>`;
  }).join('');
  const datos = d.opcions.filter((o) => o.datos).map((o) => `<dt>${esc(o.letra)} · ${esc(o.titulo)}</dt><dd>${esc(o.datos)}</dd>`).join('');
  const fm = ficheros.formatos || {};
  const descargas = [
    [ficheros.paquete, C.paquete],
    [ficheros.presentacion, C.presDescarga],
    [ficheros.ficha, C.ficha], [ficheros.repetido, C.repetido],
    [fm.A3 && fm.A3.ficha, C.fichaA3], [fm.A3 && fm.A3.repetido, C.repetidoA3],
    [fm.grande && fm.grande.ficha, C.fichaGrande], [fm.grande && fm.grande.repetido, C.repetidoGrande],
    [ficheros.odt && ficheros.odt.ficha, C.fichaOdt], [ficheros.odt && ficheros.odt.repetido, C.repetidoOdt],
    [ficheros.textos, C.textosDocente],
    ...ficheros.miclase.map((m, i) => [m, `${C.miclase} · ${d.opcions[i].letra}`]),
    [kit && '../' + kit.tarxeta, C.kitTarxeta], [kit && '../' + kit.caderno, C.kitCaderno],
    [kit && kit.tarxetaOdt && '../' + kit.tarxetaOdt, C.kitTarxeta + ' (ODT)'], [kit && kit.cadernoOdt && '../' + kit.cadernoOdt, C.kitCaderno + ' (ODT)'],
  ].filter(([f]) => f).map(([f, l]) => `<li><a href="${esc(f)}" download>${esc(l)}</a></li>`).join('');
  const audio = ficheros.audio.length
    ? `<li>${esc(C.audio)}: ${ficheros.audio.map((a) => `<a href="${esc(a)}" download>${esc(path.basename(a, '.mp3'))}</a>`).join(' · ')}</li>` : '';
  // Selector de voz: cambia la presentación que se abre y el audio de escucha de cada texto
  const vs = ficheros.voces || [];
  const selectorVoz = vs.length > 1 ? `<fieldset class="voces" id="voces" data-lang="${d.lang}"><legend>${esc(C.vozH)}</legend>
  ${vs.map((v, i) => `<label><input type="radio" name="voz" value="${esc(v.voz)}" data-pres="${esc(v.presentacion)}" data-audio="${esc(v.audio)}"${i === 0 ? ' checked' : ''}> ${esc(nombreVoz(v.voz))}${i === 0 ? ` <span class="meta">${esc(C.vozDefecto)}</span>` : ''}</label>`).join('\n  ')}
  <p class="sub">${esc(C.vozSub)} <a href="../voces/">${esc(C.vocesLink)}</a></p>
</fieldset>
<script>
${JS_PREF}
(function () {
  var caja = document.getElementById('voces'), lang = caja.dataset.lang, radios = [].slice.call(caja.querySelectorAll('input[name=voz]'));
  function aplicar(r) {
    document.getElementById('abrir-pres').href = r.dataset.pres;
    [].forEach.call(document.querySelectorAll('audio[data-fichero]'), function (a) { a.pause(); a.src = r.dataset.audio + '/' + a.dataset.fichero; });
  }
  var pref = vozGuardada(lang), elegido = radios.filter(function (r) { return r.value === pref; })[0];
  /* Los reproductores de cada texto van más abajo en la página: la voz guardada se aplica cuando ya existen. */
  if (elegido) { elegido.checked = true; document.addEventListener('DOMContentLoaded', function () { aplicar(elegido); }); }
  radios.forEach(function (r) { r.addEventListener('change', function () { aplicar(r); guardarVoz(lang, r.value); }); });
})();
</script>` : '';
  const cuerpo = `
<header class="cab"><div class="wrap">
  <p class="kicker"><a href="../">${esc(C.titulo)}</a> · ${esc(C.langs[d.lang])} · ${esc(nombreCurso(d.curso, true))} · ${esc(d.tema)}</p>
  <h1>${esc(t.tipo)} ${d.num} · ${esc(tituloCorto(d))}</h1>
  <p class="sub">${esc(d.regra)}</p>
</div></header>
<main class="wrap">
<section>
  <p><a class="boton" id="abrir-pres" href="${esc(ficheros.presentacion)}">${esc(C.presentacion)}</a> <button class="boton alt" type="button" id="guardar-sc" hidden>${esc(C.guardarSC)}</button></p>
  ${selectorVoz}
  <p class="aviso" id="sc-estado" hidden></p>
</section>
<section>
  <h2><span class="n">01</span>${esc(C.fixome)}</h2>
  <ul>${d.fixome.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>
<section>
  <h2><span class="n">02</span>${esc(C.opcionesH)}</h2>
  <div class="tabla-wrap"><table class="tabla"><thead><tr><th scope="col">${esc(t.opcion)}</th><th scope="col">Título</th><th scope="col">Tipo</th><th scope="col">${esc(C.palabras)}</th><th scope="col">${esc(C.claves)}</th></tr></thead><tbody>${opciones}</tbody></table></div>
  <ul class="etq">${d.etiquetas.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
</section>
<section>
  <h2><span class="n">03</span>${esc(C.textosH)}</h2>
  ${textos}
</section>
${cur ? `<section class="curriculo">
  <h2><span class="n">04</span>${esc(C.curriculo)}</h2>
  <h3>${esc(C.evaluar)}</h3>
  <ul lang="${d.lang}">${cur.evaluar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h3>${esc(C.criterios)}</h3>
  <dl>${cur.criterios.map((x) => `<dt>${esc(x.cod)}</dt><dd>${esc(x.texto)}</dd>`).join('')}</dl>
  <h3>${esc(C.contenidos)}</h3>
  <dl>${cur.contenidos.map((x) => `<dt>${esc(x.cod)}</dt><dd>${esc(x.texto)}</dd>`).join('')}</dl>
  <p class="aviso">${esc(cur.norma)}. ${cur.oficiales ? '' : esc(C.codigosPropios)}</p>
</section>` : ''}
<section>
  <h2><span class="n">${cur ? '05' : '04'}</span>${esc(C.descargas)}</h2>
  <ul class="descargas">${descargas}${audio}</ul>
  <p class="aviso">${esc(PRESENTACION[d.lang].vozNav)} ${voz && VOCES[voz] ? esc(VOCES[voz]) : ''}</p>
</section>
${datos ? `<section><h2><span class="n">${cur ? '06' : '05'}</span>${esc(C.datos)}</h2><dl>${datos}</dl></section>` : ''}
<section>
  <h2><span class="n">0${5 + (datos ? 1 : 0) + (cur ? 1 : 0)}</span>${esc(C.revision)}</h2>
  <dl><dt>${esc(C.revision)}</dt><dd>${esc(d.revision.fecha)} · ${esc(d.revision.revisor)}</dd>
  <dt>${esc(C.fuentes)}</dt><dd>${d.revision.fuentes.map((f) => /^https?:/.test(f) ? `<a href="${esc(f)}" rel="noopener">${esc(f)}</a>` : esc(f)).join(' · ')}</dd>
  ${d.revision.notas ? `<dt>Notas</dt><dd>${esc(d.revision.notas)}</dd>` : ''}</dl>
</section>
</main>`;
  return pagina({ lang: d.lang, titulo: `${t.tipo} ${d.num} · ${tituloCorto(d)}`, descripcion: d.regra, cuerpo, prefijo: '../', vocesUsadas: vs.length ? vs.map((v) => v.voz) : voz ? [voz] : [] });
}

/** Índice con filtros. `entradas` = [{d, ficheros, voz}] solo de dictados publicados. */
function paginaIndice(entradas, kit = {}, config = { cursos: {} }, extras = {}) {
  // Orden del catálogo: lengua, curso (el orden de config.json: primaria y después ESO) y número.
  const ordenCursos = [...new Set([...Object.keys(config.cursos), ...entradas.map(({ d }) => d.curso)])];
  entradas = [...entradas].sort((a, b) => (a.d.lang === b.d.lang ? 0 : a.d.lang === 'gl' ? -1 : 1)
    || ordenCursos.indexOf(a.d.curso) - ordenCursos.indexOf(b.d.curso) || a.d.num - b.d.num);
  const plural = (n, uno, varios) => `${n} ${esc(n === 1 ? uno : varios)}`;
  // Mapa de niveles: una fila por curso y una columna por lengua; cada celda filtra la lista de abajo.
  const celda = (lang, curso) => {
    const suyos = entradas.filter(({ d }) => d.lang === lang && d.curso === curso);
    if (!suyos.length) return `<td class="vacia">${esc(C.enPreparacion)}</td>`;
    const nTextos = suyos.reduce((s, { d }) => s + d.opcions.length, 0);
    return `<td><a href="?lang=${lang}&amp;curso=${esc(curso)}#lista">${plural(suyos.length, C.dictado, C.dictados)} · ${plural(nTextos, C.texto, C.textos)}</a></td>`;
  };
  const mapa = ['primaria', 'eso'].map((etapa) => {
    const suyos = ordenCursos.filter((c) => etapaDe(c) === etapa);
    return suyos.map((c, i) => `<tr>${i === 0 ? `<th scope="rowgroup" rowspan="${suyos.length}" class="etapa">${esc(C.etapas[etapa])}</th>` : ''}<th scope="row">${esc(nombreCurso(c))}</th>${celda('gl', c)}${celda('es', c)}</tr>`).join('\n');
  }).join('\n');
  const optCursos = `<option value="">${esc(C.todos)}</option>` + ['primaria', 'eso'].map((etapa) => `<optgroup label="${esc(C.etapas[etapa])}">${ordenCursos.filter((c) => etapaDe(c) === etapa).map((c) => `<option value="${esc(c)}">${esc(nombreCurso(c))}</option>`).join('')}</optgroup>`).join('');
  const valores = (fn) => [...new Set(entradas.flatMap(fn))].sort((a, b) => a.localeCompare(b, 'es'));
  entradas = entradas.map((e) => ({ ...e, cur: resolver(e.d, config.curriculo) }));
  const bloquesDe = (cur) => (cur ? cur.bloques.map(bloqueCorto) : []);
  const bloques = valores(({ cur }) => bloquesDe(cur));
  const temas = valores(({ d }) => [d.tema]);
  const etiquetas = valores(({ d }) => d.etiquetas);
  const tipos = valores(({ d }) => d.opcions.map((o) => o.tipo));
  const opt = (xs, todas) => `<option value="">${esc(todas)}</option>` + xs.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  const items = entradas.map(({ d, ficheros, cur }) => {
    const t = PRESENTACION[d.lang];
    const id = idDitado(d);
    const nPal = d.opcions.map((o) => contarPalabras(textoPlano(o.texto)));
    return `<li data-lang="${d.lang}" data-curso="${esc(d.curso)}" data-tema="${esc(d.tema)}" data-etq="${esc(d.etiquetas.join('|'))}" data-bloque="${esc(bloquesDe(cur).join('|'))}" data-tipo="${esc(d.opcions.map((o) => o.tipo).join('|'))}" data-texto="${esc([d.titulo, d.regra, ...d.opcions.map((o) => o.titulo)].join(' ').toLowerCase())}">
  <div>
    <p class="meta">${esc(C.langs[d.lang])} · ${esc(nombreCurso(d.curso, true))} · ${esc(d.tema)}</p>
    <h3><a href="${id}/">${esc(t.tipo)} ${d.num} · ${esc(tituloCorto(d))}</a></h3>
    <p class="regra">${esc(d.regra)}</p>
    <p class="meta">${d.opcions.length === 1 ? '1 ' + esc(C.opcion) : d.opcions.length + ' ' + esc(C.opciones)} · ${Math.min(...nPal) === Math.max(...nPal) ? Math.min(...nPal) : Math.min(...nPal) + '–' + Math.max(...nPal)} ${esc(C.palabras)} · ${d.opcions.map((o) => esc(o.tipo)).join(', ')}</p>
    <ul class="etq">${d.etiquetas.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
    ${cur ? `<p class="meta cur">${esc(C.criterios)}: ${cur.criterios.map((x) => `<abbr title="${esc(x.texto)}">${esc(x.cod)}</abbr>`).join(' · ')}</p>` : ''}
  </div>
  <div class="acciones"><a class="boton" href="${id}/${esc(ficheros.presentacion)}"${(ficheros.voces || []).length > 1 ? ` data-lang="${d.lang}" data-voces="${esc(JSON.stringify(Object.fromEntries(ficheros.voces.map((v) => [v.voz, `${id}/${v.presentacion}`]))))}"` : ''}>${esc(C.presentacion)}</a><a class="boton alt" href="${id}/">${esc(C.descargas)}</a></div>
  <details class="previa"><summary>${esc(C.verTextos(d.opcions.length))}</summary>
  ${d.opcions.map((o) => `<article class="texto"><h4>${esc(o.letra)} · ${esc(o.titulo)} <span class="meta">${esc(o.tipo)} · ${contarPalabras(textoPlano(o.texto))} ${esc(C.palabras)}</span></h4><p class="texto-op" lang="${d.lang}">${marcar(o.texto, o.foco)}</p></article>`).join('\n  ')}
  </details>
</li>`;
  }).join('\n');
  const cuerpo = `
<header class="cab"><div class="wrap">
  <p class="kicker">EDUmind</p>
  <h1>${esc(C.titulo)}</h1>
  <p class="sub">${esc(C.sub)}</p>
  <p class="acciones-cab"><a class="boton alt" href="rapido/">${esc(C.rapido)}</a> <span class="sub">${esc(C.rapidoSub)}</span></p>
  ${extras.voces ? `<p class="acciones-cab"><a class="boton alt" href="voces/">${esc(C.voces)}</a> <span class="sub">${esc(C.vocesSub)}</span></p>` : ''}
</div></header>
<main class="wrap">
<section class="niveles">
  <h2><span class="n">01</span>${esc(C.niveles)}</h2>
  <p class="sub">${esc(C.nivelesSub)}</p>
  <div class="tabla-wrap"><table class="tabla mapa"><thead><tr><th scope="col"></th><th scope="col">${esc(C.filtros.curso)}</th><th scope="col">${esc(C.langs.gl)}</th><th scope="col">${esc(C.langs.es)}</th></tr></thead><tbody>
${mapa}
</tbody></table></div>
</section>
<form class="filtros" id="filtros" role="search" aria-label="${esc(C.filtros.buscar)}">
  <label>${esc(C.filtros.lang)}<select name="lang"><option value="">${esc(C.todas)}</option><option value="gl">${esc(C.langs.gl)}</option><option value="es">${esc(C.langs.es)}</option></select></label>
  <label>${esc(C.filtros.curso)}<select name="curso">${optCursos}</select></label>
  <label>${esc(C.filtros.tema)}<select name="tema">${opt(temas, C.todos)}</select></label>
  <label>${esc(C.filtros.etiqueta)}<select name="etq">${opt(etiquetas, C.todas)}</select></label>
  <label>${esc(C.filtros.tipo)}<select name="tipo">${opt(tipos, C.todos)}</select></label>
  <label>${esc(C.bloque)}<select name="bloque">${opt(bloques, C.todos)}</select></label>
  <label>${esc(C.filtros.buscar)}<input type="search" name="q" autocomplete="off"></label>
</form>
<h2><span class="n">02</span>${esc(C.dictados.charAt(0).toUpperCase() + C.dictados.slice(1))}</h2>
<p class="recuento" id="recuento" aria-live="polite"></p>
<ul class="lista" id="lista">
${items}
</ul>
<p id="vacio" hidden>${esc(C.sinResultados)}</p>
${Object.keys(kit).length ? `<section><h2><span class="n">03</span>${esc(C.kit)}</h2><ul class="descargas">${['gl', 'es'].filter((l) => kit[l]).map((l) => `<li>${esc(C.langs[l])}: <a href="${esc(kit[l].tarxeta)}" download>${esc(C.kitTarxeta)}</a> · <a href="${esc(kit[l].caderno)}" download>${esc(C.kitCaderno)}</a>${kit[l].tarxetaOdt ? ` · <a href="${esc(kit[l].tarxetaOdt)}" download>ODT</a> · <a href="${esc(kit[l].cadernoOdt)}" download>ODT</a>` : ''}</li>`).join('')}</ul></section>` : ''}
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
      var ok = (!v.lang || li.dataset.lang === v.lang) && (!v.curso || li.dataset.curso === v.curso) && (!v.tema || li.dataset.tema === v.tema)
        && (!v.etq || li.dataset.etq.split('|').indexOf(v.etq) >= 0) && (!v.tipo || li.dataset.tipo.split('|').indexOf(v.tipo) >= 0) && (!v.bloque || li.dataset.bloque.split('|').indexOf(v.bloque) >= 0)
        && (!q || li.dataset.texto.indexOf(q) >= 0);
      li.hidden = !ok; if (ok) n++;
    });
    rec.textContent = texto(n); vacio.hidden = n > 0;
  }
  /* Los enlaces del mapa de niveles (?lang=gl&curso=3) llegan como filtros ya puestos. */
  function deUrl() {
    var p = new URLSearchParams(location.search);
    [].forEach.call(f.elements, function (e) { if (e.name && p.has(e.name)) e.value = p.get(e.name); });
  }
  deUrl();
  [].forEach.call(document.querySelectorAll('.mapa a'), function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); f.reset(); deUrl(); aplicar();
      document.getElementById('lista').scrollIntoView();
    });
  });
  /* Si el docente eligió una voz para esa lengua, «Presentación proyectable» abre la de esa voz. */
  ${JS_PREF}
  [].forEach.call(document.querySelectorAll('a[data-voces]'), function (a) {
    var mapa = JSON.parse(a.dataset.voces), pref = vozGuardada(a.dataset.lang);
    if (pref && mapa[pref]) a.href = mapa[pref];
  });
  f.addEventListener('input', aplicar); f.addEventListener('submit', function (e) { e.preventDefault(); aplicar(); });
  aplicar();
})();
</script>`;
  const voces = [...new Set(entradas.map((e) => e.voz).filter(Boolean))];
  return pagina({ lang: 'es', titulo: C.titulo, descripcion: C.sub, cuerpo, prefijo: '', vocesUsadas: voces });
}

/** Página «Voces»: las mismas frases en cada voz publicada, con su crédito y un botón para elegirla. `muestras` = {lang: [{voz, clips}]}. */
function paginaVoces(muestras, config) {
  const secciones = ['gl', 'es'].filter((l) => muestras[l]).map((lang, n) => `
<section data-lang="${lang}">
  <h2><span class="n">0${n + 1}</span>${esc(C.langs[lang])}</h2>
  ${muestras[lang].map(({ voz, clips }) => `<article class="voz" data-voz="${esc(voz)}">
  <h3>${esc(nombreVoz(voz))}${voz === config.voces[lang].defecto ? ` <span class="meta">${esc(C.vozDefecto)}</span>` : ''}</h3>
  <p class="meta">${esc(VOCES[voz] || '')}</p>
  ${clips.map((c, i) => `<figure><figcaption lang="${lang}">${esc(MUESTRAS_VOZ[lang][i])}</figcaption><audio controls preload="none" src="${esc(c)}"></audio></figure>`).join('\n  ')}
  <p><button class="boton alt" type="button" data-usar>${esc(C.usarVoz)}</button> <span class="meta" data-estado hidden>${esc(C.vozElegida)}</span></p>
</article>`).join('\n')}
</section>`).join('\n');
  const cuerpo = `
<header class="cab"><div class="wrap">
  <p class="kicker"><a href="../">${esc(C.titulo)}</a></p>
  <h1>${esc(C.voces)}</h1>
  <p class="sub">${esc(C.vocesSub)}</p>
</div></header>
<main class="wrap">
${secciones}
</main>
<script>
${JS_PREF}
(function () {
  [].forEach.call(document.querySelectorAll('section[data-lang]'), function (sec) {
    var lang = sec.dataset.lang, voces = [].slice.call(sec.querySelectorAll('article.voz'));
    function pintar() {
      var pref = vozGuardada(lang);
      voces.forEach(function (a) { var es = a.dataset.voz === pref; a.querySelector('[data-estado]').hidden = !es; a.querySelector('[data-usar]').setAttribute('aria-pressed', es ? 'true' : 'false'); });
    }
    voces.forEach(function (a) { a.querySelector('[data-usar]').addEventListener('click', function () { guardarVoz(lang, a.dataset.voz); pintar(); }); });
    pintar();
  });
})();
</script>`;
  return pagina({ lang: 'es', titulo: `${C.voces} · ${C.titulo}`, descripcion: C.vocesSub, cuerpo, prefijo: '../', vocesUsadas: [] });
}

module.exports = { pagina, paginaIndice, paginaDitado, paginaVoces };
