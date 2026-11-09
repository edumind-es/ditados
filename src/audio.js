'use strict';
// Audio de un dictado con dos motores, elegidos por la voz:
//  - Kokoro-82M (hexgrad, Apache 2.0) para las voces castellanas dora, santa y alex, vía src/voz_kokoro.py en .cache/tts-venv;
//  - aHoTTS (HiTZ) para las voces gallegas del Proxecto Nós y las castellanas antiguas (laura, alejandro).
// Se llama a los motores solo al generar, sin proceso residente: en clase no se sintetiza nada.
// Salida: <id>-completo.mp3 y <id>-sNN.mp3 (mono, 64 kbps, volumen normalizado), igual que el prototipo.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { idOpcion, textoPlano } = require('./validar');

const AHOTTS_DIR = process.env.DITADOS_AHOTTS || '/var/www/edumind_escribe/voz/aHoTTS';
const PYTHON_HF = process.env.DITADOS_PYTHON_HF || '/var/www/edumind_escribe/voz/.venv/bin/python';
const VOCES_CACHE = process.env.DITADOS_VOCES || path.join(__dirname, '..', '.cache', 'voces');
const PYTHON_KOKORO = process.env.DITADOS_KOKORO_PYTHON || path.join(__dirname, '..', '.cache', 'tts-venv', 'bin', 'python');

// Voces que sintetiza Kokoro y su nombre dentro del modelo. Cualquier otra voz va por aHoTTS.
const KOKORO = { dora: 'ef_dora', santa: 'em_santa', alex: 'em_alex' };
const KOKORO_VELOCIDAD = 0.9;   // algo más lento que la voz nativa: es para dictar

function hayFfmpeg() { return spawnSync('ffmpeg', ['-version']).status === 0; }
function hayAhotts() { return fs.existsSync(path.join(AHOTTS_DIR, 'ahotts', 'tts')); }
function hayKokoro() { return fs.existsSync(PYTHON_KOKORO); }

/** Hay algún motor de voz y ffmpeg. Si falta el motor de una voz concreta, generarAudio lo dice al generar. */
function disponible() {
  return hayFfmpeg() && (hayAhotts() || hayKokoro());
}

/** Sintetiza varios textos de una vez con Kokoro (el modelo tarda unos segundos en cargar; se carga una sola vez). */
function sintetizarKokoro(trabajos, voz) {
  if (!hayKokoro()) {
    throw new Error(`la voz «${voz}» necesita Kokoro en ${PYTHON_KOKORO} (ver README, «Con audio») o la variable DITADOS_KOKORO_PYTHON`);
  }
  const peticion = { voz: KOKORO[voz], velocidad: KOKORO_VELOCIDAD, trabajos: trabajos.map((t) => ({ texto: textoParaVoz(t.texto, 'es'), wav: t.wav })) };
  const r = spawnSync(PYTHON_KOKORO, ['-I', path.join(__dirname, 'voz_kokoro.py')], {
    input: JSON.stringify(peticion), encoding: 'utf8', timeout: 1800000, maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0 || !trabajos.every((t) => fs.existsSync(t.wav))) {
    throw new Error(`Kokoro falló: ${String(r.stderr || r.error || '').trim().split('\n').slice(-3).join(' · ').slice(-400)}`);
  }
}

/** Carpeta de la voz: primero la caché propia, después la de aHoTTS; si no existe, se descarga de Hugging Face. */
function carpetaVoz(lang, voz) {
  const propia = path.join(VOCES_CACHE, lang, voz);
  if (fs.existsSync(path.join(propia, 'vits.onnx'))) return propia;
  const ajena = path.join(AHOTTS_DIR, 'ahotts', 'voices', lang, voz);
  if (fs.existsSync(path.join(ajena, 'vits.onnx'))) return ajena;
  fs.mkdirSync(propia, { recursive: true });
  // Descarga con huggingface_hub del entorno de escribe (no instalamos nada nuevo).
  execFileSync(PYTHON_HF, ['-c',
    `from huggingface_hub import hf_hub_download; import shutil; p = hf_hub_download(repo_id='HiTZ/TTS-${lang}_${voz}', filename='vits.onnx'); shutil.copy2(p, '${path.join(propia, 'vits.onnx')}')`,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 600000 });
  return propia;
}

/**
 * Prepara el texto para el motor de voz: ni se lee ni se imprime, solo se escucha.
 * En castellano aHoTTS lee ISO-8859-1, y los puntos suspensivos (…), la raya (—) o las comillas tipográficas
 * no existen en esa tabla: llegaban como un carácter cualquiera y la voz soltaba un sonido suelto a mitad de frase.
 * Los puntos suspensivos pasan a punto (misma pausa), la raya a coma y las comillas se quitan.
 */
function textoParaVoz(texto, lang) {
  let t = String(texto || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*…\s*/g, '. ')                 // puntos suspensivos → pausa de punto
    .replace(/\.{3,}/g, '. ')
    .replace(/^\s*[—–-]\s*/gm, '')             // raya de diálogo al empezar: no se lee
    .replace(/\s*[—–]\s*/g, ', ')              // raya o guion largo en medio → pausa de coma
    .replace(/[«»“”"‘’]/g, '')                   // comillas: no suenan
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*([,;:.!?])\s*\1+/g, '$1 ')    // signos repetidos tras las sustituciones (". ." → ".")
    .replace(/,\s*([.;:!?])/g, '$1')            // coma pegada a otro signo (",." → ".")
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/:$/, '.');                         // dos puntos al final de un trozo: el motor añadía un sonido suelto
  return t;
}

/** Sintetiza un texto a WAV con aHoTTS. En castellano el binario lee ISO-8859-1: lo que no cabe ahí no se envía. */
function sintetizar(textoOriginal, lang, voz, wav) {
  let texto = textoParaVoz(textoOriginal, lang);
  if (lang !== 'gl') texto = texto.replace(/[^\u0000-\u00ff]/g, '');
  const vozDir = carpetaVoz(lang, voz);
  const args = lang === 'gl'
    ? ['-Lang=gl', '-Method=Vits', '-HDicDB=./ahotts/dicts/gl/cotovia', `-voice_path=${vozDir}`, wav]
    : ['-Lang=es', '-Method=Vits', '-HDic=./ahotts/dicts/es/es_dicc', `-voice_path=${vozDir}`, wav];
  // El binario lee el texto por la entrada estándar; en castellano espera ISO-8859-1.
  const entrada = Buffer.concat([Buffer.from(texto, lang === 'gl' ? 'utf8' : 'latin1'), Buffer.from('\n')]);
  const r = spawnSync('./ahotts/tts', args, {
    cwd: AHOTTS_DIR, input: entrada, timeout: 120000,
    env: { ...process.env, LD_LIBRARY_PATH: AHOTTS_DIR },
  });
  if (r.status !== 0 || !fs.existsSync(wav)) {
    throw new Error(`aHoTTS falló con «${texto.slice(0, 40)}…»: ${String(r.stderr || '').slice(-300)}`);
  }
}

/** Volumen medio y de pico de un fichero de audio, en dB, medidos con ffmpeg. */
function medirVolumen(fichero) {
  const r = spawnSync('ffmpeg', ['-i', fichero, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const medio = /mean_volume:\s*(-?[\d.]+) dB/.exec(r.stderr);
  const pico = /max_volume:\s*(-?[\d.]+) dB/.exec(r.stderr);
  if (!medio || !pico) throw new Error(`ffmpeg no pudo medir el volumen de ${path.basename(fichero)}`);
  return { medio: Number(medio[1]), pico: Number(pico[1]) };
}

/**
 * WAV → MP3 mono 64 kbps con el volumen igualado.
 * - El motor empieza a hablar en la primera muestra, sin silencio: con 400 ms de colchón delante el navegador ya
 *   está reproduciendo cuando llega la primera sílaba (con menos se perdía el arranque de la palabra), y un fundido
 *   de 20 ms evita el chasquido.
 * - Detrás se recorta la cola de silencio del motor (variable, hasta casi un segundo) y se deja siempre la misma,
 *   400 ms, para que el dictado trozo a trozo tenga un ritmo regular.
 * - El volumen se iguala con una ganancia fija medida antes (volumen medio a -20 dB, pico como mucho a -1,5 dB).
 *   El filtro loudnorm de una sola pasada, que se usaba antes, falla con clips de menos de tres segundos: algunos
 *   trozos cortos salían casi mudos o con el volumen variando dentro de la misma palabra.
 */
function aMp3(wav, mp3) {
  const recortado = wav.replace(/\.wav$/, '.rec.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav,
    '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse', recortado],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  const v = medirVolumen(recortado);
  const ganancia = Math.min(-20 - v.medio, -1.5 - v.pico);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', recortado,
    '-af', `volume=${ganancia.toFixed(2)}dB,adelay=400:all=1,afade=t=in:st=0.4:d=0.02,apad=pad_dur=0.4`,
    '-ac', '1', '-ar', '24000', '-b:a', '64k', mp3], { stdio: ['ignore', 'ignore', 'pipe'] });
  fs.rmSync(recortado, { force: true });
}

/**
 * Genera (o reutiliza, si ya existen) todos los MP3 de un dictado.
 * @returns {{generados: number, reutilizados: number}}
 */
function generarAudio(d, outDir, voz, { forzar = false, log = () => {} } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ditados-audio-'));
  let generados = 0; let reutilizados = 0;
  try {
    // Primero se decide qué falta; después se sintetiza (Kokoro, todo de una vez; aHoTTS, clip a clip) y se convierte a MP3.
    const pendientes = [];
    for (const o of d.opcions) {
      const ident = idOpcion(d, o);
      const trabajos = [['completo', textoPlano(o.texto)], ...o.segmentos.map((s, i) => [`s${String(i + 1).padStart(2, '0')}`, s])];
      for (const [nombre, texto] of trabajos) {
        const mp3 = path.join(outDir, `${ident}-${nombre}.mp3`);
        if (!forzar && fs.existsSync(mp3)) { reutilizados++; continue; }
        pendientes.push({ nombre: `${ident}-${nombre}`, texto, wav: path.join(tmp, `${ident}-${nombre}.wav`), mp3 });
      }
    }
    if (pendientes.length && KOKORO[voz]) {
      log(`  audio: sintetizando ${pendientes.length} clips con Kokoro (${voz})`);
      sintetizarKokoro(pendientes, voz);
    }
    for (const t of pendientes) {
      if (!KOKORO[voz]) sintetizar(t.texto, d.lang, voz, t.wav);
      aMp3(t.wav, t.mp3);
      generados++;
      log(`  audio ${t.nombre}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { generados, reutilizados };
}

module.exports = { generarAudio, sintetizar, sintetizarKokoro, aMp3, textoParaVoz, disponible, AHOTTS_DIR, KOKORO };
