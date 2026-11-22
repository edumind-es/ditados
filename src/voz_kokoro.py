# Sintetiza con Kokoro-82M (hexgrad, Apache 2.0) todos los clips de un dictado cargando el modelo una sola vez.
# Lo llama src/audio.js solo al compilar; en clase no se sintetiza nada.
# Entrada (stdin, JSON): {"voz": "ef_dora", "velocidad": 0.9, "trabajos": [{"texto": "…", "wav": "/ruta/salida.wav"}, …]}
# Salida: un WAV mono a 24 kHz por trabajo y una línea «ok N» por la salida estándar.
# Necesita el entorno de .cache/tts-venv (ver README, apartado «Con audio»): kokoro, espeakng-loader, phonemizer-fork, soundfile, torch (CPU).
import json
import sys
import warnings

import numpy as np
import soundfile as sf

warnings.filterwarnings('ignore')

peticion = json.load(sys.stdin)
voz = peticion['voz']
velocidad = float(peticion.get('velocidad', 0.9))
trabajos = peticion['trabajos']

import torch  # noqa: E402  (se importa después de leer la petición: si falla, el error llega antes de cargar nada)
from kokoro import KPipeline  # noqa: E402

torch.set_num_threads(max(1, min(12, torch.get_num_threads())))
# lang_code 'e' = español; la pronunciación la hace espeak-ng (acento peninsular).
canal = KPipeline(lang_code='e', repo_id='hexgrad/Kokoro-82M')

hechos = 0
for t in trabajos:
    partes = [np.asarray(r.audio, dtype='float32') for r in canal(t['texto'], voice=voz, speed=velocidad) if r.audio is not None]
    if not partes:
        print(f"sin audio para «{t['texto'][:40]}»", file=sys.stderr)
        sys.exit(1)
    sf.write(t['wav'], np.concatenate(partes), 24000)
    hechos += 1

print(f'ok {hechos}')
