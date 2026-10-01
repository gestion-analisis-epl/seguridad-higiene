import argparse
import os
import re
import unicodedata
from collections import Counter

from configuracion import resolver_destino

ANCHO_CERO = re.compile("[​-‍⁠﻿­]")
CONTROLES = re.compile("[\x00-\x08\x0b-\x1f\x7f-\x9f]")
PARTICULAS = {"de", "del", "la", "las", "los", "y", "e"}
ROMANOS = {"ii", "iii", "iv"}
TAMANO_LOTE = 400

# Reglas por coleccion: campo -> formato; las listas anidan sus subcampos.
REGLAS = {
    "colaboradores": {"nombre": "titulo"},
    "entregas_uniforme": {"talla": "texto"},
    "oficinas_equipo": {"detalle": "libre", "items": {"nombre": "texto"}},
    "vehiculos": {"placa": "placa", "botiquin_items": {"nombre": "texto"}},
}


def limpiar_texto(s):
    s = ANCHO_CERO.sub("", unicodedata.normalize("NFC", s))
    return CONTROLES.sub("", re.sub(r"\s+", " ", s)).strip()


def limpiar_libre(s):
    s = ANCHO_CERO.sub("", unicodedata.normalize("NFC", s))
    s = CONTROLES.sub("", re.sub(r"\r\n?", "\n", s))
    s = re.sub(r"[^\S\n]+", " ", s)
    return re.sub(r"\n{3,}", "\n\n", re.sub(r" ?\n ?", "\n", s)).strip()


def _capitalizar(p):
    return re.sub(r"(^|[-'’])([^-'’])", lambda m: m.group(1) + m.group(2).upper(), p.lower())


def a_titulo(s):
    palabras = [p for p in limpiar_texto(s).split(" ") if p]
    salida = []
    for i, p in enumerate(palabras):
        bajo = p.lower()
        if bajo in ROMANOS:
            salida.append(p.upper())
        elif i > 0 and bajo in PARTICULAS:
            salida.append(bajo)
        else:
            salida.append(_capitalizar(p))
    return " ".join(salida)


def a_placa(s):
    return re.sub(r"\s", "", limpiar_texto(s)).upper()


FORMATOS = {"titulo": a_titulo, "placa": a_placa, "libre": limpiar_libre, "texto": limpiar_texto}


def _sanear(reglas, doc):
    salida = dict(doc)
    for campo, regla in reglas.items():
        v = doc.get(campo)
        if isinstance(regla, dict) and isinstance(v, list):
            salida[campo] = [_sanear(regla, i) if isinstance(i, dict) else i for i in v]
        elif isinstance(regla, str) and isinstance(v, str):
            salida[campo] = FORMATOS[regla](v)
    return salida


def cambios_de(coleccion, doc):
    """Campos que cambian al sanear un documento; vacio si ya esta limpio."""
    nuevo = _sanear(REGLAS.get(coleccion, {}), doc)
    return {k: v for k, v in nuevo.items() if doc.get(k) != v}


def planificar_cambios(docs_por_coleccion):
    plan = []
    for coleccion in REGLAS:
        for doc in docs_por_coleccion.get(coleccion, []):
            cambios = cambios_de(coleccion, doc)
            if cambios:
                plan.append((coleccion, doc["id"], cambios))
    return plan


def leer_docs(db):
    return {c: [{**s.to_dict(), "id": s.id} for s in db.collection(c).stream()] for c in REGLAS}


def aplicar(db, plan):
    from firebase_admin import firestore
    lote, n = db.batch(), 0
    for coleccion, id_doc, cambios in plan:
        lote.update(db.collection(coleccion).document(id_doc), {**cambios, "actualizado_por": "migracion", "actualizado_en": firestore.SERVER_TIMESTAMP})
        n += 1
        if n >= TAMANO_LOTE:
            lote.commit()
            lote, n = db.batch(), 0
    if n:
        lote.commit()


def resumen(plan):
    por_coleccion = Counter(c for c, _, _ in plan)
    lineas = [f"{c}: {n} documento(s) cambiarian" for c, n in sorted(por_coleccion.items())]
    return lineas + [f"total: {len(plan)}"] + [f"  {c}/{i}" for c, i, _ in plan]


def main(argv=None):
    p = argparse.ArgumentParser(description="Normaliza texto de documentos existentes; idempotente.")
    modo = p.add_mutually_exclusive_group()
    modo.add_argument("--simular", action="store_true", help="solo lectura: cuenta y lista ids")
    modo.add_argument("--commit", action="store_true", help="actualiza los documentos que cambian")
    p.add_argument("--proyecto", help="proyecto de Firebase; o la variable MIGRACION_PROYECTO")
    p.add_argument("--base", help="id de la base de Firestore; o la variable MIGRACION_BASE")
    args = p.parse_args(argv)
    try:
        destino = resolver_destino(args, os.environ)
    except ValueError as e:
        raise SystemExit(str(e))
    if destino is None:
        raise SystemExit("Indica --simular o --commit")
    from cargar import conectar
    db = conectar(*destino)
    plan = planificar_cambios(leer_docs(db))
    print("\n".join(resumen(plan)))
    if args.commit and plan:
        aplicar(db, plan)
        print("Actualizado.")


if __name__ == "__main__":
    main()
