from datetime import datetime

import pytest
from openpyxl import Workbook

from indices import construir_documentos, procesar_indices, resolver_ciudad
from leer_indices import leer_libro
from test_leer_indices import hoja_indices

CIUDADES = [{"valor": "ciudad-a", "etiqueta": "Ciudad A"}, {"valor": "ciudad-b", "etiqueta": "Ciudad B"}]
CATALOGOS = {"ciudades": CIUDADES}


def test_ciudad_por_sufijo_del_titulo():
    assert resolver_ciudad("indices-de-lesion-ciudad-a", ["ciudad-a", "ciudad-b"]) == ("ciudad-a", None)


def test_ciudad_sin_coincidencia_o_ambigua():
    assert resolver_ciudad("indices-x", ["ciudad-a"]) == (None, "ciudad no determinada")
    assert resolver_ciudad("indices-ciudad-a", ["ciudad-a", "a"]) == (None, "ciudad no determinada")


def test_sufijo_exige_limite_de_palabra():
    assert resolver_ciudad("indices-ciudad-a", ["dad-a"]) == (None, "ciudad no determinada")


def test_ciudad_forzada_solo_si_esta_en_el_catalogo():
    assert resolver_ciudad("lo-que-sea", ["ciudad-a"], "ciudad-a") == ("ciudad-a", None)
    assert resolver_ciudad("lo-que-sea", ["ciudad-a"], "otra") == (None, "ciudad no determinada")


def test_documentos_omiten_poblacion_cero_y_usan_id_fijo():
    meses = {1: {"poblacion": 10, "eventos": 0, "dias": 0}, 2: {"poblacion": 0, "eventos": 0, "dias": 0}}
    assert construir_documentos("ciudad-a", 2026, meses) == [
        {"id": "ciudad-a_2026-01", "datos": {"ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 10}},
    ]


def libro(tmp_path, *hojas):
    wb = Workbook()
    wb.remove(wb.active)
    for titulo, kwargs in hojas:
        hoja_indices(wb.create_sheet(titulo), **kwargs)
    ruta = tmp_path / "i.xlsx"
    wb.save(ruta)
    return leer_libro(ruta)


def reg(ciudad, periodo):
    return {"colaborador": {"ciudad": ciudad}, "accidentes": [
        {"fecha": datetime(2026, 3, 1), "tipo": "laboral", "periodo": periodo, "dias_incapacidad": 0}]}


def test_procesa_libro_con_hojas_validas_omitidas_y_extra(tmp_path):
    hojas = libro(
        tmp_path,
        ("H1", dict(titulo="Indices Ciudad A", datos={3: [10, None, 1, 6], 4: [0, None, 0, 0]})),
        ("H2", dict(titulo="Indices Ciudad Z", datos={1: [5, None, 0, 0]})),
    )
    hojas.append(("Extra", None))
    registros = [reg("ciudad-a", "2026-03")]
    docs, resumen = procesar_indices(hojas, 2026, CATALOGOS, registros)
    assert [d["id"] for d in docs] == ["ciudad-a_2026-03"]
    assert registros[0]["accidentes"][0]["dias_incapacidad"] == 6
    assert resumen["hojas_leidas"] == 3
    assert resumen["meses_importados"] == 1 and resumen["dias_aplicados"] == 1
    assert resumen["hojas"] == [{"hoja": "H1", "ciudad": "Ciudad A", "meses_importados": 1, "dias_aplicados": 1,
                                 "dias_ambiguos": 0, "dias_sin_accidente": 0, "eventos_distintos": 0}]
    assert resumen["omitidas"] == [
        {"hoja": "H2", "motivo": "ciudad no determinada"}, {"hoja": "Extra", "motivo": "formato no reconocido"}]


def test_forzar_ciudad_con_varias_hojas_reconocidas_falla(tmp_path):
    hojas = libro(tmp_path, ("H1", {}), ("H2", {}))
    with pytest.raises(ValueError, match="--indices-ciudad"):
        procesar_indices(hojas, 2026, CATALOGOS, [], "ciudad-a")
