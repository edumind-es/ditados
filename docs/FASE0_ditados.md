# Ditados EDUmind · Fase 0

Fecha: 2026-10-21. Autor del documento: desarrollador IA para Luis Vilela Acuña.

## 1. Qué hace hoy el prototipo

Un dictado es un JSON en `data/`. De él salen, con cinco scripts sueltos:

| Script | Produce | Cómo |
|---|---|---|
| `gen_html.py` + `template.html` | Presentación proyectable, un HTML autónomo con los MP3 incrustados en base64 | Sustitución de marcadores `{{…}}` en la plantilla |
| `gen_fichas.js` | Ficha de dos caras y dictado repetido en DOCX; con `--kit`, la tarjeta y el cuaderno de reglas | docx-js; el PDF se hace aparte con LibreOffice |
| `gen_audio.py` / `gen_audio_set.py` | MP3 mono 64 kbps normalizados: lectura completa y uno por trozo | Coqui TTS (Brais) en gallego, Piper en castellano, ffmpeg con loudnorm |
| `gen_miclase.py` / `gen_set_docs.py` | Markdown de MiClase por opción y «textos para el docente» | Texto plano |

Lo que ya hace bien y hay que conservar tal cual:

- Los cinco pasos con «Agora/Ahora», navegación con flechas y RePág/AvPág, botones fijos abajo, foco al título al cambiar de paso.
- El dictado por trozos: cada trozo suena dos veces con 1,1 s entre lecturas y luego espera `(2500 + palabras × 1100) × tiempo ÷ velocidad` ms. Un `token` cancela cualquier reproducción en curso al pulsar pausa o cambiar de paso.
- El marcado de palabras clave: numeración, negrita y subrayado; si la clave es una frase, solo se marca la puntuación. Las expresiones `(?<!\w)` evitan marcar «mar» dentro de «mariños».
- Voz del navegador si faltan los MP3.
- El botón de accesibilidad: Atkinson, negro sobre blanco, letra mayor, sin transiciones.
- La ficha: cabecera, «Hoxe fíxome en», criterios, casillas A B C D, renglones de 11 mm; cara B con los dos modos, tabla de 3 o 2 columnas, palabras conquistadas, regla, cuatro palabras y sentimientos.

Lo que el prototipo no hace o hace mal (y el brief ya pide corregir):

- Carga Fraunces, Space Grotesk y Atkinson desde Google Fonts (apartado 10: la IP del aula sale a Google). Hay que alojarlas en el servidor.
- No hay ninguna validación: si un segmento no cuadra, el HTML se genera igual; solo falla al no encontrar una clave.
- El paso 5 de la ficha se llama «Para sempre / Para siempre» y la presentación repite «palabras para sempre» tres veces (apartado 12). Hay que renombrarlo.
- No comprueba que la ficha quepa en dos páginas: se mira a ojo con LibreOffice.
- `gl-01` y `es-01` tienen el formato antiguo (un solo texto, sin `opcions`); `gl-02` y `es-02` el nuevo. Ningún fichero tiene `etiquetas`, `estado`, `revision` ni `datos`; las notas de `es-02` viven en un Markdown aparte.
- Herramientas del prototipo que NO están en este servidor: Coqui TTS, Piper, LibreOffice, el modelo Brais en `~/tts`. Sí están: ffmpeg, Node 22, Python con torch (CPU), Chromium de Playwright, Directus 11, n8n, Authentik.

Estado de los cuatro dictados, comprobado con un script:

| Dictado | Opciones | Palabras por texto | Claves por opción | Segmentos = texto | Claves en el texto |
|---|---|---|---|---|---|
| gl-01 Unha tarde en Cambados | 1 | 72 | 18 | sí | sí |
| gl-02 Substantivos e plurais | A B C D | 72 · 77 · 71 · 66 | 12 · 12 · 13 · 13 | sí | sí |
| es-01 Una carta a la abuela | 1 | 78 | 16 | sí | sí |
| es-02 Signos que ordenan el texto | A B C D | 75 · 73 · 66 · 69 | 13 · 14 · 14 · 13 | sí | sí |

Todos cumplen las validaciones del apartado 4 sin tocarlos. Solo falta el bloque de revisión.

## 2. Hallazgo que cambia la propuesta de voz

En `/var/www/edumind_escribe/voz/` ya funciona un servicio propio de voz (Flask, puerto 9160) con el motor aHoTTS del grupo HiTZ. Ofrece seis voces gallegas (celtia, sabela, brais, icia, iago, paulo: Proxecto Nós y CRPIH/UVigo) y dos castellanas (laura, alejandro). Sintetiza en menos de un segundo en CPU y cachea en disco. Eso cubre el punto 5.6 «otros tipos de voz a escoger por el docente» sin instalar Coqui ni descargar Brais otra vez.

Lo que sé: las voces gallegas se publican con Apache 2.0 (modelos) y CC BY 4.0 (datos). Lo que NO he verificado: la licencia de las dos voces castellanas de HiTZ (`HiTZ/TTS-es_laura`, `HiTZ/TTS-es_alejandro`) ni de sus datos. Hay que leer sus fichas en Hugging Face antes de usarlas en público. Si son limpias, resuelven el problema de Piper sin buscar más; si no, pasamos a Kokoro o a la voz del navegador.

## 3. Arquitectura propuesta

Propongo una alternativa más simple que la del brief y explico por qué.

**Propuesta B (recomendada): contenido en Git, sitio estático y un servicio pequeño.**

- Los dictados viven como JSON en el repositorio, en `contenido/`. Un módulo único de validación (JavaScript) lo usan el editor, la línea de comandos y la integración continua, así una regla se escribe una vez.
- Un generador (Node) produce de cada JSON la página de catálogo, la presentación HTML autónoma, los impresos y el Markdown de MiClase. Los impresos se hacen como HTML de impresión y se convierten a PDF con el Chromium de Playwright que ya está instalado; eso permite comprobar automáticamente que la ficha ocupa dos páginas (se cuenta en el PDF). El DOCX queda como opción posterior con docx-js, que ya existe.
- El audio lo pide el generador al servicio de voz de `edumind_escribe` (o a una copia suya dentro de este proyecto) y lo normaliza con ffmpeg como ahora.
- El editor del autor es la única parte con sesión: una página detrás de Authentik, como las demás apps, que lee y escribe los JSON a través de un servicio mínimo. Al guardar como «revisado», ese mismo servicio lanza la generación.
- Publicar es compilar: Nginx sirve la carpeta generada. El paquete sin conexión para el NAS es la misma carpeta de un dictado, comprimida.

Por qué no Directus en el centro: Directus no sabe validar un JSON anidado (habría que ponerlo en un flow o en un hook, es decir, código igualmente), obliga a subir y enlazar MP3 y PDF como ficheros, y en la auditoría de agosto quedó como el punto débil de seguridad del servidor y no se actualiza a propósito por la licencia de la versión 12. Con los textos en Git, además, cada cambio normativo queda en un diff revisable y firmado, que es justo lo que pide el apartado 11. Directus puede seguir siendo el catálogo público de edumind.es: el generador puede darle de alta cada dictado publicado como «recurso», igual que hoy hace el watcher de contenido.

**Propuesta A (la del brief): Directus + Astro + n8n + contenedor Python.** Funciona, pero son cuatro piezas que coordinar para un contenido que cabe en una carpeta. La recomendaría si varios autores fueran a editar a la vez, que no es el caso.

Puntos comunes a ambas: licencia dual AGPL-3.0-or-later / EUPL-1.2, repo en `edumind-es`, fuentes alojadas en el servidor, sin analítica, `localStorage` solo para preferencias del docente con `try/catch`.

## 4. Decisiones que te corresponden

1. **Arquitectura:** B (Git + estático + servicio mínimo) o A (Directus + Astro + n8n).
2. **Licencia del contenido** (textos, fichas, audio). Recomiendo CC BY-SA 4.0: cualquier maestro puede adaptar los dictados si comparte igual, y es compatible con que el audio lleve voces Apache 2.0 y CC BY 4.0. CC BY-NC-SA 4.0 impediría que una editorial los use, pero también que entren en repositorios de recursos abiertos que exigen uso comercial permitido (Procomún lo admite, Wikimedia no).
3. **Voz en castellano:** ¿verifico las licencias de laura y alejandro (HiTZ) y, si son limpias, las uso? Mientras tanto, voz del navegador, como dice el brief.
4. **Nombre del paso 5 de la ficha** en lugar de «Para sempre / Para siempre». Propongo «Levo ao caderno de regras» / «Llevo al cuaderno de reglas», y en la presentación «Escollo 4 palabras para o caderno de regras».
5. **Rango de palabras por curso.** Propuesta para empezar, ajustable en un fichero de configuración: 1.º 20-35, 2.º 30-45, 3.º 40-55, 4.º 50-65, 5.º 55-75, 6.º 60-90. No tengo fuente normativa para estas cifras; son una suposición de partida.
6. **Estado inicial de los cuatro dictados.** Se usaron en aula en octubre de 2026, pero no hay fecha ni fuentes de revisión. ¿Los marco «revisado» con tu nombre y la fecha que me digas, o quedan en «borrador» hasta que les pongas las fuentes?
7. **Dominio y repositorio.** ¿`ditados.edumind.es` o `dictados.edumind.es`? ¿Repo `edumind-es/ditados`?
8. **Reutilizar el servicio de voz de escribe** tal cual (el proyecto nuevo lo llama por HTTP) o copiarlo dentro del repo de dictados para que sea autónomo. Recomiendo copiarlo: así el repo público se puede instalar sin escribe.

## 5. Plan de la Fase 1 (MVP), una vez decidido lo anterior

1. Repositorio con la estructura, licencias, fuentes alojadas y el módulo de validación con pruebas.
2. Migración de los cuatro dictados al formato con `opcions`, `etiquetas`, `estado`, `revision` y `datos` (las notas de es-02 pasan al JSON).
3. Presentación: la plantilla actual, sin Google Fonts, con el nombre del paso 5 corregido, y las mejoras del apartado 5.2.
4. Impresos en HTML de impresión → PDF con Chromium, con la prueba automática de dos páginas.
5. Catálogo estático con filtros.
6. Audio gallego con el servicio aHoTTS y voz del navegador en castellano.
7. Entrega con las pruebas del apartado 13.

Luis Vilela Acuña · EDUmind®
