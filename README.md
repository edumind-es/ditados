# Ditados · Dictados EDUmind

Aplicación web para preparar, proyectar, imprimir y corregir dictados en Lingua Galega y Lengua Castellana en primaria. Cada dictado ofrece varios textos que trabajan la misma regla; el docente elige uno en clase, lo proyecta con el audio, imprime la ficha de dos caras y corrige con el alumnado separando el despiste del desconocimiento.

Web: `dictados.edumind.es`. Fases 1 a 3 construidas en octubre de 2026 (pendientes de despliegue).

## Qué hace

De cada dictado (un JSON en `contenido/`) se generan:

- **Presentación proyectable**: un HTML autónomo con las fuentes y el audio dentro, que funciona sin conexión. Cinco pasos (Preparo, Escucho, Escribo, Corrijo, Pienso), selector de texto, dictado trozo a trozo, dos modos de corrección, palabras clave numeradas con su explicación y botón de accesibilidad.
- **Ficha de dos caras** (PDF) y **dictado repetido** (PDF), negro sobre blanco, Atkinson Hyperlegible a 14 pt. La compilación comprueba que la ficha ocupa exactamente dos páginas.
- **Textos para el docente** y **Markdown de importación en MiClase**, uno por opción.
- **Ficha en A3 y en A4 con letra grande** para alumnado con baja visión, y **tarjeta y cuaderno de reglas** por lengua.
- **Paquete sin conexión** (ZIP) por dictado, para el NAS o un lápiz USB, con la presentación, los impresos y el kit.
- **Catálogo** con filtros por lengua, curso, unidad, etiqueta y tipo de texto, instalable como PWA: lo que se visita queda disponible sin conexión y hay un botón para guardar un dictado entero.
- **Editor del autor** (`/editor/`, detrás de Authentik): clic en el texto para elegir las palabras clave, segmentación propuesta y editable, validación en vivo, lista de comprobación normativa, audio por trozo con regeneración y elección de voz, y flujo borrador → revisado → publicado que lanza la generación.

Solo llegan a la web los dictados con `estado: publicado`, y nada se publica sin el bloque `revision` (fecha, revisor y fuentes).

## Cómo se usa

Requisitos ya presentes en el servidor: Node 22, ffmpeg, `pdfinfo` (poppler), el Chromium de Playwright en `~/.cache/ms-playwright` y el motor de voz aHoTTS de `edumind_escribe`. No hay dependencias de npm.

```bash
node bin/ditados.js validar          # valida todos los dictados y explica los errores en lenguaje llano
node bin/ditados.js build            # compila la web completa en dist/ (con audio y PDF)
node bin/ditados.js build --sin-audio --sin-pdf   # compilación rápida para probar el catálogo
node bin/ditados.js build --solo gl-02            # un solo dictado
DITADOS_SIN_AUTH=1 node bin/ditados.js servir     # editor en http://127.0.0.1:9170/editor/ (solo en local; en producción va con Authentik)
npm test                             # validaciones, marcado, contraste y páginas de la ficha
NODE_PATH=/var/www/edumind_miclase/node_modules node herramientas/comprobar_web.js   # errores JS, 390 px, teclado, terceros
```

El audio se guarda en `.cache/audio/<id>/<voz>/` y se reutiliza en cada compilación; para regenerar una voz basta con borrar esa carpeta.

Variables opcionales: `DITADOS_CHROME` (ruta de Chromium), `DITADOS_AHOTTS` (carpeta de aHoTTS), `DITADOS_AUDIO` (caché de audio).

## Formato de un dictado

Ver `contenido/gl-02.json` como ejemplo completo y `contenido/config.json` para los rangos de palabras por curso, los tipos de texto y las voces. Las validaciones viven en `src/validar.js`:

- los trozos (`segmentos`), unidos con un espacio, reproducen exactamente el texto;
- cada palabra clave (`foco.p`) aparece literalmente en el texto;
- el texto tiene las palabras que marca el curso (6.º: de 60 a 90) y entre 10 y 18 palabras clave;
- no se pasa a «revisado» ni a «publicado» sin fecha, revisor y fuentes.

## Estructura

```
contenido/      dictados (JSON) y config.json
src/            validar, marcar, generadores (presentación, impresos, docente, catálogo), pdf, audio, build
plantillas/     presentacion.html, impreso.html, lamina.css
public/fonts/   Fraunces, Space Grotesk, Atkinson Hyperlegible, Archivo, JetBrains Mono (OFL), alojadas aquí
test/           pruebas con node:test
herramientas/   migración del prototipo, comprobación de la web, prototipo original de referencia
docs/           Fase 0, decisiones y despliegue (nginx, Authentik, systemd del editor)
dist/           salida compilada (no se versiona)
```

## Lo que falta

- ODT descargables: exigen LibreOffice en el servidor (no instalado).
- LanguageTool: el editor lo usa si se configura `DITADOS_LANGUAGETOOL_URL` (contenedor no instalado).
- Despliegue: DNS, certificado y vhost (ver `docs/DESPLIEGUE.md`).

## Voces y licencias

- Gallego: voces del Proxecto Nós (Universidade de Santiago de Compostela), modelo Apache 2.0, sintetizadas con aHoTTS (HiTZ, UPV/EHU). Se reconoce al Proxecto Nós en el pie de cada presentación.
- Castellano: voz Alejandro de aHoTTS (HiTZ y Aholab, UPV/EHU), modelo Apache 2.0 entrenado con datos CC BY 4.0 (Multilingual LibriSpeech, LibriVox). La voz Laura procede de un corpus de pago de ELRA y **no se usa** hasta tener confirmación escrita de HiTZ.
- Si no hay audio, la presentación usa la voz del navegador.

## Protección de datos

El alumnado no tiene cuenta, no escribe en la web y no se guarda ningún dato suyo. No hay analítica ni servicios de terceros; las fuentes se sirven desde el propio servidor. El docente puede guardar sus preferencias (accesibilidad, tiempo y velocidad) en su navegador; sin ellas todo funciona igual.

## Licencia

Programa: AGPL-3.0-or-later o EUPL-1.2, a elección (ver `LICENSE`). Contenido (textos, fichas, audio): CC BY-SA 4.0.

EDUmind® es marca registrada. Autoría: Luis Vilela Acuña.
