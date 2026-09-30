def _accidentes_por_periodo(registros, ciudad, anio):
    por_periodo = {}
    for r in registros:
        if r["colaborador"]["ciudad"] != ciudad:
            continue
        for a in r["accidentes"]:
            if a["tipo"] == "laboral" and a["periodo"].startswith(f"{anio}-"):
                por_periodo.setdefault(a["periodo"], []).append(a)
    return por_periodo


def conciliar_dias(registros, ciudad, anio, meses):
    """Asigna los dias solo cuando hay un unico accidente laboral en la ciudad y el mes; modifica los registros."""
    cuenta = {"dias_aplicados": 0, "dias_ambiguos": 0, "dias_sin_accidente": 0, "eventos_distintos": 0}
    por_periodo = _accidentes_por_periodo(registros, ciudad, anio)
    for mes, v in sorted(meses.items()):
        if not (v["poblacion"] or v["eventos"] or v["dias"]):
            continue
        accidentes = por_periodo.get(f"{anio}-{mes:02d}", [])
        if v["eventos"] != len(accidentes):
            cuenta["eventos_distintos"] += 1
        if v["dias"] <= 0:
            continue
        if len(accidentes) == 1:
            accidentes[0]["dias_incapacidad"] = v["dias"]
            cuenta["dias_aplicados"] += 1
        elif accidentes:
            cuenta["dias_ambiguos"] += 1
        else:
            cuenta["dias_sin_accidente"] += 1
    return cuenta
