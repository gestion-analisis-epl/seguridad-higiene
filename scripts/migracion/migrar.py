import argparse
import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

from configuracion import CONFIG_DEFECTO, cargar_config, resolver_destino, resolver_indices, ruta_config
from consolidar import consolidar
from indices import procesar_indices
from leer_excel import encontrar_layout, es_hoja_de_colaboradores, filas_de_datos, offsets_de, segmentar_bloques
from leer_indices import leer_libro
from planificar import planificar
from transformar import transformar_fila


def _transformar_bloque(filas, base, off, hoja, hoy, separador):
    regs, avisos = [], []
    for numero, fila in filas:
        reg, av = transformar_fila(numero, fila, base, hoja, hoy, off, separador)
        avisos += av
        if reg is not None:
            regs.append(reg)
    return regs, avisos


CATALOGOS = (("ciudades", "ciudad"), ("areas", "area"), ("lineas_negocio", "linea_negocio"), ("cuadrillas", "cuadrilla"))


def _acumular_catalogos(catalogos, reg):
    c, e = reg["colaborador"], reg["etiquetas"]
    for id_cat, campo in CATALOGOS:
        if c[campo]:
            catalogos[id_cat].setdefault(c[campo], e[campo])
    for cap in reg["capacitaciones"]:
        catalogos["normas"].setdefault(cap["norma"], e["norma"])


def leer_todo(ruta, hoy, config=CONFIG_DEFECTO):
    wb = load_workbook(ruta, data_only=True)
    registros, reporte, catalogos = [], [], defaultdict(dict)
    for ws in wb:
        if not es_hoja_de_colaboradores(ws.title, config["excluir_hojas"]):
            continue
        layout = encontrar_layout(ws)
        if layout is None:
            reporte.append({"hoja": ws.title, "estado": "formato no reconocido, no se migró"})
            continue
        _, base = layout
        off = offsets_de(ws, layout)
        bloques, avisos = [], []
        for filas in segmentar_bloques(filas_de_datos(ws, layout), base):
            regs, av = _transformar_bloque(filas, base, off, ws.title, hoy, config["separador_area"])
            bloques.append(regs)
            avisos += av
        de_hoja, resumen = consolidar(bloques)
        if resumen["homonimos"]:
            avisos.append(f"{ws.title}: homonimo, {resumen['homonimos']} persona(s) con el mismo nombre, ciudad y area en un bloque")
        registros += de_hoja
        for reg in de_hoja:
            _acumular_catalogos(catalogos, reg)
        reporte.append({
            "hoja": ws.title, "colaboradores": len(de_hoja),
            "capacitaciones": sum(len(r["capacitaciones"]) for r in de_hoja),
            "uniformes": sum(len(r["uniformes"]) for r in de_hoja),
            "epp": sum(len(r["epp"]) for r in de_hoja),
            "accidentes": sum(len(r["accidentes"]) for r in de_hoja),
            "uniformes_sin_fecha": sum(u["fecha"] is None for r in de_hoja for u in r["uniformes"]),
            "bloques": sum(1 for b in bloques if b), "fusionados": resumen["fusionados"],
            "inactivos": resumen["inactivos"], "homonimos": resumen["homonimos"],
            "avisos": avisos,
        })
    encontrados = {k: [{"valor": v, "etiqueta": e} for v, e in d.items()] for k, d in catalogos.items()}
    return registros, reporte, encontrados


def _leer_config(ruta):
    if ruta is None:
        return CONFIG_DEFECTO
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise ValueError(f"No se pudo leer la configuración {ruta}: {e}")
    return cargar_config(datos)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--excel", required=True)
    modo = p.add_mutually_exclusive_group()
    modo.add_argument("--simular", action="store_true", help="lee Firestore sin escribir y cuenta lo que se crearía")
    modo.add_argument("--commit", action="store_true", help="crea en Firestore solo lo que no existe; sin banderas no hay red")
    p.add_argument("--proyecto", help="proyecto de Firebase; o la variable MIGRACION_PROYECTO")
    p.add_argument("--base", help="id de la base de Firestore; o la variable MIGRACION_BASE")
    p.add_argument("--config", help="archivo JSON opcional; o la variable MIGRACION_CONFIG")
    p.add_argument("--indices", help="Excel de índices (población y días); o la variable MIGRACION_INDICES")
    p.add_argument("--indices-anio", help="año de los índices, 4 dígitos, obligatorio con --indices; o MIGRACION_INDICES_ANIO")
    p.add_argument("--indices-ciudad", help="slug de la ciudad cuando el Excel de índices tiene una sola hoja")
    args = p.parse_args()
    try:
        destino = resolver_destino(args, os.environ)
        config = _leer_config(ruta_config(args, os.environ))
        indices = resolver_indices(args, os.environ)
    except ValueError as e:
        raise SystemExit(str(e))

    registros, reporte, catalogos = leer_todo(args.excel, datetime.now(), config)
    documentos = []
    if indices:
        try:
            documentos, resumen = procesar_indices(leer_libro(indices["ruta"]), indices["anio"], catalogos, registros, indices["ciudad"])
        except ValueError as e:
            raise SystemExit(str(e))
        reporte.append({"indices": resumen})
    db = None
    if destino:
        from cargar import conectar, leer_existentes
        db = conectar(*destino)
        existentes = leer_existentes(db)
    else:
        existentes = {}
    plan, resumen_plan = planificar(registros, documentos, existentes)
    reporte.append({"importacion": resumen_plan})
    salida = Path(__file__).parent / "salida"
    salida.mkdir(exist_ok=True)
    (salida / "reporte-migracion.json").write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.simular:
        c = resumen_plan["colaboradores"]
        print(f"COLABORADORES: nuevos {c['nuevos']}, ya existían {c['ya_existian']}, ambiguos {c['ambiguos']}")
        print("Compara 'nuevos' con las personas capturadas a mano: si es alto, hay nombres escritos distinto; corrígelos en la app y vuelve a simular.")
    for h in reporte:
        print(h)
    print(f"Total colaboradores: {len(registros)}")
    if indices:
        print({k: v for k, v in resumen.items() if k not in ("hojas", "omitidas")}, "omitidas:", [o["motivo"] for o in resumen["omitidas"]])
    print("Reporte en", salida / "reporte-migracion.json")

    if not args.commit:
        print("Simulación: no se escribió nada. Usa --commit para crear lo nuevo." if args.simular
              else "Modo prueba sin red: no se escribió nada. Usa --simular para comparar con Firestore.")
        return

    from cargar import ejecutar_plan, unir_catalogos
    ejecutar_plan(db, plan)
    unir_catalogos(db, catalogos)
    print("Migración completa.")


if __name__ == "__main__":
    main()
