# Sintetiza con Piper (Open Home Foundation, GPL-3.0) todos los clips de un dictado cargando la voz una sola vez.
# Lo llama src/audio.js solo al compilar; en clase no se sintetiza nada.
# Entrada (stdin, JSON): {"modelo": "/ruta/es_ES-sharvard-medium.onnx", "escala": 1.1, "trabajos": [{"texto": "…", "wav": "/ruta/salida.wav"}, …]}
# Salida: un WAV mono por trabajo y una línea «ok N» por la salida estándar.
# Necesita piper-tts en el entorno de voz (ver README, apartado «Con audio»).
import json
import sys
import wave

peticion = json.load(sys.stdin)

from piper import PiperVoice, SynthesisConfig  # noqa: E402

voz = PiperVoice.load(peticion['modelo'])
# length_scale > 1 habla más despacio: es para dictar, igual que la velocidad 0,9 de Kokoro.
ajustes = SynthesisConfig(length_scale=float(peticion.get('escala', 1.1)))

hechos = 0
for t in peticion['trabajos']:
    with wave.open(t['wav'], 'wb') as w:
        voz.synthesize_wav(t['texto'], w, syn_config=ajustes)
    hechos += 1

print(f'ok {hechos}')
