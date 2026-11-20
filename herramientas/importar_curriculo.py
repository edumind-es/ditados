#!/usr/bin/env python3
"""Convierte los currículos de Galicia (hojas de cálculo) en contenido/curriculo/<lengua>.json.

Solo hace falta volver a ejecutarlo si cambian las hojas de origen: el JSON resultante es lo que usa el programa
y está versionado. Necesita openpyxl (no es una dependencia del proyecto).

Uso:
  python3 herramientas/importar_curriculo.py es --primaria Matriz_curricular_LENGUA_CASTELLANA.xlsx \
      --eso iDoceo_..._1_.xlsx iDoceo_..._2_.xlsx iDoceo_..._3_.xlsx iDoceo_..._4_.xlsx

Orígenes:
  - Primaria: matriz curricular por curso (Decreto 155/2022, DOG 183, 26/09/2022, anexo II). Los contenidos no llevan
    código oficial: aquí se numeran por su orden dentro del bloque (B6.3 = tercer contenido del bloque 6).
  - ESO: exportación para iDoceo, una hoja por curso (Decreto 156/2022), con filas de tipo 3 (criterios) y 4 (contenidos,
    enlazados a sus criterios). Las cabeceras de bloque («B2») no son contenidos.
"""
import argparse
import json
import os
import re

import openpyxl

LENGUAS = {"es": "Lengua Castellana y Literatura", "gl": "Lingua Galega e Literatura"}


def limpio(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()


def n_bloque(titulo):
    m = re.match(r"Bloque (\d+)", titulo)
    return "B" + m.group(1) if m else None


def primaria(ruta):
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    cursos = {}
    por_curso = {}
    for curso, bloque, sub, texto in list(wb["Contenidos por bloque"].iter_rows(values_only=True))[1:]:
        por_curso.setdefault(limpio(curso)[0], []).append((limpio(bloque), limpio(sub), limpio(texto)))
    for n in "123456":
        bloques, criterios, contenidos, cuenta = {}, {}, {}, {}
        for f in list(wb[f"Matriz {n}º"].iter_rows(values_only=True))[1:]:
            if not f[5]:
                continue
            b = n_bloque(limpio(f[4]))
            bloques[b] = limpio(f[4])
            criterios[limpio(f[5])] = {"texto": limpio(f[6]), "objetivo": limpio(f[2]), "bloque": b}
        for bloque, sub, texto in por_curso[n]:
            b = n_bloque(bloque)
            bloques.setdefault(b, bloque)
            cuenta[b] = cuenta.get(b, 0) + 1
            c = {"texto": texto, "bloque": b}
            if sub:
                c["subbloque"] = sub
            contenidos[f"{b}.{cuenta[b]}"] = c
        cursos[n] = {"norma": "Decreto 155/2022 (DOG 183, 26/09/2022)", "codigos_contenido_oficiales": False,
                     "bloques": dict(sorted(bloques.items())), "criterios": criterios, "contenidos": contenidos}
    return cursos


def eso(ruta):
    filas = [list(f) for f in openpyxl.load_workbook(ruta, read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True)][1:]
    des = next(i for i, c in enumerate(filas[0]) if c is not None)   # la primera columna viene vacía
    bloques, criterios, contenidos = {}, {}, {}
    for f in filas:
        tipo, cod, enlaces, titulo = (limpio(c) for c in f[des:des + 4])
        if tipo == "3":
            criterios[cod] = {"texto": titulo, "objetivo": enlaces, "bloque": "B" + re.match(r"CE(\d+)", cod).group(1)}
        elif tipo == "4":
            if "." not in cod:
                bloques[cod] = titulo
            else:
                contenidos[cod] = {"texto": re.sub(r"^[–-]\s*", "", titulo), "bloque": cod.split(".")[0],
                                   "criterios": [c.strip() for c in enlaces.split(",") if c.strip() and c.strip() != "None"]}
    return {"norma": "Decreto 156/2022 (DOG 183, 26/09/2022)", "codigos_contenido_oficiales": True,
            "bloques": bloques, "criterios": criterios, "contenidos": contenidos}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("lengua", choices=sorted(LENGUAS))
    p.add_argument("--primaria", required=True)
    p.add_argument("--eso", nargs=4, required=True, metavar="XLSX", help="los cuatro cursos, en orden")
    p.add_argument("--salida", default=os.path.join(os.path.dirname(__file__), "..", "contenido", "curriculo"))
    a = p.parse_args()
    cursos = primaria(a.primaria)
    for i, ruta in enumerate(a.eso, start=1):
        cursos[f"{i}eso"] = eso(ruta)
    datos = {
        "_comentario": "Currículo de Galicia por curso: bloques, criterios de evaluación y contenidos. Generado por herramientas/importar_curriculo.py; no se edita a mano. En primaria los códigos de contenido (B6.3) son el orden dentro del bloque, no un código oficial.",
        "area": LENGUAS[a.lengua], "cursos": cursos,
    }
    destino = os.path.join(a.salida, a.lengua + ".json")
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
        f.write("\n")
    for k, c in cursos.items():
        print(a.lengua, k, len(c["bloques"]), "bloques ·", len(c["criterios"]), "criterios ·", len(c["contenidos"]), "contenidos")


if __name__ == "__main__":
    main()
