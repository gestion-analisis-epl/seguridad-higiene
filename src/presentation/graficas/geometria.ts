export function maximoRedondeado(valor: number): number {
  if (valor <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(valor))
  const f = valor / base
  const bonito = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return bonito * base
}

export function segmentosPolilinea(
  valores: (number | null)[], ancho: number, alto: number, max: number,
): string[] {
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0
  const segmentos: string[][] = [[]]
  valores.forEach((v, i) => {
    if (v === null) {
      if (segmentos[segmentos.length - 1].length) segmentos.push([])
      return
    }
    const y = max > 0 ? alto - (v / max) * alto : alto
    segmentos[segmentos.length - 1].push(`${(i * paso).toFixed(2)},${y.toFixed(2)}`)
  })
  return segmentos.filter((s) => s.length).map((s) => s.join(' '))
}

// Línea base de la etiqueta: sobre la línea, o debajo si saldría del viewBox por arriba.
export function baseEtiquetaReferencia(y: number, tamano: number): number {
  return y - 3 - tamano >= 0 ? y - 3 : y + tamano + 1
}
