from datetime import date, datetime, timedelta, timezone

from planificar import fecha_clave, planificar

UTC = timezone.utc


def dia(d, h=12):
    return datetime(2026, 8, d, h, tzinfo=UTC)


def reg(nombre, ciudad="ciudad-a", caps=(), unis=(), epps=(), accs=()):
    return {
        "colaborador": {"nombre": nombre, "ciudad": ciudad, "area": None, "activo": True},
        "capacitaciones": list(caps), "uniformes": list(unis), "epp": list(epps), "accidentes": list(accs),
    }


def cap(norma="norma-1", fecha=None):
    return {"norma": norma, "fecha": fecha or dia(1), "cumple": True}


def uni(prenda="botas", fecha=None):
    return {"prenda": prenda, "talla": "26", "cantidad": 1, "fecha": fecha or dia(2)}


def epp(tipo="guantes", fecha=None):
    return {"tipo": tipo, "entregado": True, "fecha": fecha or dia(3), "vencimiento": None}


def acc(fecha=None, tipo="laboral", dias=0):
    return {"fecha": fecha or dia(4), "tipo": tipo, "periodo": "2026-08", "dias_incapacidad": dias}


def vacios():
    return {
        "colaboradores": [], "capacitaciones": [], "entregas_uniforme": [], "entregas_epp": [],
        "accidentes": [], "indicadores_mensuales": [],
    }


def existentes(**coleccion):
    return {**vacios(), **coleccion}


def col(id, nombre, ciudad="ciudad-a"):
    return {"id": id, "nombre": nombre, "ciudad": ciudad}


def test_persona_nueva_se_crea_con_sus_hijos():
    plan, r = planificar([reg("Ana", caps=[cap()], unis=[uni()], epps=[epp()], accs=[acc()])], [], vacios())
    (p,) = plan["personas"]
    assert p["colaborador"]["nombre"] == "Ana" and p["colaborador_id"] is None
    assert {k: len(v) for k, v in p["hijos"].items()} == {
        "capacitaciones": 1, "entregas_uniforme": 1, "entregas_epp": 1, "accidentes": 1,
    }
    assert r["colaboradores"] == {"nuevos": 1, "ya_existian": 0, "ambiguos": 0}
    assert r["entregas_uniforme"] == {"nuevos": 1, "duplicados_omitidos": 0}


def test_hijos_iguales_de_dos_personas_nuevas_no_se_confunden():
    plan, r = planificar([reg("Ana", caps=[cap()]), reg("Beto", caps=[cap()])], [], vacios())
    assert [len(p["hijos"]["capacitaciones"]) for p in plan["personas"]] == [1, 1]
    assert r["capacitaciones"] == {"nuevos": 2, "duplicados_omitidos": 0}


def test_el_uniforme_lleva_su_periodo():
    plan, _ = planificar([reg("Ana", unis=[uni(fecha=dia(2)), {**uni("camisa"), "fecha": None}])], [], vacios())
    assert [u["periodo"] for u in plan["personas"][0]["hijos"]["entregas_uniforme"]] == ["2026-08", None]


def test_persona_existente_no_se_crea_y_los_hijos_usan_su_id():
    plan, r = planificar([reg("Ana", caps=[cap()])], [], existentes(colaboradores=[col("c1", "Ana")]))
    (p,) = plan["personas"]
    assert p["colaborador"] is None and p["colaborador_id"] == "c1"
    assert len(p["hijos"]["capacitaciones"]) == 1
    assert r["colaboradores"] == {"nuevos": 0, "ya_existian": 1, "ambiguos": 0}


def test_persona_existente_sin_hijos_nuevos_no_genera_nada():
    ex = existentes(
        colaboradores=[col("c1", "Ana")],
        capacitaciones=[{"id": "k", "colaborador_id": "c1", "norma": "norma-1", "fecha": dia(1)}],
    )
    plan, r = planificar([reg("Ana", caps=[cap()])], [], ex)
    assert plan["personas"] == []
    assert r["capacitaciones"] == {"nuevos": 0, "duplicados_omitidos": 1}


def test_persona_existente_con_algunos_hijos_presentes_crea_solo_los_que_faltan():
    ex = existentes(
        colaboradores=[col("c1", "Ana")],
        entregas_uniforme=[{"id": "u", "colaborador_id": "c1", "prenda": "botas", "fecha": dia(2)}],
        entregas_epp=[{"id": "e", "colaborador_id": "c1", "tipo": "guantes", "fecha": dia(3)}],
        accidentes=[{"id": "a", "colaborador_id": "c1", "fecha": dia(4), "tipo": "laboral"}],
    )
    regs = [reg(
        "Ana", caps=[cap()], unis=[uni(), uni("camisa")], epps=[epp(), epp("casco")],
        accs=[acc(), acc(dia(9), "trayecto")],
    )]
    plan, r = planificar(regs, [], ex)
    h = plan["personas"][0]["hijos"]
    assert [c["norma"] for c in h["capacitaciones"]] == ["norma-1"]
    assert [u["prenda"] for u in h["entregas_uniforme"]] == ["camisa"]
    assert [e["tipo"] for e in h["entregas_epp"]] == ["casco"]
    assert [a["tipo"] for a in h["accidentes"]] == ["trayecto"]
    assert r["entregas_uniforme"] == {"nuevos": 1, "duplicados_omitidos": 1}
    assert r["accidentes"] == {"nuevos": 1, "duplicados_omitidos": 1}


def test_hijos_de_otro_colaborador_no_cuentan_como_duplicado():
    ex = existentes(
        colaboradores=[col("c1", "Ana"), col("c2", "Beto")],
        capacitaciones=[{"id": "k", "colaborador_id": "c2", "norma": "norma-1", "fecha": dia(1)}],
    )
    plan, _ = planificar([reg("Ana", caps=[cap()])], [], ex)
    assert len(plan["personas"][0]["hijos"]["capacitaciones"]) == 1


def test_varios_existentes_con_la_misma_clave_es_ambiguo_y_se_omite_con_sus_hijos():
    ex = existentes(colaboradores=[col("c1", "Ana"), col("c2", "ANA")])
    plan, r = planificar([reg("Ana", caps=[cap()], accs=[acc(dias=3)])], [], ex)
    assert plan["personas"] == []
    assert r["colaboradores"] == {"nuevos": 0, "ya_existian": 0, "ambiguos": 1}
    assert r["capacitaciones"]["nuevos"] == 0 and r["accidentes"]["nuevos"] == 0
    assert r["dias_no_aplicados_por_existir"] == 0


def test_dos_filas_con_la_misma_clave_en_la_importacion_son_ambiguas():
    plan, r = planificar([reg("Ana", caps=[cap()]), reg("ANA", caps=[cap("norma-2")]), reg("Beto")], [], vacios())
    assert [p["colaborador"]["nombre"] for p in plan["personas"]] == ["Beto"]
    assert r["colaboradores"] == {"nuevos": 1, "ya_existian": 0, "ambiguos": 2}
    assert r["capacitaciones"]["nuevos"] == 0


def test_ambiguo_en_la_importacion_tambien_se_omite_si_ya_existe_uno():
    ex = existentes(colaboradores=[col("c1", "Ana")])
    plan, r = planificar([reg("Ana", caps=[cap()]), reg("Ana", caps=[cap("norma-2")])], [], ex)
    assert plan["personas"] == [] and r["colaboradores"]["ambiguos"] == 2


def test_acentos_y_mayusculas_coinciden():
    plan, r = planificar([reg("JOSÉ Pérez")], [], existentes(colaboradores=[col("c1", "jose perez")]))
    assert plan["personas"] == [] and r["colaboradores"]["ya_existian"] == 1


def test_misma_persona_en_otra_ciudad_es_otra_persona():
    plan, r = planificar([reg("Ana", ciudad="ciudad-b")], [], existentes(colaboradores=[col("c1", "Ana", "ciudad-a")]))
    assert plan["personas"][0]["colaborador"] is not None and r["colaboradores"]["nuevos"] == 1


def test_existente_sin_ciudad_no_coincide():
    plan, r = planificar([reg("Ana")], [], existentes(colaboradores=[{"id": "c1", "nombre": "Ana", "ciudad": None}]))
    assert r["colaboradores"]["nuevos"] == 1


def test_las_fechas_se_comparan_como_fecha_de_calendario():
    ex = existentes(
        colaboradores=[col("c1", "Ana")],
        capacitaciones=[{"id": "k", "colaborador_id": "c1", "norma": "norma-1", "fecha": dia(1, 3)}],
    )
    plan, r = planificar([reg("Ana", caps=[cap(fecha=dia(1, 12)), cap(fecha=dia(2, 12))])], [], ex)
    assert [c["fecha"].day for c in plan["personas"][0]["hijos"]["capacitaciones"]] == [2]
    assert r["capacitaciones"] == {"nuevos": 1, "duplicados_omitidos": 1}


def test_fecha_clave_acepta_fecha_datetime_texto_y_nula():
    assert fecha_clave(date(2026, 8, 1)) == fecha_clave(dia(1)) == fecha_clave("2026-08-01") == "2026-08-01"
    assert fecha_clave(None) is None
    assert fecha_clave(datetime(2026, 8, 1, 20, tzinfo=timezone(timedelta(hours=-6)))) == "2026-08-02"


def test_fecha_nula_cuenta_como_valor_de_la_clave():
    ex = existentes(
        colaboradores=[col("c1", "Ana")],
        entregas_uniforme=[{"id": "u", "colaborador_id": "c1", "prenda": "botas", "fecha": None}],
    )
    sin_fecha = {**uni(), "fecha": None}
    plan, r = planificar([reg("Ana", unis=[sin_fecha, {**sin_fecha, "prenda": "camisa"}])], [], ex)
    assert [u["prenda"] for u in plan["personas"][0]["hijos"]["entregas_uniforme"]] == ["camisa"]
    assert r["entregas_uniforme"]["duplicados_omitidos"] == 1


def test_dos_registros_iguales_dentro_de_la_importacion_no_se_duplican():
    plan, r = planificar([reg("Ana", unis=[{**uni(), "fecha": None}, {**uni(), "fecha": None}])], [], vacios())
    assert len(plan["personas"][0]["hijos"]["entregas_uniforme"]) == 1
    assert r["entregas_uniforme"] == {"nuevos": 1, "duplicados_omitidos": 1}


def ind(id="ciudad-a_2026-01", poblacion=4):
    ciudad, periodo = id.split("_")
    return {"id": id, "datos": {"ciudad": ciudad, "periodo": periodo, "poblacion": poblacion}}


def test_indicador_existente_se_omite_y_se_cuenta():
    ex = existentes(indicadores_mensuales=[
        {"id": "ciudad-a_2026-01", "ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 99},
    ])
    plan, r = planificar([], [ind(), ind("ciudad-a_2026-02")], ex)
    assert [i["id"] for i in plan["indicadores"]] == ["ciudad-a_2026-02"]
    assert r["indicadores_mensuales"] == {"nuevos": 1, "existentes": 1}


def test_indicador_con_otro_id_pero_misma_ciudad_y_periodo_se_omite():
    ex = existentes(indicadores_mensuales=[{"id": "manual", "ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 9}])
    plan, r = planificar([], [ind()], ex)
    assert plan["indicadores"] == [] and r["indicadores_mensuales"]["existentes"] == 1


def test_los_dias_no_se_aplican_si_el_accidente_ya_existe():
    ex = existentes(
        colaboradores=[col("c1", "Ana")],
        accidentes=[{"id": "a", "colaborador_id": "c1", "fecha": dia(4), "tipo": "laboral"}],
    )
    plan, r = planificar([reg("Ana", accs=[acc(dias=5), acc(dia(9), dias=3), acc(dia(10))])], [], ex)
    assert [a["fecha"].day for a in plan["personas"][0]["hijos"]["accidentes"]] == [9, 10]
    assert r["dias_no_aplicados_por_existir"] == 1


def test_el_plan_no_modifica_los_registros_de_entrada():
    regs = [reg("Ana", caps=[cap()])]
    antes = repr(regs)
    planificar(regs, [ind()], vacios())
    assert repr(regs) == antes


def aplicar(plan, ex):
    for p in plan["personas"]:
        cid = p["colaborador_id"]
        if p["colaborador"] is not None:
            cid = f"nuevo-{len(ex['colaboradores'])}"
            ex["colaboradores"].append({"id": cid, **p["colaborador"]})
        for coleccion, hijos in p["hijos"].items():
            ex[coleccion] += [{"id": "x", "colaborador_id": cid, **h} for h in hijos]
    ex["indicadores_mensuales"] += [{"id": i["id"], **i["datos"]} for i in plan["indicadores"]]


def test_idempotencia_aplicar_y_volver_a_planificar_no_crea_nada():
    regs = [
        reg("Ana", caps=[cap()], unis=[uni(), {**uni("camisa"), "fecha": None}], epps=[epp()], accs=[acc(dias=2)]),
        reg("Beto"),
    ]
    ex = existentes(colaboradores=[col("c9", "Ana")])
    plan, _ = planificar(regs, [ind()], ex)
    aplicar(plan, ex)
    plan2, r2 = planificar(regs, [ind()], ex)
    assert plan2 == {"personas": [], "indicadores": []}
    assert r2["colaboradores"] == {"nuevos": 0, "ya_existian": 2, "ambiguos": 0}
    assert all(r2[c]["nuevos"] == 0 for c in ("capacitaciones", "entregas_uniforme", "entregas_epp", "accidentes"))
    assert r2["indicadores_mensuales"] == {"nuevos": 0, "existentes": 1}
