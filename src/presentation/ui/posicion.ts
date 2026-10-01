export interface Rectangulo { left: number; right: number; top: number; bottom: number }

export interface EntradaPosicion {
  ancla: Rectangulo
  ancho: number
  altoMax: number
  margen: number
  vista: { ancho: number; alto: number }
}

export interface PosicionPanel {
  left: number
  ancho: number
  arriba: boolean
  top: number
  bottom: number
  maxHeight: number
}

const SEPARACION = 4
const ALTO_COMODO = 220

export function posicionarPanel({ ancla, ancho, altoMax, margen, vista }: EntradaPosicion): PosicionPanel {
  const anchoFinal = Math.max(0, Math.min(ancho, vista.ancho - margen * 2))
  const left = Math.max(margen, Math.min(ancla.left, vista.ancho - anchoFinal - margen))
  const debajo = vista.alto - ancla.bottom - margen - SEPARACION
  const encima = ancla.top - margen - SEPARACION
  const arriba = debajo < Math.min(altoMax, ALTO_COMODO) && encima > debajo
  return {
    left,
    ancho: anchoFinal,
    arriba,
    top: ancla.bottom + SEPARACION,
    bottom: vista.alto - ancla.top + SEPARACION,
    maxHeight: Math.max(120, Math.min(altoMax, arriba ? encima : debajo)),
  }
}
