import type { EstadoGuardado } from './estado'
import { filtroActivo, type Filtro } from './logica'

export type Filtros = Record<string, Filtro>

const SIN_FILTROS: Filtros = {}

// Los filtros inactivos y el orden de los ocultos no cuentan como diferencia
const firma = (f: Filtro): string =>
  JSON.stringify(f.tipo === 'categoria' || (f.tipo === 'texto' && f.ocultos)
    ? { ...f, ocultos: [...(f.ocultos ?? [])].sort() } : f)

export const mismoFiltro = (a: Filtro, b: Filtro) => firma(a) === firma(b)

export function mismosFiltros(a: Filtros, b: Filtros): boolean {
  const activos = (x: Filtros) => Object.entries(x).filter(([, f]) => filtroActivo(f)).sort(([i], [j]) => (i < j ? -1 : 1))
  const x = activos(a), y = activos(b)
  return x.length === y.length && x.every(([id, f], i) => id === y[i][0] && mismoFiltro(f, y[i][1]))
}

export const difiereDeIniciales = (filtros: Filtros, iniciales?: Filtros) =>
  !mismosFiltros(filtros, iniciales ?? SIN_FILTROS)

export const filtrosRestablecidos = (iniciales?: Filtros): Filtros => iniciales ?? SIN_FILTROS

// Lo guardado manda aunque no tenga filtros; los iniciales solo aplican sin guardado
export function estadoBase(guardado: EstadoGuardado, hayGuardado: boolean, iniciales?: Filtros): EstadoGuardado {
  return hayGuardado || !iniciales ? guardado : { filtros: iniciales }
}
