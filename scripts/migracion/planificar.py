from collections import Counter
from datetime import date, datetime, timezone

from slug import slug

HIJOS = (
    ("capacitaciones", "capacitaciones"),
    ("uniformes", "entregas_uniforme"),
    ("epp", "entregas_epp"),
    ("accidentes", "accidentes"),
)
CAMPO_CLAVE = {"capacitaciones": "norma", "entregas_uniforme": "prenda", "entregas_epp": "tipo"}


def _texto(valor):
    return "" if valor is None else slug(valor)


def fecha_clave(valor):
    if valor is None:
        return None
    if isinstance(valor, datetime):
        if valor.tzinfo is not None:
            valor = valor.astimezone(timezone.utc)
        return valor.date().isoformat()
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, str) and len(valor) >= 10:
        return valor[:10]
    return repr(valor)


def clave_colaborador(datos):
    return (_texto(datos.get("nombre")), _texto(datos.get("ciudad")))


def clave_hijo(coleccion, datos):
    fecha = fecha_clave(datos.get("fecha"))
    if coleccion == "accidentes":
        return (datos.get("colaborador_id"), fecha, _texto(datos.get("tipo")))
    return (datos.get("colaborador_id"), _texto(datos.get(CAMPO_CLAVE[coleccion])), fecha)


def _indice_hijos(existentes):
    return {
        coleccion: {clave_hijo(coleccion, d) for d in existentes.get(coleccion, [])}
        for _, coleccion in HIJOS
    }


def _periodo(fecha):
    return f"{fecha.year}-{fecha.month:02d}" if fecha else None


def _con_periodo(coleccion, datos):
    if coleccion != "entregas_uniforme":
        return datos
    return {**datos, "periodo": _periodo(datos["fecha"])}


def _hijos_nuevos(registro, colaborador_id, vistos, resumen):
    nuevos = {}
    for campo, coleccion in HIJOS:
        for datos in registro[campo]:
            clave = clave_hijo(coleccion, {**datos, "colaborador_id": colaborador_id})
            if clave in vistos[coleccion]:
                resumen[coleccion]["duplicados_omitidos"] += 1
                if coleccion == "accidentes" and datos["dias_incapacidad"]:
                    resumen["dias_no_aplicados_por_existir"] += 1
                continue
            vistos[coleccion].add(clave)
            resumen[coleccion]["nuevos"] += 1
            nuevos.setdefault(coleccion, []).append(_con_periodo(coleccion, datos))
    return nuevos


def _resumen_inicial():
    resumen = {"colaboradores": {"nuevos": 0, "ya_existian": 0, "ambiguos": 0}}
    for _, coleccion in HIJOS:
        resumen[coleccion] = {"nuevos": 0, "duplicados_omitidos": 0}
    resumen["indicadores_mensuales"] = {"nuevos": 0, "existentes": 0}
    resumen["dias_no_aplicados_por_existir"] = 0
    resumen["hijos_omitidos_por_ambiguedad"] = 0
    return resumen


def _omitir_por_ambiguedad(registro, resumen):
    resumen["colaboradores"]["ambiguos"] += 1
    resumen["hijos_omitidos_por_ambiguedad"] += sum(len(registro[campo]) for campo, _ in HIJOS)


def _planificar_indicadores(indicadores, existentes, resumen):
    ids = {d["id"] for d in existentes.get("indicadores_mensuales", [])}
    pares = {(_texto(d.get("ciudad")), d.get("periodo")) for d in existentes.get("indicadores_mensuales", [])}
    nuevos = []
    for i in indicadores:
        if i["id"] in ids or (_texto(i["datos"]["ciudad"]), i["datos"]["periodo"]) in pares:
            resumen["indicadores_mensuales"]["existentes"] += 1
        else:
            nuevos.append(i)
            resumen["indicadores_mensuales"]["nuevos"] += 1
    return nuevos


def planificar(registros, indicadores, existentes):
    """Decide que crear sin tocar lo existente; devuelve (plan, resumen) sin hacer I/O."""
    resumen = _resumen_inicial()
    en_importacion = Counter(clave_colaborador(r["colaborador"]) for r in registros)
    en_destino = {}
    for c in existentes.get("colaboradores", []):
        en_destino.setdefault(clave_colaborador(c), []).append(c["id"])
    vistos, personas = _indice_hijos(existentes), []
    for r in registros:
        clave = clave_colaborador(r["colaborador"])
        ids = en_destino.get(clave, [])
        if en_importacion[clave] > 1 or len(ids) > 1:
            _omitir_por_ambiguedad(r, resumen)
            continue
        colaborador_id = ids[0] if ids else None
        resumen["colaboradores"]["ya_existian" if ids else "nuevos"] += 1
        hijos = _hijos_nuevos(r, colaborador_id or ("nuevo", len(personas)), vistos, resumen)
        if colaborador_id is None or hijos:
            personas.append({
                "colaborador": None if ids else r["colaborador"], "colaborador_id": colaborador_id,
                "ciudad": r["colaborador"]["ciudad"], "hijos": hijos,
            })
    return {"personas": personas, "indicadores": _planificar_indicadores(indicadores, existentes, resumen)}, resumen
