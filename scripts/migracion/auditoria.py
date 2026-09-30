USUARIO = "migracion"


def campos_auditoria(existe: bool, marca_tiempo) -> dict:
    actualiza = {"actualizado_por": USUARIO, "actualizado_en": marca_tiempo}
    return actualiza if existe else {"creado_por": USUARIO, "creado_en": marca_tiempo, **actualiza}
