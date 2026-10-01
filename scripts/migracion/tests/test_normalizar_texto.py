import pytest
from normalizar_texto import a_placa, a_titulo, cambios_de, limpiar_libre, limpiar_texto, planificar_cambios


def test_limpiar_texto():
    assert limpiar_texto("  hola \n\t  mundo  ") == "hola mundo"
    assert limpiar_texto("a\x00b​c﻿d\x07") == "abcd"
    assert limpiar_texto("a  b") == "a b"
    assert limpiar_texto("José") == "José"


def test_limpiar_libre():
    assert limpiar_libre("  a   b \r\n\r\n\r\n\r\n c​ \n") == "a b\n\nc"


@pytest.mark.parametrize("entrada,esperado", [
    ("JOSÉ  PÉREZ", "José Pérez"),
    ("maría de la luz", "María de la Luz"),
    ("DE LA CRUZ JUAN", "De la Cruz Juan"),
    ("o'brien", "O'Brien"),
    ("perez-lopez", "Perez-Lopez"),
    ("ana y pedro", "Ana y Pedro"),
    ("luis iii", "Luis III"),
    ("  ", ""),
])
def test_a_titulo(entrada, esperado):
    assert a_titulo(entrada) == esperado


def test_a_placa():
    assert a_placa(" abc 12 3 ") == "ABC123"


def test_cambios_de_ignora_no_texto_y_es_idempotente():
    doc = {"nombre": " ANA  DIAZ ", "activo": True, "cantidad": 2}
    cambios = cambios_de("colaboradores", doc)
    assert cambios == {"nombre": "Ana Diaz"}
    assert cambios_de("colaboradores", {**doc, **cambios}) == {}


def test_cambios_de_listas():
    doc = {"placa": " ab 1", "botiquin_items": [{"nombre": " gasa \n x", "cantidad": 1}, {"nombre": "ok"}]}
    assert cambios_de("vehiculos", doc) == {
        "placa": "AB1", "botiquin_items": [{"nombre": "gasa x", "cantidad": 1}, {"nombre": "ok"}],
    }


def test_planificar_cambios_solo_ids_y_conteos():
    docs = {"colaboradores": [{"id": "a", "nombre": "ana"}, {"id": "b", "nombre": "Bea"}], "otra": [{"id": "z", "x": " y"}]}
    plan = planificar_cambios(docs)
    assert plan == [("colaboradores", "a", {"nombre": "Ana"})]
