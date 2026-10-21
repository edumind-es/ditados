# Kit de dictados de 6.ºA · cómo generar un dictado nuevo

Un dictado = un fichero JSON en `data/` (`gl-02.json`, `es-02.json`…). Todo lo demás sale de él.

## 1. El JSON

- `lang` (`gl` o `es`), `num`, `titulo` («Ditado 2 · Título»), `semana`, `ud`, `regra`.
- `fixome`: 3 o 4 frases cortas con la regla de la semana (salen en la ficha y en la presentación).
- `texto`: el dictado. `\n` para un salto de línea (cartas).
- `segmentos`: el texto troceado para dictar. Unidos con un espacio tienen que dar exactamente `texto`.
- `foco`: palabras clave con `p` (tal como aparece en el texto), `por` (explicación para el alumnado) y, si `p` es una frase, `e` (etiqueta corta).

## 2. Generar

```
python3 gen_audio.py data/gl-02.json out/audio        # voz (Nós/Brais en gallego, Piper en castellano)
node gen_fichas.js data/gl-02.json out/print           # ficha y dictado repetido (DOCX)
python3 gen_html.py data/gl-02.json out/audio out/html # presentación con el audio dentro
python3 gen_miclase.py data/gl-02.json out/docente     # Markdown para MiClase
cd out/print && soffice --headless --convert-to pdf *.docx
```

La tarjeta y el cuaderno de reglas son fijos: `node gen_fichas.js --kit gl out/print`.

## 3. Antes de imprimir

- Revisión ortográfica y normativa del JSON (RAG / RAE), con especial cuidado en gallego.
- Escuchar el audio completo.
- Comprobar que la ficha ocupa dos páginas.

## Requisitos de la voz

- Gallego: Coqui TTS (`coqui-tts[codec]`, `transformers` 4.57) y el modelo `proxectonos/Nos_TTS-brais-vits-graphemes` (Apache 2.0; hay que reconocer al Proyecto Nós).
- Castellano: `piper-tts` y la voz `es_ES-davefx-medium`.
- Sin audio, la presentación usa la voz del navegador.

Luis Vilela Acuña
