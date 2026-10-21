"""Xera a presentación proxectable dun ditado (HTML autocontido, audio incluído).

Uso: python3 gen_html.py data/gl-01.json out/audio out/html
Se non hai audio para o ditado, a páxina usa a voz do navegador.
"""
import base64, html, json, os, re, sys

T = {
  "gl": {
    "tipo": "Ditado", "a11y": "Accesibilidade", "a11yOn": "Accesibilidade activada",
    "pasos": ["Preparo", "Escoito", "Escribo", "Corrixo", "Penso"],
    "agora": "Agora",
    "s1t": "Hoxe imos facer un ditado", "s1p": "Así será a sesión. Imos paso a paso e sempre sabes que vén despois.",
    "s1l": ["Preparo: miro a regra da semana.", "Escoito: oio o ditado enteiro sen escribir.",
            "Escribo: oio cada anaco dúas veces e escribo.", "Corrixo: comparo co texto correcto.",
            "Penso: clasifico os erros e escollo palabras para sempre."],
    "s2t": "Hoxe fíxome en", "s3t": "O ditado",
    "l1": "1. Escoito sen escribir", "l1p": "Deixa o lapis na mesa. Só escoitas.",
    "l2": "2. Escribo", "l2p": "Cada anaco soa dúas veces. Despois tes tempo para escribir.",
    "l3": "3. Reviso", "l3p": "Escoitas o ditado enteiro outra vez e repasas o que escribiches.",
    "play": "Escoitar", "start": "Comezar", "pause": "Pausa", "resume": "Continuar",
    "rep": "Repetir anaco", "prev": "Anterior", "next": "Seguinte",
    "anaco": "Anaco", "de": "de", "escribe": "Escribe agora", "fin": "Fin do ditado",
    "tempo": "Tempo para escribir", "tCurto": "Curto", "tMedio": "Medio", "tLongo": "Longo",
    "vel": "Velocidade da voz", "vLenta": "Lenta", "vNormal": "Normal",
    "s4t": "Corrixo", "modo1": "Corrixo eu", "modo2": "Corriximos en parella",
    "m1p": "Compara o teu ditado co texto, palabra a palabra. Rodea o que cambies e escríbeo ben enriba.",
    "m2p": "A parella le o teu ditado e só pon un punto debaixo da palabra que lle fai dúbida. Non corrixe nin di nada en voz alta. Quen escribiu o ditado mira o texto, decide e corrixe.",
    "amosar": "Amosar o texto correcto", "ocultar": "Ocultar o texto",
    "clave": "Palabras clave", "claveP": "Toca unha palabra para ver por que se escribe así.",
    "s5t": "Penso", "s5l": ["Clasifico os meus erros: despiste, aínda non o sei ou castelanismo.",
                         "Conto as palabras conquistadas. Só para min.",
                         "Explico unha regra coas miñas palabras.",
                         "Escollo 4 palabras para sempre e cópioas no caderno de regras.",
                         "Penso como me sentín e en que me vou fixar a próxima vez."],
    "s5p": "Un erro é unha regra que aínda estou aprendendo.",
    "voz": "Voz: modelo Brais do Proxecto Nós (Universidade de Santiago de Compostela).",
    "vozNav": "Voz do navegador.",
    "pe": "Luis Vilela Acuña · Ditados de Lingua Galega · 6.º",
    "nav": "Pasos da sesión", "anterior": "Paso anterior", "seguinte": "Paso seguinte",
  },
  "es": {
    "tipo": "Dictado", "a11y": "Accesibilidad", "a11yOn": "Accesibilidad activada",
    "pasos": ["Preparo", "Escucho", "Escribo", "Corrijo", "Pienso"],
    "agora": "Ahora",
    "s1t": "Hoy vamos a hacer un dictado", "s1p": "Así será la sesión. Vamos paso a paso y siempre sabes qué viene después.",
    "s1l": ["Preparo: miro la regla de la semana.", "Escucho: oigo el dictado entero sin escribir.",
            "Escribo: oigo cada trozo dos veces y escribo.", "Corrijo: comparo con el texto correcto.",
            "Pienso: clasifico los errores y elijo palabras para siempre."],
    "s2t": "Hoy me fijo en", "s3t": "El dictado",
    "l1": "1. Escucho sin escribir", "l1p": "Deja el lápiz en la mesa. Solo escuchas.",
    "l2": "2. Escribo", "l2p": "Cada trozo suena dos veces. Después tienes tiempo para escribir.",
    "l3": "3. Reviso", "l3p": "Escuchas el dictado entero otra vez y repasas lo que has escrito.",
    "play": "Escuchar", "start": "Empezar", "pause": "Pausa", "resume": "Seguir",
    "rep": "Repetir trozo", "prev": "Anterior", "next": "Siguiente",
    "anaco": "Trozo", "de": "de", "escribe": "Escribe ahora", "fin": "Fin del dictado",
    "tempo": "Tiempo para escribir", "tCurto": "Corto", "tMedio": "Medio", "tLongo": "Largo",
    "vel": "Velocidad de la voz", "vLenta": "Lenta", "vNormal": "Normal",
    "s4t": "Corrijo", "modo1": "Corrijo yo", "modo2": "Corregimos en pareja",
    "m1p": "Compara tu dictado con el texto, palabra a palabra. Rodea lo que cambies y escríbelo bien encima.",
    "m2p": "La pareja lee tu dictado y solo pone un punto debajo de la palabra que le hace dudar. No corrige ni dice nada en voz alta. Quien escribió el dictado mira el texto, decide y corrige.",
    "amosar": "Mostrar el texto correcto", "ocultar": "Ocultar el texto",
    "clave": "Palabras clave", "claveP": "Toca una palabra para ver por qué se escribe así.",
    "s5t": "Pienso", "s5l": ["Clasifico mis errores: despiste o todavía no lo sé.",
                         "Cuento las palabras conquistadas. Solo para mí.",
                         "Explico una regla con mis palabras.",
                         "Elijo 4 palabras para siempre y las copio en el cuaderno de reglas.",
                         "Pienso cómo me he sentido y en qué me voy a fijar la próxima vez."],
    "s5p": "Un error es una regla que todavía estoy aprendiendo.",
    "voz": "Voz sintética Piper (es_ES).",
    "vozNav": "Voz del navegador.",
    "pe": "Luis Vilela Acuña · Dictados de Lengua Castellana · 6.º",
    "nav": "Pasos de la sesión", "anterior": "Paso anterior", "seguinte": "Paso siguiente",
  },
}

def esc(s): return html.escape(s, quote=True)

def marcar(texto, foco):
    """Devolve o texto en HTML coas palabras clave subliñadas e numeradas."""
    n = len(texto)
    owner = [set() for _ in range(n)]
    starts = {}
    for i, f in enumerate(foco, 1):
        p = f["p"]
        pat = re.escape(p)
        if p[0].isalnum(): pat = r"(?<!\w)" + pat
        if p[-1].isalnum(): pat = pat + r"(?!\w)"
        m = re.search(pat, texto)
        if not m: raise SystemExit(f"Non atopo a palabra clave: {p}")
        frase = " " in p
        for k in range(m.start(), m.end()):
            if not frase or not (texto[k].isalnum() or texto[k] == " "): owner[k].add(i)
        starts.setdefault(m.start(), []).append(i)
    out, cur = [], None
    for k, ch in enumerate(texto):
        st = bool(owner[k])
        if k in starts:
            if cur: out.append("</span>"); cur = None
            out.append("".join(f'<sup class="num" aria-hidden="true">{i}</sup>' for i in starts[k]))
        if st != bool(cur):
            if cur: out.append("</span>"); cur = None
            else: out.append('<span class="k">'); cur = True
        out.append("<br>" if ch == "\n" else esc(ch))
    if cur: out.append("</span>")
    return "".join(out)

def audio_b64(audiodir, ident, segs):
    files = [f"{ident}-completo.mp3"] + [f"{ident}-s{i:02d}.mp3" for i in range(1, len(segs) + 1)]
    paths = [os.path.join(audiodir, f) for f in files]
    if not all(os.path.exists(p) for p in paths): return None
    enc = lambda p: "data:audio/mpeg;base64," + base64.b64encode(open(p, "rb").read()).decode()
    return {"completo": enc(paths[0]), "seg": [enc(p) for p in paths[1:]]}

OPT = {"gl": ("Escolle o texto do ditado", "Opción", "O docente escolle un destes textos. Todos traballan a mesma regra."),
       "es": ("Elige el texto del dictado", "Opción", "El docente elige uno de estos textos. Todos trabajan la misma regla.")}

def build(src, audiodir, outdir):
    d = json.load(open(src, encoding="utf-8"))
    t = T[d["lang"]]
    base = f'{d["lang"]}-{d["num"]:02d}'
    titulo = d["titulo"].split("·")[1].strip()
    if "opcions" in d:
        ops = [dict(o, ident=base + o["letra"].lower()) for o in d["opcions"]]
    else:
        ops = [{"letra": "", "tipo": "", "titulo": titulo, "texto": d["texto"], "segmentos": d["segmentos"], "foco": d["foco"], "ident": base}]
    for o in ops: o["audio"] = audio_b64(audiodir, o["ident"], o["segmentos"])
    au = all(o["audio"] for o in ops)
    pasos = "".join(f'<li data-step="{i}"><span class="n">{i+1}</span><span class="lbl">{esc(p)}</span><span class="now">{t["agora"]}</span></li>' for i, p in enumerate(t["pasos"]))
    s1 = "".join(f"<li>{esc(x)}</li>" for x in t["s1l"])
    fix = "".join(f"<li>{esc(x)}</li>" for x in d["fixome"])
    s5 = "".join(f"<li>{esc(x)}</li>" for x in t["s5l"])
    corr = []
    for k, o in enumerate(ops):
        clave = "".join(
            f'<li><button class="kw" aria-expanded="false" aria-controls="kx{k}-{i}"><span class="kn">{i}</span>{esc(f.get("e", f["p"]))}</button>'
            f'<p class="kx" id="kx{k}-{i}" hidden>{esc(f["por"])}</p></li>' for i, f in enumerate(o["foco"], 1))
        corr.append(f'<div class="op" data-op="{k}"{" hidden" if k else ""}><p class="texto">{marcar(o["texto"], o["foco"])}</p>'
                    f'<h2>{esc(t["clave"])}</h2><p class="lead">{esc(t["claveP"])}</p><ul class="claves">{clave}</ul></div>')
    opsel = ""
    if len(ops) > 1:
        h, lab, lead = OPT[d["lang"]]
        btns = "".join(f'<button class="opt" data-op="{k}" aria-pressed="{"true" if k == 0 else "false"}">'
                       f'<span class="ol">{esc(o["letra"])}</span><span class="ot"><b>{esc(o["titulo"])}</b><span>{esc(o["tipo"])}</span></span></button>'
                       for k, o in enumerate(ops))
        opsel = f'<div class="card soc2"><h2>{esc(h)}</h2><p class="lead">{esc(lead)}</p><div class="opts" role="group" aria-label="{esc(h)}">{btns}</div></div>'
    data = {"lang": d["lang"], "ops": [{"seg": o["segmentos"], "texto": o["texto"].replace("\n", " "), "audio": o["audio"],
            "titulo": o["titulo"], "letra": o["letra"]} for o in ops], "t": t}
    voz = t["voz"] if au else t["vozNav"]
    page = TEMPLATE
    for k, v in {
        "LANG": d["lang"], "TITLE": esc(f'{t["tipo"]} {d["num"]} · {titulo}'), "TIPO": esc(t["tipo"]), "NUM": str(d["num"]),
        "TITULO": esc(titulo if len(ops) == 1 else f'{titulo} · {ops[0]["titulo"]}'), "UD": esc(d["ud"]), "SEMANA": esc(d["semana"]), "PASOS": pasos, "NAV": esc(t["nav"]),
        "A11Y": esc(t["a11y"]), "S1T": esc(t["s1t"]), "S1P": esc(t["s1p"]), "S1L": s1, "S2T": esc(t["s2t"]),
        "REGRA": esc(d["regra"]), "FIX": fix, "S3T": esc(t["s3t"]), "OPSEL": opsel, "CORR": "".join(corr),
        "L1": esc(t["l1"]), "L1P": esc(t["l1p"]), "L2": esc(t["l2"]), "L2P": esc(t["l2p"]), "L3": esc(t["l3"]), "L3P": esc(t["l3p"]),
        "PLAY": esc(t["play"]), "START": esc(t["start"]), "PAUSE": esc(t["pause"]), "REP": esc(t["rep"]),
        "PREV": esc(t["prev"]), "NEXT": esc(t["next"]), "TEMPO": esc(t["tempo"]), "TC": esc(t["tCurto"]),
        "TM": esc(t["tMedio"]), "TL": esc(t["tLongo"]), "VEL": esc(t["vel"]), "VLE": esc(t["vLenta"]), "VNO": esc(t["vNormal"]),
        "S4T": esc(t["s4t"]), "MODO1": esc(t["modo1"]), "MODO2": esc(t["modo2"]), "M1P": esc(t["m1p"]), "M2P": esc(t["m2p"]),
        "AMOSAR": esc(t["amosar"]), "S5T": esc(t["s5t"]), "S5L": s5, "S5P": esc(t["s5p"]), "VOZ": esc(voz), "PE": esc(t["pe"]),
        "ANT": esc(t["anterior"]), "SEG": esc(t["seguinte"]), "NSEG": str(len(ops[0]["segmentos"])), "ANACO": esc(t["anaco"]), "DE": esc(t["de"]),
        "DATA": json.dumps(data, ensure_ascii=False).replace("</", "<\\/"),
    }.items():
        page = page.replace("{{" + k + "}}", v)
    assert "{{" not in page, re.findall(r"\{\{\w+\}\}", page)
    os.makedirs(outdir, exist_ok=True)
    name = ("Ditado" if d["lang"] == "gl" else "Dictado") + f'{d["num"]:02d}_presentacion_{d["lang"]}.html'
    open(os.path.join(outdir, name), "w", encoding="utf-8").write(page)
    print("ok", name, round(len(page) / 1024), "KB", "audio" if au else "voz navegador", len(ops), "opcións")

TEMPLATE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "template.html"), encoding="utf-8").read()

if __name__ == "__main__":
    build(*sys.argv[1:4])
