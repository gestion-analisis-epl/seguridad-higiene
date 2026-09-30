from datetime import datetime, timezone

from configuracion import SEPARADOR_AREA
from leer_excel import ENCABEZADOS, EPP, OFF, PRENDAS
from slug import slug


def fecha_cal(valor):
    return datetime(valor.year, valor.month, valor.day, 12, tzinfo=timezone.utc)


def _fecha(valor):
    return fecha_cal(valor) if isinstance(valor, datetime) else None


def _celda(fila, base, off):
    i = base + off
    return fila[i] if 0 <= i < len(fila) else None


def _texto(valor):
    if valor is None:
        return None
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    limpio = str(valor).strip()
    return limpio or None


def _estado_capacitacion(fecha, venc, hoy):
    if fecha is None:
        return "pendiente"
    if venc is not None and venc.date() < hoy.date():
        return "vencido"
    return "vigente"


def _aviso_sin_nombre(numero, fila, base, hoja, off):
    con_datos = [v for i, v in enumerate(fila) if i != base and v is not None]
    if not con_datos:
        return []
    solo_etiquetas = all(isinstance(v, str) for v in con_datos) and _celda(fila, base, off["ciudad"]) is None
    return [] if solo_etiquetas else [f"{hoja} fila {numero}: fila con datos pero sin nombre"]


def _ciudad_y_area(texto, separador):
    if not texto or not separador or separador not in texto:
        return texto, None
    ciudad, area = (t.strip() for t in texto.split(separador, 1))
    return ciudad or None, area or None


def transformar_fila(numero, fila, base, hoja, hoy, off=OFF, separador=SEPARADOR_AREA):
    avisos = []
    nombre = _texto(_celda(fila, base, 0))
    if nombre and slug(nombre) in ENCABEZADOS:
        return None, []
    if not nombre:
        return None, _aviso_sin_nombre(numero, fila, base, hoja, off)

    texto_ciudad, texto_area = _ciudad_y_area(_texto(_celda(fila, base, off["ciudad"])), separador)
    texto_linea = _texto(_celda(fila, base, off["linea"]))
    ciudad, linea = slug(texto_ciudad or ""), slug(texto_linea or "")
    if not ciudad:
        return None, [f"{hoja} fila {numero}: sin ciudad, no se migró"]
    if not linea:
        return None, [f"{hoja} fila {numero}: sin linea de negocio, no se migró"]
    cuadrilla = _texto(_celda(fila, base, off["cuadrilla"]))
    norma = _texto(_celda(fila, base, off["norma"]))
    etiquetas = {
        "ciudad": texto_ciudad, "area": texto_area, "linea_negocio": texto_linea,
        "cuadrilla": cuadrilla, "norma": norma,
    }
    colaborador = {
        "nombre": nombre,
        "ciudad": ciudad,
        "area": slug(texto_area or "") or None,
        "linea_negocio": linea,
        "cuadrilla": slug(cuadrilla) if cuadrilla else None,
        "fecha_ingreso": _fecha(_celda(fila, base, off["ingreso"])),
        "activo": True,
    }

    capacitaciones = []
    if norma:
        f_cap_raw = _celda(fila, base, off["cap_fecha"])
        f_cap, venc = _fecha(f_cap_raw), _fecha(_celda(fila, base, off["cap_venc"]))
        capacitaciones.append({
            "norma": slug(norma), "cumple": f_cap is not None, "fecha": f_cap,
            "vencimiento": venc, "estado": _estado_capacitacion(f_cap, venc, hoy),
        })

    uniformes = []
    for i, prenda in enumerate(PRENDAS):
        col = off["botas"] + 3 * i
        talla = _texto(_celda(fila, base, col))
        if talla is None:
            continue
        cantidad = _celda(fila, base, col + 1)
        if not isinstance(cantidad, (int, float)):
            avisos.append(f"{hoja} fila {numero}: {prenda} sin cantidad, se asumió 1")
            cantidad = 1
        fecha = _fecha(_celda(fila, base, col + 2))
        if fecha is None:
            avisos.append(f"{hoja} fila {numero}: {prenda} sin fecha de entrega")
        uniformes.append({"prenda": prenda, "talla": talla, "cantidad": int(cantidad), "fecha": fecha})

    epp = []
    for i, tipo in enumerate(EPP):
        fecha = _fecha(_celda(fila, base, off["guantes"] + 3 * i + 2))
        if fecha is not None:
            epp.append({"tipo": tipo, "entregado": True, "fecha": fecha, "vencimiento": None})

    accidentes = []
    fecha_acc = _fecha(_celda(fila, base, off["acc_fecha"]))
    if fecha_acc is not None:
        trayecto = str(_celda(fila, base, off["acc_trayecto"]) or "").strip().lower() == "x"
        laboral = str(_celda(fila, base, off["acc_laboral"]) or "").strip().lower() == "x"
        if trayecto == laboral:
            avisos.append(f"{hoja} fila {numero}: accidente sin un tipo claro (trayecto o laboral), no se migró")
        else:
            accidentes.append({
                "fecha": fecha_acc, "tipo": "laboral" if laboral else "trayecto",
                "periodo": f"{fecha_acc.year}-{fecha_acc.month:02d}", "dias_incapacidad": 0,
            })

    return {
        "colaborador": colaborador, "capacitaciones": capacitaciones,
        "uniformes": uniformes, "epp": epp, "accidentes": accidentes, "etiquetas": etiquetas,
    }, avisos
