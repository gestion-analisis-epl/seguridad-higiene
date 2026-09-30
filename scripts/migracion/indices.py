from conciliar_dias import conciliar_dias

NO_DETERMINADA = "ciudad no determinada"
NO_RECONOCIDO = "formato no reconocido"


def resolver_ciudad(titulo, ciudades, forzada=None):
    if forzada is not None:
        return (forzada, None) if forzada in ciudades else (None, NO_DETERMINADA)
    coinciden = [c for c in ciudades if c and (titulo == c or titulo.endswith("-" + c))]
    return (coinciden[0], None) if len(coinciden) == 1 else (None, NO_DETERMINADA)


def construir_documentos(ciudad, anio, meses):
    return [
        {"id": f"{ciudad}_{anio}-{mes:02d}", "datos": {"ciudad": ciudad, "periodo": f"{anio}-{mes:02d}", "poblacion": v["poblacion"]}}
        for mes, v in sorted(meses.items()) if v["poblacion"] > 0
    ]


def procesar_indices(hojas, anio, catalogos, registros, ciudad_forzada=None):
    items = catalogos.get("ciudades", [])
    etiquetas = {i["valor"]: i["etiqueta"] for i in items}
    if ciudad_forzada is not None and sum(d is not None for _, d in hojas) != 1:
        raise ValueError("--indices-ciudad solo sirve cuando el Excel de índices tiene una sola hoja reconocida")
    documentos, leidas, omitidas = [], [], []
    for titulo, datos in hojas:
        if datos is None:
            omitidas.append({"hoja": titulo, "motivo": NO_RECONOCIDO})
            continue
        ciudad, motivo = resolver_ciudad(datos["titulo"], list(etiquetas), ciudad_forzada)
        if ciudad is None:
            omitidas.append({"hoja": titulo, "motivo": motivo})
            continue
        docs = construir_documentos(ciudad, anio, datos["meses"])
        documentos += docs
        leidas.append({
            "hoja": titulo, "ciudad": etiquetas[ciudad], "meses_importados": len(docs),
            **conciliar_dias(registros, ciudad, anio, datos["meses"]),
        })
    resumen = {"hojas_leidas": len(hojas), "hojas": leidas, "omitidas": omitidas}
    for clave in ("meses_importados", "dias_aplicados", "dias_ambiguos", "dias_sin_accidente", "eventos_distintos"):
        resumen[clave] = sum(h[clave] for h in leidas)
    return documentos, resumen
