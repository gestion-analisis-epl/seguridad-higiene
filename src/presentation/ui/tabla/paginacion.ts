export const TAMANOS_PAGINA = [5, 10, 15, 20, 50, 100] as const
export const TAMANO_PAGINA_INICIAL = 10

export const tamanoValido = (v: unknown): v is number =>
  typeof v === 'number' && (TAMANOS_PAGINA as readonly number[]).includes(v)

export interface Pagina<T> {
  filas: T[]
  pagina: number
  paginas: number
  desde: number
  hasta: number
  total: number
}

// La pagina pedida se ajusta al rango valido
export function paginar<T>(filas: T[], pagina: number, tamano: number): Pagina<T> {
  const total = filas.length
  const paginas = Math.max(1, Math.ceil(total / tamano))
  const actual = Number.isFinite(pagina) ? Math.min(paginas, Math.max(1, Math.trunc(pagina))) : 1
  const inicio = (actual - 1) * tamano
  const recorte = filas.slice(inicio, inicio + tamano)
  return {
    filas: recorte, pagina: actual, paginas, total,
    desde: recorte.length === 0 ? 0 : inicio + 1,
    hasta: inicio + recorte.length,
  }
}

export function resumenPagina(p: Pagina<unknown>, totalSinFiltrar: number): string {
  const rango = p.total === 0 ? '0' : `${p.desde}-${p.hasta}`
  const base = `Mostrando ${rango} de ${p.total}`
  return p.total === totalSinFiltrar ? base : `${base} (${p.total} de ${totalSinFiltrar} en total)`
}
