from datetime import datetime

from conciliar_dias import conciliar_dias


def acc(periodo, dias=0, tipo="laboral"):
    return {"fecha": datetime(2026, int(periodo[5:]), 1), "tipo": tipo, "periodo": periodo, "dias_incapacidad": dias}


def reg(ciudad, *accs):
    return {"colaborador": {"ciudad": ciudad}, "accidentes": list(accs)}


def test_un_solo_accidente_recibe_los_dias():
    a = acc("2026-03")
    r = conciliar_dias([reg("ciudad-a", a)], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 1, "dias": 9}})
    assert a["dias_incapacidad"] == 9
    assert r == {"dias_aplicados": 1, "dias_ambiguos": 0, "dias_sin_accidente": 0, "eventos_distintos": 0}


def test_varios_accidentes_no_se_tocan_y_se_reportan():
    a, b = acc("2026-03"), acc("2026-03")
    r = conciliar_dias([reg("ciudad-a", a), reg("ciudad-a", b)], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 2, "dias": 9}})
    assert a["dias_incapacidad"] == 0 and b["dias_incapacidad"] == 0
    assert r["dias_ambiguos"] == 1 and r["dias_aplicados"] == 0


def test_sin_accidente_se_reporta():
    r = conciliar_dias([reg("ciudad-a")], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 1, "dias": 4}})
    assert r["dias_sin_accidente"] == 1 and r["eventos_distintos"] == 1


def test_otra_ciudad_u_otro_periodo_no_cuentan():
    a = acc("2026-03")
    r = conciliar_dias(
        [reg("ciudad-b", a), reg("ciudad-a", acc("2025-03"))], "ciudad-a", 2026,
        {3: {"poblacion": 5, "eventos": 0, "dias": 0}},
    )
    assert a["dias_incapacidad"] == 0
    assert r == {"dias_aplicados": 0, "dias_ambiguos": 0, "dias_sin_accidente": 0, "eventos_distintos": 0}


def test_eventos_distintos_y_meses_vacios_ignorados():
    a = acc("2026-03")
    meses = {3: {"poblacion": 5, "eventos": 2, "dias": 0}, 4: {"poblacion": 0, "eventos": 0, "dias": 0}}
    r = conciliar_dias([reg("ciudad-a", a)], "ciudad-a", 2026, meses)
    assert r["eventos_distintos"] == 1 and r["dias_aplicados"] == 0


def test_solo_trayecto_no_recibe_dias_y_es_sin_accidente():
    t = acc("2026-03", tipo="trayecto")
    r = conciliar_dias([reg("ciudad-a", t)], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 1, "dias": 4}})
    assert t["dias_incapacidad"] == 0
    assert r == {"dias_aplicados": 0, "dias_ambiguos": 0, "dias_sin_accidente": 1, "eventos_distintos": 1}


def test_un_trayecto_y_un_laboral_los_dias_van_al_laboral():
    t, lab = acc("2026-03", tipo="trayecto"), acc("2026-03")
    r = conciliar_dias([reg("ciudad-a", t, lab)], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 1, "dias": 7}})
    assert lab["dias_incapacidad"] == 7 and t["dias_incapacidad"] == 0
    assert r == {"dias_aplicados": 1, "dias_ambiguos": 0, "dias_sin_accidente": 0, "eventos_distintos": 0}


def test_eventos_distintos_compara_solo_laborales():
    r = conciliar_dias([reg("ciudad-a", acc("2026-03", tipo="trayecto"))], "ciudad-a", 2026, {3: {"poblacion": 5, "eventos": 1, "dias": 0}})
    assert r["eventos_distintos"] == 1
