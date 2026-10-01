// Siguiente índice con el foco atrapado en el diálogo; -1 si no hay elementos enfocables.
export function indiceFocoTab(actual: number, total: number, atras: boolean): number {
  if (total <= 0) return -1
  if (actual < 0) return atras ? total - 1 : 0
  return atras ? (actual - 1 + total) % total : (actual + 1) % total
}

interface ConEstilo { style: { overflow: string } }

// Bloqueo del scroll con conteo: restaura el valor original al liberar el último.
export function crearBloqueoScroll(el: ConEstilo): () => () => void {
  let activos = 0
  let previo = ''
  return () => {
    if (activos === 0) {
      previo = el.style.overflow
      el.style.overflow = 'hidden'
    }
    activos++
    let liberado = false
    return () => {
      if (liberado) return
      liberado = true
      activos--
      if (activos === 0) el.style.overflow = previo
    }
  }
}
