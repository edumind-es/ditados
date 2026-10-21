"""Xera os audios dun ditado a partir do seu JSON.

Uso:  python gen_audio.py data/gl-01.json out/audio
Galego: modelo Brais do Proxecto Nós (Coqui TTS). Castelán: Piper (voz es_ES).
Saída: <id>-completo.mp3 e <id>-s01.mp3 … (un por segmento).
"""
import json, os, subprocess, sys, tempfile

TTS_DIR = os.path.expanduser("~/tts")
PIPER_VOICE = os.path.join(TTS_DIR, "piper", "es_ES-davefx-medium.onnx")

def mp3(wav, out):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                    "-af", "adelay=250:all=1,apad=pad_dur=0.35,loudnorm=I=-16:TP=-1.5",
                    "-ac", "1", "-ar", "24000", "-b:a", "64k", out], check=True)

def main(src, outdir):
    d = json.load(open(src, encoding="utf-8"))
    os.makedirs(outdir, exist_ok=True)
    ident = f'{d["lang"]}-{d["num"]:02d}'
    jobs = [("completo", d["texto"].replace("\n", " "))] + [(f"s{i:02d}", s) for i, s in enumerate(d["segmentos"], 1)]
    tmp = tempfile.mkdtemp()
    if d["lang"] == "gl":
        from TTS.utils.synthesizer import Synthesizer
        syn = Synthesizer(tts_checkpoint=os.path.join(TTS_DIR, "brais", "brais.pth"),
                          tts_config_path=os.path.join(TTS_DIR, "brais", "config.json"), use_cuda=False)
        for name, text in jobs:
            wav = os.path.join(tmp, name + ".wav")
            syn.save_wav(syn.tts(text), wav)
            mp3(wav, os.path.join(outdir, f"{ident}-{name}.mp3"))
    else:
        for name, text in jobs:
            wav = os.path.join(tmp, name + ".wav")
            subprocess.run(["piper", "-m", PIPER_VOICE, "--length-scale", "1.08",
                            "--sentence-silence", "0.5", "-f", wav],
                           input=text.encode("utf-8"), check=True, capture_output=True)
            mp3(wav, os.path.join(outdir, f"{ident}-{name}.mp3"))
    print("ok", ident, len(jobs), "ficheiros")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
