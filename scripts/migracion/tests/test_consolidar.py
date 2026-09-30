from consolidar import consolidar


def reg(nombre, accidentes=(), marca="", ciudad="ciudad-a", caps=()):
    return {"colaborador": {"nombre": nombre, "marca": marca, "ciudad": ciudad, "area": None, "activo": True},
            "capacitaciones": list(caps), "uniformes": [], "epp": [], "accidentes": list(accidentes)}


def acc(fecha, tipo="laboral"):
    return {"fecha": fecha, "tipo": tipo, "periodo": "2026-08", "dias_incapacidad": 0}


def por_nombre(salida, nombre):
    return [r for r in salida if r["colaborador"]["nombre"].lower() == nombre.lower()]


def test_quien_esta_en_ambos_toma_el_bloque_reciente_y_sigue_activo():
    salida, resumen = consolidar([[reg("Ana", marca="ago")], [reg("ANA", marca="sep")]])
    (ana,) = salida
    assert ana["colaborador"]["marca"] == "sep" and ana["colaborador"]["activo"] is True
    assert resumen["fusionados"] == 1 and resumen["inactivos"] == 0


def test_quien_solo_esta_en_el_bloque_anterior_queda_inactivo_y_conserva_sus_registros():
    cap = {"norma": "n", "cumple": True}
    salida, resumen = consolidar([[reg("Ana"), reg("Beto", caps=[cap])], [reg("Ana")]])
    (beto,) = por_nombre(salida, "Beto")
    assert beto["colaborador"]["activo"] is False and beto["capacitaciones"] == [cap]
    assert por_nombre(salida, "Ana")[0]["colaborador"]["activo"] is True
    assert resumen["inactivos"] == 1


def test_clave_normalizada_por_acentos_y_distingue_ciudad():
    salida, _ = consolidar([[reg("José Pérez")], [reg("jose perez")]])
    assert len(salida) == 1
    salida, resumen = consolidar([[reg("Ana", ciudad="ciudad-a")], [reg("Ana", ciudad="ciudad-b")]])
    assert len(salida) == 2 and resumen["inactivos"] == 1


def test_une_accidentes_sin_duplicar():
    a = acc("d1")
    salida, _ = consolidar([[reg("Ana", [a])], [reg("Ana", [a, acc("d2")])]])
    assert [x["fecha"] for x in salida[0]["accidentes"]] == ["d1", "d2"]


def test_homonimos_en_el_mismo_bloque_se_conservan_y_se_cuentan():
    salida, resumen = consolidar([[reg("Ana"), reg("Ana")]])
    assert len(salida) == 2 and resumen["fusionados"] == 0 and resumen["homonimos"] == 1
