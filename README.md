# Ditados · Dictados EDUmind

Aplicación web para preparar, proyectar, imprimir y corregir dictados en Lingua Galega y Lengua Castellana en primaria. Cada dictado ofrece varios textos que trabajan la misma regla; el docente elige uno en clase, lo proyecta con el audio, imprime la ficha de dos caras y corrige con el alumnado separando el despiste del desconocimiento.

Web: <https://dictados.edumind.es>. Código: <https://github.com/edumind-es/ditados>. Proyecto abierto: cualquiera puede usarlo, instalarlo en su centro, mejorarlo o continuarlo (ver «Continuar el proyecto»).

## Qué hace

De cada dictado (un JSON en `contenido/`) se generan:

- **Presentación proyectable**: un HTML autónomo con las fuentes y el audio dentro, que funciona sin conexión. Cinco pasos (Preparo, Escucho, Escribo, Corrijo, Pienso), selector de texto, dictado trozo a trozo, dos modos de corrección, palabras clave numeradas con su explicación y botón de accesibilidad.
- **Ficha de dos caras** (PDF) y **dictado repetido** (PDF), negro sobre blanco, Atkinson Hyperlegible a 14 pt. La compilación comprueba que la ficha ocupa exactamente dos páginas.
- **Textos para el docente** y **Markdown de importación en MiClase**, uno por opción.
- **Ficha en A3 y en A4 con letra grande** para alumnado con baja visión, y **tarjeta y cuaderno de reglas** por lengua.
- **Paquete sin conexión** (ZIP) por dictado, para el NAS o un lápiz USB, con la presentación, los impresos y el kit.
- **Catálogo** con filtros por lengua, curso, unidad, etiqueta y tipo de texto, instalable como PWA: lo que se visita queda disponible sin conexión y hay un botón para guardar un dictado entero.
- **Dictado rápido** (`/rapido/`, público): el docente pega un texto, elige lengua y curso, acepta o retoca los trozos propuestos, marca las palabras clave con un clic y la presentación de cinco pasos se genera en su propio navegador (voz del navegador, fuentes dentro, descargable). No se envía ni se guarda nada en el servidor: el borrador vive solo en ese navegador. Usa exactamente el mismo código que la compilación, empaquetado por `src/navegador.js`.
- **Editor del autor** (`/editor/`, detrás de Authentik): clic en el texto para elegir las palabras clave, segmentación propuesta y editable, validación en vivo, lista de comprobación normativa, audio por trozo con regeneración y elección de voz, y flujo borrador → revisado → publicado que lanza la generación.

Solo llegan a la web los dictados con `estado: publicado`, y nada se publica sin el bloque `revision` (fecha, revisor y fuentes).

## Cómo se usa

Requisitos en el servidor: Node 22, ffmpeg, `pdfinfo` (poppler), el Chromium de Playwright en `~/.cache/ms-playwright`, el motor de voz aHoTTS de `edumind_escribe` y LibreOffice Writer sin interfaz (ODT). No hay dependencias de npm.

```bash
node bin/ditados.js validar          # valida todos los dictados y explica los errores en lenguaje llano
node bin/ditados.js build            # compila la web completa en dist/ (con audio y PDF)
node bin/ditados.js build --sin-audio --sin-pdf   # compilación rápida para probar el catálogo
node bin/ditados.js build --solo gl-02            # un solo dictado
DITADOS_LANGUAGETOOL_URL=http://127.0.0.1:8010 node bin/ditados.js corregir   # corrector automático
DITADOS_SIN_AUTH=1 node bin/ditados.js servir     # editor en http://127.0.0.1:9170/editor/ (solo en local; en producción va con Authentik)
npm test                             # validaciones, marcado, contraste y páginas de la ficha
NODE_PATH=/var/www/edumind_miclase/node_modules node herramientas/comprobar_web.js   # errores JS, 390 px, teclado, terceros
```

El audio se guarda en `.cache/audio/<id>/<voz>/` y se reutiliza en cada compilación; para regenerar una voz basta con borrar esa carpeta.

Variables opcionales: `DITADOS_CHROME` (ruta de Chromium), `DITADOS_AHOTTS` (carpeta de aHoTTS), `DITADOS_PYTHON_HF` (Python con `huggingface_hub` para descargar voces), `DITADOS_VOCES` (caché de voces), `DITADOS_AUDIO` (caché de audio).

## Continuar el proyecto

Este repositorio es la fuente completa: no hay nada privado que haga falta para compilar, probar o publicar la web. Las rutas de `/var/www/…` que aparecen en el código y en `docs/` son solo los valores por defecto del servidor de EDUmind y se cambian con las variables de arriba.

Por niveles, de menos a más:

1. **Solo Node 22**: `npm test` y `node bin/ditados.js build --sin-audio --sin-pdf` generan el catálogo, las presentaciones (con la voz del navegador) y el dictado rápido. Es lo que hace la integración continua en cada PR.
2. **Con audio**: clona [aHoTTS](https://github.com/hitz-zentroa/aHoTTS) (HiTZ, UPV/EHU), instala ffmpeg y apunta `DITADOS_AHOTTS` a esa carpeta. Las voces se descargan de Hugging Face (`HiTZ/TTS-<lengua>_<voz>`) con el Python de `DITADOS_PYTHON_HF`.
3. **Con PDF y ODT**: Chromium (por ejemplo, `npx playwright install chromium`, o `DITADOS_CHROME`), `pdfinfo` de poppler y LibreOffice Writer sin interfaz.
4. **Editor del autor**: `node bin/ditados.js servir` detrás de cualquier proxy que autentique y pase el usuario en la cabecera `X-Authentik-Username` (ver `docs/DESPLIEGUE.md`; Authentik es la opción de EDUmind, no un requisito).

La comprobación con navegador real necesita Playwright accesible por `NODE_PATH` (en EDUmind se toma de otro proyecto; fuera, basta un `npm i -g playwright`).

Para proponer cambios: `CONTRIBUTING.md`. Para avisar de un fallo de seguridad: `SECURITY.md`. Para hacer tu propia versión: bifurca el repositorio, cambia lo que quieras y publica `dist/` en cualquier hosting estático. Puedes usarlo tal cual, con el nombre EDUmind incluido; solo si publicas una versión modificada como servicio propio, dale un nombre que la distinga de la oficial (ver `TRADEMARKS.md`).

## Formato de un dictado

Ver `contenido/gl-02.json` como ejemplo completo y `contenido/config.json` para los parámetros por curso (rango de palabras, número de palabras clave, tamaño de los trozos y renglones de la ficha), los tipos de texto y las voces. Cada dictado lleva `tema` (la regla o el contenido que trabaja), nunca el nombre de una unidad didáctica: el catálogo es público. Las validaciones viven en `src/validar.js`:

- los trozos (`segmentos`), unidos con un espacio, reproducen exactamente el texto;
- cada palabra clave (`foco.p`) aparece literalmente en el texto;
- el texto tiene las palabras y las palabras clave que marca el curso (6.º: de 60 a 90 palabras y de 10 a 18 claves; 1.º: de 20 a 35 y de 4 a 8);
- no se pasa a «revisado» ni a «publicado» sin fecha, revisor y fuentes.

## Estructura

```
contenido/      dictados (JSON) y config.json
src/            validar, marcar, generadores (presentación, impresos, docente, catálogo, dictado rápido), navegador (paquete JS), pdf, audio, build
plantillas/     presentacion.html, impreso.html, rapido.html, editor.html, lamina.css
public/fonts/   Fraunces, Space Grotesk, Atkinson Hyperlegible, Archivo, JetBrains Mono (OFL), alojadas aquí
test/           pruebas con node:test
herramientas/   migración del prototipo, comprobación de la web, prototipo original de referencia
docs/           Fase 0, decisiones y despliegue (nginx, Authentik, systemd del editor)
dist/           salida compilada (no se versiona)
```

## Dictados incluidos

De 6.º, cuatro dictados publicados (usados en aula en octubre de 2026). De 1.º a 5.º, dos dictados por curso y lengua con tres textos cada uno (`gl-03`…`gl-12`, `es-03`…`es-12`), escritos con ayuda de IA y guardados como **borrador**: el autor los revisa contra la RAG y la RAE y los publica desde el editor. Nada escrito por IA llega al alumnado sin revisión humana.

## ODT y corrector

- Los ODT (ficha, dictado repetido, tarjeta y cuaderno) se generan con LibreOffice Writer sin interfaz, instalado el 2026-10-21. Son versiones editables; la referencia de maquetación es el PDF.
- LanguageTool corre en el contenedor `dictados-languagetool` (`deploy/languagetool/docker-compose.yml`, solo en `127.0.0.1:8010`). `node bin/ditados.js corregir` lo pasa por todos los dictados; el editor lo usa con `DITADOS_LANGUAGETOOL_URL`. Filtra el ruido (letras sueltas, palabras citadas entre comillas latinas) y sigue siendo una ayuda: la revisión humana contra la RAG y la RAE es obligatoria.

## Lo que falta

- El editor en producción detrás de Authentik (ver `docs/DESPLIEGUE.md`).

## Voces y licencias

- Gallego: voces del Proxecto Nós (Universidade de Santiago de Compostela), modelo Apache 2.0, sintetizadas con aHoTTS (HiTZ, UPV/EHU). Se reconoce al Proxecto Nós en el pie de cada presentación.
- Castellano: voz Alejandro de aHoTTS (HiTZ y Aholab, UPV/EHU), modelo Apache 2.0 entrenado con datos CC BY 4.0 (Multilingual LibriSpeech, LibriVox). La voz Laura procede de un corpus de pago de ELRA y **no se usa** hasta tener confirmación escrita de HiTZ.
- Si no hay audio, la presentación usa la voz del navegador.

## Protección de datos

El alumnado no tiene cuenta, no escribe en la web y no se guarda ningún dato suyo. No hay analítica ni servicios de terceros; las fuentes se sirven desde el propio servidor. El docente puede guardar sus preferencias (accesibilidad, tiempo y velocidad) en su navegador; sin ellas todo funciona igual.

## Licencia

Programa: AGPL-3.0-or-later o EUPL-1.2, a elección (ver `LICENSE`). Contenido (textos, fichas, audio): CC BY-SA 4.0 (ver `LICENSE-CONTENT.md`). EDUmind® es marca registrada; eso no limita ninguna de las libertades de las licencias (ver `TRADEMARKS.md`).

EDUmind® es marca registrada. Autoría: Luis Vilela Acuña.
