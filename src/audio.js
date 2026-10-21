'use strict';
// Audio de un dictado con el motor aHoTTS (HiTZ) y las voces del Proxecto Nós / HiTZ.
// Se llama al binario solo al generar, sin proceso residente: en clase no se sintetiza nada.
// Salida: <id>-completo.mp3 y <id>-sNN.mp3 (mono, 64 kbps, volumen normalizado), igual que el prototipo.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { idOpcion, textoPlano } = require('./validar');

const AHOTTS_DIR = process.env.DITADOS_AHOTTS || '/var/www/edumind_escribe/voz/aHoTTS';
const PYTHON_HF = process.env.DITADOS_PYTHON_HF || '/var/www/edumind_escribe/voz/.venv/bin/python';
const VOCES_CACHE = process.env.DITADOS_VOCES || path.join(__dirname, '..', '.cache', 'voces');

function disponible() {
  return fs.existsSync(path.join(AHOTTS_DIR, 'ahotts', 'tts')) && spawnSync('ffmpeg', ['-version']).status === 0;
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

/** Sintetiza un texto a WAV con aHoTTS. */
function sintetizar(texto, lang, voz, wav) {
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

/** WAV → MP3 mono 64 kbps, con 250 ms de silencio delante, 350 ms detrás y volumen normalizado. */
function aMp3(wav, mp3) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav,
    '-af', 'adelay=250:all=1,apad=pad_dur=0.35,loudnorm=I=-16:TP=-1.5',
    '-ac', '1', '-ar', '24000', '-b:a', '64k', mp3], { stdio: ['ignore', 'ignore', 'pipe'] });
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
    for (const o of d.opcions) {
      const ident = idOpcion(d, o);
      const trabajos = [['completo', textoPlano(o.texto)], ...o.segmentos.map((s, i) => [`s${String(i + 1).padStart(2, '0')}`, s])];
      for (const [nombre, texto] of trabajos) {
        const mp3 = path.join(outDir, `${ident}-${nombre}.mp3`);
        if (!forzar && fs.existsSync(mp3)) { reutilizados++; continue; }
        const wav = path.join(tmp, `${ident}-${nombre}.wav`);
        sintetizar(texto, d.lang, voz, wav);
        aMp3(wav, mp3);
        generados++;
        log(`  audio ${ident}-${nombre}`);
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { generados, reutilizados };
}

module.exports = { generarAudio, sintetizar, aMp3, disponible, AHOTTS_DIR };
