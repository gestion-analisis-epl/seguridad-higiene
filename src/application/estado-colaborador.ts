export type EstadoColaborador = 'Activo' | 'Inactivo' | 'Sin colaborador'

export const mapaActivos = (colaboradores: { id: string; activo?: unknown }[]): Map<string, boolean> =>
  new Map(colaboradores.map((c) => [c.id, c.activo !== false]))

export function estadoDeColaborador(activos: Map<string, boolean>, id: unknown): EstadoColaborador {
  const activo = typeof id === 'string' && id !== '' ? activos.get(id) : undefined
  if (activo === undefined) return 'Sin colaborador'
  return activo ? 'Activo' : 'Inactivo'
}
