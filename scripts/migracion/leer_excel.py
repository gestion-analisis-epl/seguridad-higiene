from slug import slug

# Desplazamientos respecto de la columna "Nombre" (0-indexados), medidos en las hojas de formato completo
OFF = {
    "linea": -4, "ciudad": -2, "ingreso": 2, "cuadrilla": 3, "norma": 4,
    "cap_fecha": 8, "cap_venc": 9, "botas": 11, "guantes": 24,
    "acc_fecha": 43, "acc_trayecto": 44, "acc_laboral": 45,
}
PRENDAS = ["botas", "playera", "camisola", "pantalon"]
EPP = [
    "guantes", "lentes", "casco",
    "linea-vida-doble-punto", "arnes-cuerpo-completo", "linea-posicionamiento",
]


def _texto(ws, fila, col):
    if fila < 1 or col < 0:
        return ""
    v = ws.cell(row=fila, column=col + 1).value
    return slug(v) if isinstance(v, str) else ""


ANCLAS = ("nombre", "personal")
ENCABEZADOS = set(ANCLAS)


def _columna(ws, fila, desde, clave):
    if fila < 1:
        return None
    for celda in ws[fila]:
        if celda.column - 1 >= desde and isinstance(celda.value, str) and slug(celda.value) == clave:
            return celda.column - 1
    return None


def _columnas_de_bloques(ws, fila, base):
    botas = _columna(ws, fila - 1, base, "botas")
    guantes = _columna(ws, fila - 1, botas + 1, "guantes") if botas is not None else None
    acc = _columna(ws, fila - 2, guantes + 1, "accidentes") if guantes is not None else None
    return (botas, guantes, acc) if acc is not None else None


def encontrar_layout(ws):
    for ancla in ANCLAS:
        for fila in range(1, 9):
            for celda in ws[fila]:
                if isinstance(celda.value, str) and slug(celda.value) == ancla:
                    base = celda.column - 1
                    if _columnas_de_bloques(ws, fila, base):
                        return fila, base
    return None


def _offset_por_encabezado(ws, fila, base, prefijo, defecto):
    for f in range(max(fila - 2, 1), fila + 1):
        for celda in ws[f]:
            col = celda.column - 1
            if col < base and isinstance(celda.value, str) and slug(celda.value).startswith(prefijo):
                return col - base
    return defecto


def offsets_de(ws, layout):
    fila, base = layout
    botas, guantes, acc = _columnas_de_bloques(ws, fila, base)
    off = dict(OFF)
    for clave in ("norma", "cap_fecha", "cap_venc", "botas"):
        off[clave] = OFF[clave] - OFF["botas"] + (botas - base)
    off["guantes"] = guantes - base
    off["linea"] = _offset_por_encabezado(ws, fila, base, "linea-de-negoc", OFF["linea"])
    off["ciudad"] = _offset_por_encabezado(ws, fila, base, "ciudad", OFF["ciudad"])
    for clave in ("acc_fecha", "acc_trayecto", "acc_laboral"):
        off[clave] = OFF[clave] - OFF["acc_fecha"] + (acc - base)
    return off


def es_encabezado(fila, base):
    v = fila[base] if base < len(fila) else None
    return isinstance(v, str) and slug(v) in ENCABEZADOS


def segmentar_bloques(filas, base):
    bloques, actual, vio_datos = [], [], False
    for n, fila in filas:
        if es_encabezado(fila, base):
            if vio_datos:
                bloques.append(actual)
                actual, vio_datos = [], False
            continue
        actual.append((n, fila))
        vio_datos = vio_datos or (base < len(fila) and isinstance(fila[base], str) and bool(fila[base].strip()))
    bloques.append(actual)
    return bloques


def filas_de_datos(ws, layout):
    fila_nombre, _ = layout
    return [
        (n, list(fila))
        for n, fila in enumerate(ws.iter_rows(min_row=fila_nombre + 1, values_only=True), start=fila_nombre + 1)
    ]


def es_hoja_de_colaboradores(titulo: str, excluir=()) -> bool:
    titulo = slug(titulo)
    return not any(slug(e) in titulo for e in excluir)
