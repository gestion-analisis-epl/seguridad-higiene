from datetime import datetime, timezone

from leer_excel import EPP, OFF, PRENDAS
from transformar import transformar_fila

HOY = datetime(2026, 9, 30)
BASE = 5


def fila_vacia():
    return [None] * (BASE + 60)


def poner(fila, off, valor):
    fila[BASE + off] = valor


def fila_base(nombre="Ana Pérez", ciudad="Ciudad A"):
    f = fila_vacia()
    poner(f, 0, nombre)
    poner(f, OFF["ciudad"], ciudad)
    poner(f, OFF["linea"], "LINEA X")
    poner(f, OFF["ingreso"], datetime(2026, 5, 22))
    poner(f, OFF["cuadrilla"], "CUAD-01")
    return f


def test_colaborador_con_slugs_y_fecha_al_mediodia_utc():
    reg, avisos = transformar_fila(6, fila_base(), BASE, "Hoja A", HOY)
    c = reg["colaborador"]
    assert c["nombre"] == "Ana Pérez"
    assert (c["ciudad"], c["area"], c["linea_negocio"], c["cuadrilla"]) == ("ciudad-a", None, "linea-x", "cuad-01")
    assert c["fecha_ingreso"] == datetime(2026, 5, 22, 12, tzinfo=timezone.utc)
    assert avisos == []


def test_el_separador_divide_ciudad_y_area():
    reg, _ = transformar_fila(5, fila_base(ciudad="Ciudad B - Área Uno"), BASE, "H", HOY)
    assert (reg["colaborador"]["ciudad"], reg["colaborador"]["area"]) == ("ciudad-b", "area-uno")
    assert (reg["etiquetas"]["ciudad"], reg["etiquetas"]["area"]) == ("Ciudad B", "Área Uno")


def test_separador_configurable_y_nulo_no_divide():
    reg, _ = transformar_fila(5, fila_base(ciudad="Ciudad B/Area Uno"), BASE, "H", HOY, separador="/")
    assert (reg["colaborador"]["ciudad"], reg["colaborador"]["area"]) == ("ciudad-b", "area-uno")
    reg, _ = transformar_fila(5, fila_base(ciudad="Ciudad B-Area Uno"), BASE, "H", HOY, separador=None)
    assert (reg["colaborador"]["ciudad"], reg["colaborador"]["area"]) == ("ciudad-b-area-uno", None)
    assert reg["etiquetas"]["ciudad"] == "Ciudad B-Area Uno"


def test_sin_separador_en_el_texto_no_hay_area():
    reg, _ = transformar_fila(5, fila_base(ciudad="Ciudad A"), BASE, "H", HOY)
    assert reg["colaborador"]["area"] is None and reg["etiquetas"]["area"] is None


def test_etiquetas_conservan_el_texto_original_y_no_van_al_colaborador():
    f = fila_base()
    poner(f, OFF["norma"], " Norma Uno ")
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    assert reg["etiquetas"] == {
        "ciudad": "Ciudad A", "area": None, "linea_negocio": "LINEA X", "cuadrilla": "CUAD-01", "norma": "Norma Uno",
    }
    assert "etiquetas" not in reg["colaborador"]


def test_capacitacion_con_fecha_cumple_y_pendiente_no():
    f = fila_base()
    poner(f, OFF["norma"], "Norma Uno")
    poner(f, OFF["cap_fecha"], datetime(2026, 5, 4))
    poner(f, OFF["cap_venc"], datetime(2027, 5, 4))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    cap = reg["capacitaciones"][0]
    assert cap["norma"] == "norma-uno" and cap["cumple"] is True and cap["estado"] == "vigente"

    f = fila_base()
    poner(f, OFF["norma"], "Norma Uno")
    poner(f, OFF["cap_fecha"], "Pendiente")
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    cap = reg["capacitaciones"][0]
    assert cap["fecha"] is None and cap["cumple"] is False and cap["estado"] == "pendiente"


def test_uniformes_por_prenda():
    f = fila_base()
    for i, prenda in enumerate(PRENDAS):
        base = OFF["botas"] + 3 * i
        poner(f, base, 26 if prenda == "botas" else "G")
        poner(f, base + 1, 2.0)
        poner(f, base + 2, datetime(2026, 8, 31))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    assert [u["prenda"] for u in reg["uniformes"]] == PRENDAS
    assert reg["uniformes"][0]["talla"] == "26" and reg["uniformes"][0]["cantidad"] == 2
    assert reg["uniformes"][1]["talla"] == "G"


def test_epp_solo_si_hay_fecha_y_las_etiquetas_si_no_no_cuentan():
    f = fila_base()
    for i in range(len(EPP)):
        poner(f, OFF["guantes"] + 3 * i, "SI")
        poner(f, OFF["guantes"] + 3 * i + 1, "NO")
    poner(f, OFF["guantes"] + 2, datetime(2026, 8, 31))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    assert [e["tipo"] for e in reg["epp"]] == ["guantes"]
    assert reg["epp"][0]["entregado"] is True


def test_accidente_laboral_y_aviso_si_no_hay_tipo():
    f = fila_base()
    poner(f, OFF["acc_fecha"], datetime(2026, 8, 24))
    poner(f, OFF["acc_laboral"], "X")
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    a = reg["accidentes"][0]
    assert a["tipo"] == "laboral" and a["dias_incapacidad"] == 0 and a["periodo"] == "2026-08"

    f = fila_base()
    poner(f, OFF["acc_fecha"], datetime(2026, 8, 24))
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg["accidentes"] == [] and any("tipo" in a for a in avisos)


def test_fila_sin_nombre_se_descarta():
    f = fila_vacia()
    assert transformar_fila(6, f, BASE, "H", HOY) == (None, [])
    f = fila_vacia()
    poner(f, OFF["ciudad"], "Ciudad C")
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg is None and len(avisos) == 1


def test_fila_de_encabezado_con_personal_se_descarta():
    f = fila_base(nombre="Personal")
    assert transformar_fila(6, f, BASE, "H", HOY) == (None, [])


def test_fila_de_etiquetas_sin_nombre_ni_ciudad_se_descarta_en_silencio():
    f = fila_vacia()
    poner(f, OFF["botas"], "Botas")
    poner(f, OFF["guantes"], "Guantes")
    assert transformar_fila(6, f, BASE, "H", HOY) == (None, [])


def test_fila_sin_nombre_con_numeros_sigue_avisando():
    f = fila_vacia()
    poner(f, OFF["botas"] + 1, 2.0)
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg is None and len(avisos) == 1


def test_offsets_personalizados():
    off = {**OFF, "botas": OFF["botas"] + 1}
    f = fila_base()
    poner(f, off["botas"], 27)
    poner(f, off["botas"] + 1, 1)
    poner(f, off["botas"] + 2, datetime(2026, 8, 31))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY, off)
    assert reg["uniformes"][0]["talla"] == "27"


def test_fila_con_nombre_y_sin_ciudad_se_descarta_con_aviso():
    f = fila_base(ciudad=None)
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg is None and len(avisos) == 1 and "sin ciudad" in avisos[0]


def test_fila_con_nombre_y_sin_linea_de_negocio_se_descarta_con_aviso():
    f = fila_base()
    poner(f, OFF["linea"], None)
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg is None and len(avisos) == 1 and "sin linea de negocio" in avisos[0]
