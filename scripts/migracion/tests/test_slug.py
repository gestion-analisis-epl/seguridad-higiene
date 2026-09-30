import pytest
from slug import slug


@pytest.mark.parametrize("entrada,esperado", [
    ("Ciudad A", "ciudad-a"),
    ("Ciudad B-Área Uno", "ciudad-b-area-uno"),
    ("Ñandú", "nandu"),
    ("  CUAD-01 ", "cuad-01"),
    ("Línea de vida de doble punto", "linea-de-vida-de-doble-punto"),
])
def test_slug(entrada, esperado):
    assert slug(entrada) == esperado
