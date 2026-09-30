from argparse import Namespace

import pytest

from configuracion import cargar_config, resolver_destino, resolver_indices, ruta_config


def args(commit=True, proyecto=None, base=None, config=None, simular=False):
    return Namespace(commit=commit, simular=simular, proyecto=proyecto, base=base, config=config)


ENV = {"MIGRACION_PROYECTO": "proyecto-env", "MIGRACION_BASE": "base-env"}


def test_la_bandera_gana_sobre_la_variable_de_entorno():
    assert resolver_destino(args(proyecto="p", base="b"), ENV) == ("p", "b")


def test_sin_bandera_usa_la_variable_de_entorno():
    assert resolver_destino(args(), ENV) == ("proyecto-env", "base-env")
    assert resolver_destino(args(base="b"), ENV) == ("proyecto-env", "b")


def test_commit_sin_destino_falla_nombrando_bandera_y_variable():
    with pytest.raises(ValueError) as e:
        resolver_destino(args(), {"MIGRACION_BASE": "  "})
    msg = str(e.value)
    assert "--proyecto" in msg and "MIGRACION_PROYECTO" in msg
    assert "--base" in msg and "MIGRACION_BASE" in msg


def test_commit_con_solo_la_base_faltante_solo_la_nombra():
    with pytest.raises(ValueError) as e:
        resolver_destino(args(proyecto="p"), {})
    assert "--base" in str(e.value) and "--proyecto" not in str(e.value)


def test_modo_prueba_no_requiere_destino():
    assert resolver_destino(args(commit=False), {}) is None


def test_simular_exige_el_destino_igual_que_commit():
    assert resolver_destino(args(commit=False, simular=True, proyecto="p", base="b"), {}) == ("p", "b")
    with pytest.raises(ValueError) as e:
        resolver_destino(args(commit=False, simular=True), {})
    assert "--simular" in str(e.value) and "MIGRACION_PROYECTO" in str(e.value)


def test_simular_y_commit_no_se_combinan():
    with pytest.raises(ValueError):
        resolver_destino(args(commit=True, simular=True, proyecto="p", base="b"), {})


def test_ruta_config_bandera_luego_entorno():
    assert ruta_config(args(config="a.json"), {"MIGRACION_CONFIG": "b.json"}) == "a.json"
    assert ruta_config(args(), {"MIGRACION_CONFIG": "b.json"}) == "b.json"
    assert ruta_config(args(), {}) is None


def test_config_vacia_usa_los_predeterminados():
    assert cargar_config({}) == {"separador_area": "-", "excluir_hojas": []}


def test_config_valida():
    assert cargar_config({"separador_area": None, "excluir_hojas": ["Hoja X"]}) == {
        "separador_area": None, "excluir_hojas": ["Hoja X"],
    }
    assert cargar_config({"separador_area": "/"})["separador_area"] == "/"


@pytest.mark.parametrize("datos", [
    [],
    {"separador_area": ""},
    {"separador_area": 3},
    {"excluir_hojas": "hoja"},
    {"excluir_hojas": ["", "x"]},
    {"excluir_hojas": [1]},
    {"otra_clave": 1},
])
def test_config_invalida(datos):
    with pytest.raises(ValueError):
        cargar_config(datos)


def args_indices(indices=None, anio=None, ciudad=None):
    return Namespace(indices=indices, indices_anio=anio, indices_ciudad=ciudad)


def test_sin_indices_no_hay_importacion():
    assert resolver_indices(args_indices(), {}) is None


def test_indices_sin_anio_falla_nombrando_bandera_y_variable():
    with pytest.raises(ValueError) as e:
        resolver_indices(args_indices("r.xlsx"), {})
    assert "--indices-anio" in str(e.value) and "MIGRACION_INDICES_ANIO" in str(e.value)


@pytest.mark.parametrize("anio", ["26", "20266", "anio", "2026a"])
def test_el_anio_debe_tener_cuatro_digitos(anio):
    with pytest.raises(ValueError, match="4 dígitos"):
        resolver_indices(args_indices("r.xlsx", anio), {})


def test_indices_resuelve_bandera_y_variables():
    env = {"MIGRACION_INDICES": "e.xlsx", "MIGRACION_INDICES_ANIO": "2025"}
    assert resolver_indices(args_indices(), env) == {"ruta": "e.xlsx", "anio": 2025, "ciudad": None}
    assert resolver_indices(args_indices("r.xlsx", "2026", "ciudad-a"), env) == {"ruta": "r.xlsx", "anio": 2026, "ciudad": "ciudad-a"}
