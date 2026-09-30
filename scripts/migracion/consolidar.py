from slug import slug


def _clave(reg, vistos):
    c = reg["colaborador"]
    base = (slug(c["nombre"]), c.get("ciudad"), c.get("area"))
    vistos[base] = vistos.get(base, 0) + 1
    return base + (vistos[base],), vistos[base] > 1


def _unir_accidentes(previos, nuevos):
    vistos = {(a["fecha"], a["tipo"]) for a in nuevos}
    return nuevos + [a for a in previos if (a["fecha"], a["tipo"]) not in vistos]


def _inactivar(reg):
    return {**reg, "colaborador": {**reg["colaborador"], "activo": False}}


def consolidar(bloques):
    por_clave, ultimo_bloque = {}, {}
    fusionados = homonimos = 0
    for i, bloque in enumerate(bloques):
        vistos = {}
        for reg in bloque:
            clave, repetida = _clave(reg, vistos)
            homonimos += repetida
            previo = por_clave.get(clave)
            if previo is not None:
                fusionados += 1
                reg = {**reg, "accidentes": _unir_accidentes(previo["accidentes"], reg["accidentes"])}
            por_clave[clave], ultimo_bloque[clave] = reg, i
    reciente = max((i for i, b in enumerate(bloques) if b), default=0)
    salida, inactivos = [], 0
    for clave, reg in por_clave.items():
        if ultimo_bloque[clave] < reciente:
            reg, inactivos = _inactivar(reg), inactivos + 1
        salida.append(reg)
    return salida, {"fusionados": fusionados, "inactivos": inactivos, "homonimos": homonimos}
