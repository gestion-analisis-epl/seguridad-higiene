import { filtroActivo, type Filtro } from './logica'
import type { ColumnaTabla } from './tipos'

export const SIN_OCULTAS: string[] = []

export const ocultasPorDefecto = <T,>(columnas: ColumnaTabla<T>[]): string[] =>
  columnas.slice(1).filter((c) => c.ocultaPorDefecto).map((c) => c.id)

export const ocultasValidas = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

// La primera columna identifica la fila y nunca se oculta; los ids que ya no existen se ignoran
export function idsOcultos<T>(columnas: ColumnaTabla<T>[], ocultas: string[]): Set<string> {
  const pedidas = new Set(ocultas)
  return new Set(columnas.slice(1).filter((c) => pedidas.has(c.id)).map((c) => c.id))
}

export function columnasMostradas<T>(columnas: ColumnaTabla<T>[], ocultas: string[]): ColumnaTabla<T>[] {
  const fuera = idsOcultos(columnas, ocultas)
  return fuera.size === 0 ? columnas : columnas.filter((c) => !fuera.has(c.id))
}

export const alternarOculta = (ocultas: string[], id: string): string[] =>
  ocultas.includes(id) ? ocultas.filter((o) => o !== id) : [...ocultas, id]

// Un filtro sobre una columna oculta sigue aplicado; se cuenta para avisarlo
export const filtrosEnOcultas = (filtros: Record<string, Filtro>, ocultos: Set<string>): number =>
  Object.entries(filtros).filter(([id, f]) => ocultos.has(id) && filtroActivo(f)).length
