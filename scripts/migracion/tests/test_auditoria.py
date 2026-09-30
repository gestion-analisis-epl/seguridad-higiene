from auditoria import campos_auditoria

T = object()


def test_documento_nuevo_lleva_los_cuatro_campos():
    assert campos_auditoria(False, T) == {
        "creado_por": "migracion", "creado_en": T, "actualizado_por": "migracion", "actualizado_en": T,
    }


def test_documento_existente_solo_actualiza():
    assert campos_auditoria(True, T) == {"actualizado_por": "migracion", "actualizado_en": T}
