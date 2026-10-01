import { aTextoIso, deTextoIso } from '@/domain/fechas'
import { filtroActivo, opcionesDeCategoria, type Filtro, type Orden } from './logica'
import { mismoFiltro } from './filtros-iniciales'
import type { ColumnaTabla } from './tipos'

export interface EstadoTabla { filtros: Record<string, Filtro>; orden: Orden | null; pagina: number }
export interface EstadoGuardado { filtros?: unknown; orden?: unknown; pagina?: unknown }

export const ESTADO_VACIO: EstadoTabla = { filtros: {}, orden: null, pagina: 1 }

export const claveEstadoTabla = (claveAnchos?: string) => (claveAnchos ? `estado:${claveAnchos}` : null)

export const estadoGuardadoValido = (v: unknown): v is EstadoGuardado =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const esObjeto = (v: unknown): v is Record<string, unknown> => estadoGuardadoValido(v)
const listaTextos = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null
const fechaFiltroValida = (v: unknown): v is string =>
  typeof v === 'string' && (v === '' || (deTextoIso(v) !== null && aTextoIso(deTextoIso(v)) === v))
const numeroOnulo = (v: unknown): number | null | undefined =>
  v === null ? null : typeof v === 'number' && Number.isFinite(v) ? v : undefined

// Sin filas (aun cargando) no se puede saber que valores existen: se conservan
function podar(ocultos: string[], presentes: Set<string> | null): string[] {
  return presentes ? ocultos.filter((o) => presentes.has(o)) : ocultos
}

function sanearFiltro<T>(
  crudo: unknown, c: ColumnaTabla<T>, presentes: () => Set<string> | null,
): Filtro | null {
  if (!esObjeto(crudo) || crudo.tipo !== c.tipo) return null
  switch (c.tipo) {
    case 'categoria': {
      const o = listaTextos(crudo.ocultos)
      return o ? { tipo: 'categoria', ocultos: podar(o, presentes()) } : null
    }
    case 'texto': {
      if (typeof crudo.texto !== 'string') return null
      if (crudo.ocultos === undefined) return { tipo: 'texto', texto: crudo.texto }
      const o = listaTextos(crudo.ocultos)
      return o ? { tipo: 'texto', texto: crudo.texto, ocultos: podar(o, presentes()) } : null
    }
    case 'fecha':
      return fechaFiltroValida(crudo.desde) && fechaFiltroValida(crudo.hasta)
        ? { tipo: 'fecha', desde: crudo.desde, hasta: crudo.hasta } : null
    case 'numero': {
      const min = numeroOnulo(crudo.min), max = numeroOnulo(crudo.max)
      return min === undefined || max === undefined ? null : { tipo: 'numero', min, max }
    }
    case 'booleano':
      return typeof crudo.valor === 'boolean' ? { tipo: 'booleano', valor: crudo.valor } : null
  }
}

export function sanearEstado<T>(
  guardado: EstadoGuardado, columnas: ColumnaTabla<T>[], filas: T[], iniciales?: Record<string, Filtro>,
): EstadoTabla {
  let cache: Set<string> | null | undefined
  const filtros: Record<string, Filtro> = {}
  if (esObjeto(guardado.filtros)) {
    for (const c of columnas) {
      if (c.filtrable === false || !Object.prototype.hasOwnProperty.call(guardado.filtros, c.id)) continue
      const presentes = () => {
        if (cache === undefined) cache = filas.length === 0 ? null : new Set(opcionesDeCategoria(filas, c).map((o) => o.valor))
        return cache
      }
      cache = undefined
      const f = sanearFiltro(guardado.filtros[c.id], c, presentes)
      // El defecto no se poda: seguiria valido cuando aparezcan filas con ese valor
      const inicial = iniciales?.[c.id]
      const sinPodar = f && inicial ? sanearFiltro(guardado.filtros[c.id], c, () => null) : null
      if (sinPodar && inicial && mismoFiltro(sinPodar, inicial)) filtros[c.id] = inicial
      else if (f && filtroActivo(f)) filtros[c.id] = f
    }
  }
  const o = guardado.orden
  const columnaOrden = esObjeto(o) && typeof o.id === 'string' ? columnas.find((c) => c.id === o.id) : undefined
  const orden: Orden | null = esObjeto(o) && columnaOrden && columnaOrden.ordenable !== false
    && (o.dir === 'asc' || o.dir === 'desc') ? { id: columnaOrden.id, dir: o.dir } : null
  const p = guardado.pagina
  const pagina = typeof p === 'number' && Number.isInteger(p) && p >= 1 ? p : 1
  return { filtros, orden, pagina }
}
