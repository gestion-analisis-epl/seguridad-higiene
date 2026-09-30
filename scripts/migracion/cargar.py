from datetime import datetime

from auditoria import campos_auditoria

COLECCIONES = [
    "colaboradores", "capacitaciones", "entregas_uniforme", "entregas_epp", "accidentes",
]
COLECCION_INDICES = "indicadores_mensuales"
TAMANO_LOTE = 400
MENSAJE_EXISTE = (
    "Se detuvo: un documento que se iba a crear ya existe (alguien lo capturó después de la lectura). "
    "No se sobrescribió nada; los lotes anteriores ya se guardaron. Vuelve a correr --simular y luego --commit."
)


def conectar(proyecto: str, base: str):
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": proyecto})
    return firestore.client(database_id=base)


def _auditoria(existe=False):
    from firebase_admin import firestore
    return campos_auditoria(existe, firestore.SERVER_TIMESTAMP)


def _plano(valor):
    if isinstance(valor, datetime):
        return datetime(
            valor.year, valor.month, valor.day, valor.hour, valor.minute, valor.second, valor.microsecond, valor.tzinfo,
        )
    return valor


def leer_existentes(db):
    """Solo lectura: devuelve por coleccion los documentos con su id y valores de Python."""
    return {
        nombre: [
            {**{k: _plano(v) for k, v in snap.to_dict().items()}, "id": snap.id}
            for snap in db.collection(nombre).stream()
        ]
        for nombre in COLECCIONES + [COLECCION_INDICES]
    }


def ejecutar_plan(db, plan):
    """Solo crea documentos nuevos, en lotes atomicos de hasta 400 escrituras."""
    lote, pendientes = db.batch(), 0

    def confirmar():
        try:
            lote.commit()
        except Exception as e:
            if type(e).__name__ != "AlreadyExists":
                raise
            raise SystemExit(MENSAJE_EXISTE) from e

    def crear(ref, datos):
        nonlocal lote, pendientes
        lote.create(ref, {**datos, **_auditoria()})
        pendientes += 1
        if pendientes >= TAMANO_LOTE:
            confirmar()
            lote, pendientes = db.batch(), 0

    for persona in plan["personas"]:
        colaborador_id = persona["colaborador_id"]
        if persona["colaborador"] is not None:
            ref = db.collection("colaboradores").document()
            crear(ref, persona["colaborador"])
            colaborador_id = ref.id
        comun = {"colaborador_id": colaborador_id, "ciudad": persona["ciudad"]}
        for coleccion, hijos in persona["hijos"].items():
            for datos in hijos:
                crear(db.collection(coleccion).document(), {**comun, **datos})
    for i in plan["indicadores"]:
        crear(db.collection(COLECCION_INDICES).document(i["id"]), i["datos"])
    if pendientes:
        confirmar()


def unir_catalogos(db, encontrados: dict):
    for id_catalogo, items in encontrados.items():
        ref = db.collection("catalogos").document(id_catalogo)
        snap = ref.get()
        existentes = (snap.to_dict() or {}).get("items", []) if snap.exists else []
        vistos = {i["valor"] for i in existentes}
        nuevos = [i for i in items if i["valor"] not in vistos]
        ref.set({"items": existentes + nuevos, **_auditoria(snap.exists)}, merge=True)
