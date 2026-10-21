"""Documentos docentes de un dictado con opciones: MiClase (uno por opción) y textos para el docente (.md).

Uso: python3 gen_set_docs.py data/es-02.json out/docente
Después: pandoc <md> -o <docx> y soffice --convert-to pdf.
"""
import json, os, sys

L = {
    "gl": dict(tipo="Ditado", a="Ben escrita", b="Hai que corrixila", tit="Textos para o docente",
               intro="Catro textos para escoller. Todos traballan a mesma regra; a ficha e o ditado repetido serven para calquera deles. O alumnado marca na ficha a letra do texto.",
               pal="palabras", clave="Palabras clave (numeración da presentación e de MiClase):"),
    "es": dict(tipo="Dictado", a="Bien escrita", b="Hay que corregirla", tit="Textos para el docente",
               intro="Cuatro textos para elegir. Todos trabajan la misma regla; la ficha y el dictado repetido sirven para cualquiera de ellos. El alumnado marca en la ficha la letra del texto.",
               pal="palabras", clave="Palabras clave (numeración de la presentación y de MiClase):"),
}

def main(src, out, notas=None):
    d = json.load(open(src, encoding="utf-8")); l = L[d["lang"]]
    os.makedirs(out, exist_ok=True)
    tema = d["titulo"].split("·")[1].strip()
    for o in d["opcions"]:
        lines = [f"# {l['tipo']} {d['num']}{o['letra']} · {o['titulo']} (autocorrección)", "Penalización: 0", ""]
        for i, f in enumerate(o["foco"], 1):
            lines += [f"{i}. {f.get('e', f['p'])}", f"a) {l['a']}*", f"b) {l['b']}", ""]
        open(os.path.join(out, f"{l['tipo']}{d['num']:02d}{o['letra']}_MiClase_{d['lang']}.md"), "w", encoding="utf-8").write("\n".join(lines))
    md = ["---", f'title: "{l["tipo"]} {d["num"]} · {tema} · {l["tit"]}"', 'author: "Luis Vilela Acuña"', f"lang: {d['lang']}", "---", "",
          f"{d['ud']} · {l['intro']}", ""]
    for o in d["opcions"]:
        md += [f"# {o['letra']} · {o['titulo']} ({o['tipo']}, {len(o['texto'].split())} {l['pal']})", "", o["texto"].replace("\n", "  \n"), "", f"**{l['clave']}**", ""]
        md += [f"{i}. **{f.get('e', f['p'])}**: {f['por']}" for i, f in enumerate(o["foco"], 1)] + [""]
    if notas: md += open(notas, encoding="utf-8").read().splitlines()
    name = f"{l['tipo']}{d['num']:02d}_textos_docente_{d['lang']}.md"
    open(os.path.join(out, name), "w", encoding="utf-8").write("\n".join(md))
    print("ok", name, len(d["opcions"]), "MiClase")

if __name__ == "__main__":
    main(*sys.argv[1:4])
