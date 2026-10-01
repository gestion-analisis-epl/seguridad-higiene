import { aTextoIso, formatearFecha } from '@/domain/fechas'
import { plegar, type OpcionSeleccion } from '../seleccion'

export type TipoColumna = 'texto' | 'categoria' | 'fecha' | 'numero' | 'booleano'
export type ValorCelda = string | number | boolean | Date | null | undefined
export type Direccion = 'asc' | 'desc'
export interface Orden { id: string; dir: Direccion }

export interface ColumnaLogica<T> {
  id: string
  tipo: TipoColumna
  valor: (fila: T) => ValorCelda
}

export type Filtro =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'categoria'; ocultos: string[] }
  | { tipo: 'fecha'; desde: string; hasta: string }
  | { tipo: 'numero'; min: number | null; max: number | null }
  | { tipo: 'booleano'; valor: boolean }

export const VACIO = '\u0000vacio'
export const ETIQUETA_VACIO = '(vacío)'
export const ANCHO_BASE = 160
export const ANCHO_MINIMO = 60
export const ANCHO_MAXIMO = 800
export const PASO_TECLADO = 10
export const PASO_TECLADO_GRANDE = 40

const esNulo = (v: ValorCelda): v is null | undefined =>
  v == null || (typeof v === 'number' && Number.isNaN(v)) || (v instanceof Date && Number.isNaN(v.getTime()))

const comoTexto = (v: ValorCelda): string => {
  if (esNulo(v)) return ''
  if (v instanceof Date) return aTextoIso(v)
  return typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)
}

export function textoVisible(v: ValorCelda): string {
  if (esNulo(v)) return ''
  if (v instanceof Date) return formatearFecha(v)
  return comoTexto(v)
}

export function compararValores(a: ValorCelda, b: ValorCelda, tipo: TipoColumna): number {
  if (tipo === 'numero') return Number(a) - Number(b)
  if (tipo === 'fecha') return Number(a instanceof Date ? a.getTime() : a) - Number(b instanceof Date ? b.getTime() : b)
  if (tipo === 'booleano') return Number(a) - Number(b)
  return comoTexto(a).localeCompare(comoTexto(b), 'es', { sensitivity: 'base' })
}

export function ordenarFilas<T>(filas: T[], columna: ColumnaLogica<T>, dir: Direccion): T[] {
  const signo = dir === 'asc' ? 1 : -1
  return filas
    .map((fila, indice) => ({ fila, indice, valor: columna.valor(fila) }))
    .sort((x, y) => {
      const nx = esNulo(x.valor), ny = esNulo(y.valor)
      if (nx || ny) return nx === ny ? x.indice - y.indice : nx ? 1 : -1
      return signo * compararValores(x.valor, y.valor, columna.tipo) || x.indice - y.indice
    })
    .map((e) => e.fila)
}

export function siguienteOrden(actual: Orden | null, id: string): Orden | null {
  if (!actual || actual.id !== id) return { id, dir: 'asc' }
  return actual.dir === 'asc' ? { id, dir: 'desc' } : null
}

export function filtroActivo(f: Filtro): boolean {
  switch (f.tipo) {
    case 'texto': return f.texto.trim() !== ''
    case 'categoria': return f.ocultos.length > 0
    case 'fecha': return f.desde !== '' || f.hasta !== ''
    case 'numero': return f.min !== null || f.max !== null
    case 'booleano': return true
  }
}

const claveCategoria = (v: ValorCelda) => {
  const t = comoTexto(v)
  return t === '' ? VACIO : t
}

export function pasaFiltro<T>(fila: T, columna: ColumnaLogica<T>, f: Filtro): boolean {
  const v = columna.valor(fila)
  switch (f.tipo) {
    case 'categoria': return !f.ocultos.includes(claveCategoria(v))
    case 'texto': return !esNulo(v) && plegar(comoTexto(v)).includes(plegar(f.texto.trim()))
    case 'booleano': return typeof v === 'boolean' && v === f.valor
    case 'numero': {
      if (esNulo(v) || typeof v !== 'number') return false
      return (f.min === null || v >= f.min) && (f.max === null || v <= f.max)
    }
    case 'fecha': {
      if (!(v instanceof Date) || esNulo(v)) return false
      const dia = aTextoIso(v)
      return (f.desde === '' || dia >= f.desde) && (f.hasta === '' || dia <= f.hasta)
    }
  }
}

export function aplicarFiltros<T>(
  filas: T[], columnas: ColumnaLogica<T>[], filtros: Record<string, Filtro>,
): T[] {
  const activos = columnas.filter((c) => filtros[c.id] && filtroActivo(filtros[c.id]))
  if (activos.length === 0) return filas
  return filas.filter((fila) => activos.every((c) => pasaFiltro(fila, c, filtros[c.id])))
}

export function opcionesDeCategoria<T>(filas: T[], columna: ColumnaLogica<T>): OpcionSeleccion[] {
  const valores = new Set<string>()
  for (const fila of filas) valores.add(claveCategoria(columna.valor(fila)))
  const presentes = Array.from(valores).filter((k) => k !== VACIO)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  const opciones = presentes.map((k) => ({ valor: k, etiqueta: k }))
  return valores.has(VACIO) ? [...opciones, { valor: VACIO, etiqueta: ETIQUETA_VACIO }] : opciones
}

export const clamparAncho = (ancho: number, minimo: number) =>
  Math.min(ANCHO_MAXIMO, Math.max(minimo, ancho))

export function anchosValidos(v: unknown): v is Record<string, number> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    && Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
}

export function anchosEfectivos(
  columnas: { id: string; anchoInicial?: number; anchoMinimo?: number }[],
  guardados: Record<string, number>,
): Record<string, number> {
  const salida: Record<string, number> = {}
  for (const c of columnas) {
    const minimo = c.anchoMinimo ?? ANCHO_MINIMO
    salida[c.id] = clamparAncho(guardados[c.id] ?? c.anchoInicial ?? ANCHO_BASE, minimo)
  }
  return salida
}
