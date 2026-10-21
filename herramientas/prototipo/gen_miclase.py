"""Xera o Markdown de importación en MiClase (corrección por cámara, autocorrección A/B).

Uso: python3 gen_miclase.py data/gl-01.json out/docente
Cada palabra clave é unha pregunta: A = ben escrita (clave), B = hai que corrixila.
A numeración coincide coa das palabras clave da presentación proxectada.
"""
import json, os, sys

L = {"gl": ("Ditado", "autocorrección", "Ben escrita", "Hai que corrixila"),
     "es": ("Dictado", "autocorrección", "Bien escrita", "Hay que corregirla")}

def main(src, out):
    d = json.load(open(src, encoding="utf-8"))
    tipo, modo, a, b = L[d["lang"]]
    titulo = d["titulo"].split("·")[1].strip()
    lines = [f"# {tipo} {d['num']} · {titulo} ({modo})", "Penalización: 0", ""]
    for i, f in enumerate(d["foco"], 1):
        lines += [f"{i}. {f.get('e', f['p'])}", f"a) {a}*", f"b) {b}", ""]
    os.makedirs(out, exist_ok=True)
    name = f"{tipo}{d['num']:02d}_MiClase_{d['lang']}.md"
    open(os.path.join(out, name), "w", encoding="utf-8").write("\n".join(lines))
    print("ok", name, len(d["foco"]), "preguntas")

if __name__ == "__main__":
    main(*sys.argv[1:3])
