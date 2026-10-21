"""Audio dun ditado con varias opcións: python gen_audio_set.py data/gl-02.json out/audio"""
import json, os, sys, subprocess, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_audio import mp3, TTS_DIR, PIPER_VOICE
d = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
syn = None
if d["lang"] == "gl":
    from TTS.utils.synthesizer import Synthesizer
    syn = Synthesizer(tts_checkpoint=os.path.join(TTS_DIR, "brais", "brais.pth"),
                      tts_config_path=os.path.join(TTS_DIR, "brais", "config.json"), use_cuda=False)
tmp = tempfile.mkdtemp()
for o in d["opcions"]:
    ident = f'{d["lang"]}-{d["num"]:02d}{o["letra"].lower()}'
    jobs = [("completo", o["texto"].replace("\n", " "))] + [(f"s{i:02d}", s) for i, s in enumerate(o["segmentos"], 1)]
    for name, text in jobs:
        wav = os.path.join(tmp, name + ".wav")
        if syn: syn.save_wav(syn.tts(text), wav)
        else: subprocess.run(["piper", "-m", PIPER_VOICE, "--length-scale", "1.08", "-f", wav], input=text.encode(), check=True, capture_output=True)
        mp3(wav, os.path.join(out, f"{ident}-{name}.mp3"))
    print("ok", ident, len(jobs))
