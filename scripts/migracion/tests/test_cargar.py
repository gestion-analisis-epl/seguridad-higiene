from datetime import datetime, timezone

import pytest

import cargar
from planificar import planificar

UTC = timezone.utc
AUDITORIA = {"creado_por": "migracion"}


class Snap:
    def __init__(self, id, datos):
        self.id, self._datos = id, datos

    def to_dict(self):
        return dict(self._datos)


class Ref:
    def __init__(self, coleccion, id):
        self.coleccion, self.id = coleccion, id


class Col:
    def __init__(self, db, nombre):
        self.db, self.nombre = db, nombre

    def document(self, id=None):
        if id is None:
            self.db.contador += 1
            id = f"auto{self.db.contador}"
        return Ref(self.nombre, id)

    def stream(self):
        return [Snap(i, d) for i, d in self.db.datos.get(self.nombre, {}).items()]


class AlreadyExists(Exception):
    pass


class Lote:
    def __init__(self, db):
        self.db, self.pendientes = db, []

    def create(self, ref, datos):
        self.pendientes.append((ref, datos))

    def commit(self):
        if self.db.limite is not None and self.db.escrituras + len(self.pendientes) > self.db.limite:
            raise RuntimeError("corte simulado")
        if any(ref.id in self.db.datos.get(ref.coleccion, {}) for ref, _ in self.pendientes):
            raise AlreadyExists("ya existe")
        for ref, datos in self.pendientes:
            self.db.datos.setdefault(ref.coleccion, {})[ref.id] = datos
        self.db.escrituras += len(self.pendientes)
        self.db.lotes.append(len(self.pendientes))


class Db:
    def __init__(self, datos=None):
        self.datos, self.lotes, self.contador = datos or {}, [], 0
        self.escrituras, self.limite = 0, None

    def collection(self, nombre):
        return Col(self, nombre)

    def batch(self):
        return Lote(self)


@pytest.fixture(autouse=True)
def auditoria(monkeypatch):
    monkeypatch.setattr(cargar, "_auditoria", lambda existe=False: AUDITORIA)


def dia(d):
    return datetime(2026, 8, d, 12, tzinfo=UTC)


def persona(nombre, ciudad="ciudad-a", n_caps=0, accs=()):
    caps = [{"norma": f"norma-{i}", "fecha": dia(1), "cumple": True} for i in range(n_caps)]
    return {
        "colaborador": {"nombre": nombre, "ciudad": ciudad, "activo": True},
        "capacitaciones": caps, "uniformes": [{"prenda": "botas", "talla": "26", "cantidad": 1, "fecha": dia(2)}],
        "epp": [], "accidentes": list(accs),
    }


def test_ejecutar_plan_escribe_los_indicadores_con_su_id_fijo():
    db = Db()
    indicador = {"id": "ciudad-a_2026-01", "datos": {"ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 4}}
    cargar.ejecutar_plan(db, {"personas": [], "indicadores": [indicador]})
    assert db.datos["indicadores_mensuales"] == {"ciudad-a_2026-01": {**indicador["datos"], **AUDITORIA}}


def test_hijos_de_una_persona_nueva_usan_el_id_nuevo_y_los_de_una_existente_el_suyo():
    db = Db({"colaboradores": {"c1": {"nombre": "Ana", "ciudad": "ciudad-a"}}})
    plan, _ = planificar([persona("Ana", n_caps=1), persona("Beto")], [], cargar.leer_existentes(db))
    cargar.ejecutar_plan(db, plan)
    nuevo = next(i for i in db.datos["colaboradores"] if i != "c1")
    assert db.datos["colaboradores"][nuevo]["nombre"] == "Beto" and len(db.datos["colaboradores"]) == 2
    (cap,) = db.datos["capacitaciones"].values()
    assert cap["colaborador_id"] == "c1" and cap["ciudad"] == "ciudad-a"
    unis = {u["colaborador_id"]: u for u in db.datos["entregas_uniforme"].values()}
    assert set(unis) == {"c1", nuevo} and unis[nuevo]["periodo"] == "2026-08"


def test_todo_documento_creado_lleva_auditoria_y_el_existente_no_cambia():
    original = {"nombre": "Ana", "ciudad": "ciudad-a", "activo": False}
    db = Db({"colaboradores": {"c1": dict(original)}})
    plan, _ = planificar([persona("Ana"), persona("Beto")], [], cargar.leer_existentes(db))
    cargar.ejecutar_plan(db, plan)
    assert db.datos["colaboradores"]["c1"] == original
    creados = [d for c, docs in db.datos.items() for i, d in docs.items() if i != "c1"]
    assert creados and all(d["creado_por"] == "migracion" for d in creados)


def test_lotes_de_a_400_escrituras_como_maximo():
    db = Db()
    plan, _ = planificar([persona(f"P{i}", n_caps=2) for i in range(250)], [], cargar.leer_existentes(db))
    cargar.ejecutar_plan(db, plan)
    assert sum(db.lotes) == 250 * 4 and max(db.lotes) == 400 and db.lotes[:-1] == [400] * (len(db.lotes) - 1)


def test_sin_nada_que_crear_no_escribe():
    db = Db()
    cargar.ejecutar_plan(db, {"personas": [], "indicadores": []})
    assert db.lotes == [] and db.datos == {}


def test_leer_existentes_devuelve_ids_y_fechas_python_de_las_seis_colecciones():
    class Marca(datetime):
        pass

    marca = Marca(2026, 8, 1, 12, tzinfo=UTC)
    db = Db({"capacitaciones": {"k1": {"norma": "n", "fecha": marca}}, "colaboradores": {"c1": {"nombre": "Ana"}}})
    ex = cargar.leer_existentes(db)
    assert set(ex) == {
        "colaboradores", "capacitaciones", "entregas_uniforme", "entregas_epp", "accidentes", "indicadores_mensuales",
    }
    assert ex["colaboradores"] == [{"id": "c1", "nombre": "Ana"}]
    (c,) = ex["capacitaciones"]
    assert c["id"] == "k1" and type(c["fecha"]) is datetime and c["fecha"] == marca
    assert ex["accidentes"] == []


def test_leer_existentes_no_escribe():
    db = Db({"colaboradores": {"c1": {"nombre": "Ana"}}})
    cargar.leer_existentes(db)
    assert db.lotes == []


def test_ejecutar_dos_veces_el_mismo_plan_no_crea_nada_la_segunda():
    db = Db({"colaboradores": {"c1": {"nombre": "Ana", "ciudad": "ciudad-a"}}})
    regs = [persona("Ana", n_caps=2), persona("Beto", accs=[{"fecha": dia(4), "tipo": "laboral", "periodo": "2026-08", "dias_incapacidad": 0}])]
    indicador = {"id": "ciudad-a_2026-01", "datos": {"ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 4}}
    plan, _ = planificar(regs, [indicador], cargar.leer_existentes(db))
    cargar.ejecutar_plan(db, plan)
    total = {c: len(d) for c, d in db.datos.items()}
    plan2, r2 = planificar(regs, [indicador], cargar.leer_existentes(db))
    assert plan2 == {"personas": [], "indicadores": []}
    cargar.ejecutar_plan(db, plan2)
    assert {c: len(d) for c, d in db.datos.items()} == total
    assert r2["colaboradores"] == {"nuevos": 0, "ya_existian": 2, "ambiguos": 0}


def test_un_indicador_capturado_despues_de_leer_no_se_sobrescribe():
    db = Db()
    indicador = {"id": "ciudad-a_2026-01", "datos": {"ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 4}}
    plan, _ = planificar([persona("Ana")], [indicador], cargar.leer_existentes(db))
    manual = {"ciudad": "ciudad-a", "periodo": "2026-01", "poblacion": 99}
    db.datos["indicadores_mensuales"] = {"ciudad-a_2026-01": dict(manual)}
    with pytest.raises(SystemExit) as e:
        cargar.ejecutar_plan(db, plan)
    assert "--simular" in str(e.value) and "sobrescribi" in str(e.value)
    assert db.datos["indicadores_mensuales"] == {"ciudad-a_2026-01": manual}
    assert db.datos.get("colaboradores") is None and db.lotes == []


def test_otros_errores_del_lote_no_se_disfrazan():
    db = Db()
    db.limite = 0
    plan, _ = planificar([persona("Ana")], [], cargar.leer_existentes(db))
    with pytest.raises(RuntimeError):
        cargar.ejecutar_plan(db, plan)


def test_corrida_interrumpida_entre_una_persona_nueva_y_sus_hijos_se_reanuda_sin_duplicados():
    db = Db()
    regs = [persona(f"P{i}", n_caps=1) for i in range(134)]
    plan, _ = planificar(regs, [], cargar.leer_existentes(db))
    db.limite = 400
    with pytest.raises(RuntimeError):
        cargar.ejecutar_plan(db, plan)
    assert db.escrituras == 400 and len(db.datos["colaboradores"]) == 134
    assert len(db.datos["capacitaciones"]) == 133 and len(db.datos["entregas_uniforme"]) == 133
    db.limite = None
    plan2, r2 = planificar(regs, [], cargar.leer_existentes(db))
    assert r2["colaboradores"] == {"nuevos": 0, "ya_existian": 134, "ambiguos": 0}
    assert r2["capacitaciones"]["nuevos"] == 1 and r2["entregas_uniforme"]["nuevos"] == 1
    cargar.ejecutar_plan(db, plan2)
    assert {c: len(d) for c, d in db.datos.items()} == {"colaboradores": 134, "capacitaciones": 134, "entregas_uniforme": 134}
    assert planificar(regs, [], cargar.leer_existentes(db))[0] == {"personas": [], "indicadores": []}
