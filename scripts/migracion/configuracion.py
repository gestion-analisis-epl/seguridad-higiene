import re

SEPARADOR_AREA = "-"
CONFIG_DEFECTO = {"separador_area": SEPARADOR_AREA, "excluir_hojas": []}
DESTINO = (("proyecto", "--proyecto", "MIGRACION_PROYECTO"), ("base", "--base", "MIGRACION_BASE"))


def _valor(bandera, env, variable):
    valor = bandera if bandera is not None else env.get(variable)
    return valor.strip() if isinstance(valor, str) and valor.strip() else None


def resolver_destino(args, env):
    if args.commit and args.simular:
        raise ValueError("--simular y --commit no se pueden combinar")
    if not (args.commit or args.simular):
        return None
    modo = "--commit" if args.commit else "--simular"
    valores = {clave: _valor(getattr(args, clave), env, var) for clave, _, var in DESTINO}
    faltan = [f"{bandera} (o la variable {var})" for clave, bandera, var in DESTINO if valores[clave] is None]
    if faltan:
        raise ValueError(f"Para {modo} falta indicar: " + ", ".join(faltan))
    return valores["proyecto"], valores["base"]


def ruta_config(args, env):
    return _valor(args.config, env, "MIGRACION_CONFIG")


def _es_texto(v):
    return isinstance(v, str) and v.strip() != ""


def cargar_config(datos):
    if not isinstance(datos, dict):
        raise ValueError("La configuración debe ser un objeto JSON")
    extra = set(datos) - set(CONFIG_DEFECTO)
    if extra:
        raise ValueError("Claves desconocidas en la configuración: " + ", ".join(sorted(extra)))
    config = {**CONFIG_DEFECTO, **datos}
    if config["separador_area"] is not None and not _es_texto(config["separador_area"]):
        raise ValueError("separador_area debe ser un texto no vacío o null")
    hojas = config["excluir_hojas"]
    if not isinstance(hojas, list) or not all(_es_texto(h) for h in hojas):
        raise ValueError("excluir_hojas debe ser una lista de textos no vacíos")
    return {"separador_area": config["separador_area"], "excluir_hojas": list(hojas)}


def resolver_indices(args, env):
    ruta = _valor(args.indices, env, "MIGRACION_INDICES")
    if ruta is None:
        return None
    anio = _valor(args.indices_anio, env, "MIGRACION_INDICES_ANIO")
    if anio is None:
        raise ValueError("Con --indices falta --indices-anio (o la variable MIGRACION_INDICES_ANIO): el Excel de índices no trae el año")
    if not re.fullmatch(r"\d{4}", anio):
        raise ValueError(f"--indices-anio (o MIGRACION_INDICES_ANIO) debe tener 4 dígitos, por ejemplo 2026; llegó {anio!r}")
    return {"ruta": ruta, "anio": int(anio), "ciudad": _valor(args.indices_ciudad, env, "MIGRACION_INDICES_CIUDAD")}
