import type { ColaboradorEntrega, RegistroEntrega } from './entregas-tipos'

const tiempo = (r: RegistroEntrega) => (r.fecha instanceof Date ? r.fecha.getTime() : null)

// Más reciente primero, sin fecha al final, empate resuelto por id mayor
function porFechaDesc(a: RegistroEntrega, b: RegistroEntrega): number {
  const x = tiempo(a)
  const y = tiempo(b)
  if (x === y) return a.id === b.id ? 0 : a.id < b.id ? 1 : -1
  if (x === null) return 1
  if (y === null) return -1
  return y - x
}

export function ultimaEntregaPorItem(
  registros: RegistroEntrega[], claveItem: string,
): Map<string, Record<string, RegistroEntrega>> {
  const mapa = new Map<string, Record<string, RegistroEntrega>>()
  for (const r of registros) {
    const persona = String(r.colaborador_id)
    const item = String(r[claveItem])
    const ultimas = mapa.get(persona) ?? {}
    const actual = ultimas[item]
    if (!actual || porFechaDesc(r, actual) < 0) ultimas[item] = r
    mapa.set(persona, ultimas)
  }
  return mapa
}

export interface FilaEntrega<C extends ColaboradorEntrega = ColaboradorEntrega> {
  colaborador: C
  ultimas: Record<string, RegistroEntrega>
  cantidadEntregas: number
}

export function filasPorColaborador<C extends ColaboradorEntrega>(
  colaboradores: C[], registros: RegistroEntrega[], claveItem: string,
): FilaEntrega<C>[] {
  const ultimas = ultimaEntregaPorItem(registros, claveItem)
  const total = new Map<string, number>()
  for (const r of registros) total.set(String(r.colaborador_id), (total.get(String(r.colaborador_id)) ?? 0) + 1)
  return [...colaboradores]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((colaborador) => ({
      colaborador,
      ultimas: ultimas.get(colaborador.id) ?? {},
      cantidadEntregas: total.get(colaborador.id) ?? 0,
    }))
}

export function historialDe(registros: RegistroEntrega[], colaboradorId: string): RegistroEntrega[] {
  return registros.filter((r) => r.colaborador_id === colaboradorId).sort(porFechaDesc)
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function filtrarFilas<F extends { colaborador: ColaboradorEntrega }>(
  filas: F[], filtro: { ciudad: string; texto: string },
): F[] {
  const texto = normalizar(filtro.texto)
  return filas.filter(({ colaborador: c }) =>
    (!filtro.ciudad || c.ciudad === filtro.ciudad) && (!texto || normalizar(c.nombre).includes(texto)))
}
