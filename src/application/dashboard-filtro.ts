import type { DatosOperativos } from '@/domain/entidades'

// undefined = todas las ciudades; lista vacía = ninguna
export function filtrarPorCiudad<T extends { ciudad: string }>(items: T[], ciudades: string[] | undefined): T[] {
  if (!ciudades) return items
  const set = new Set(ciudades)
  return items.filter((i) => set.has(i.ciudad))
}

export function filtrarPorCiudades(d: DatosOperativos, ciudades: string[] | undefined): DatosOperativos {
  if (!ciudades) return d
  const colaboradores = filtrarPorCiudad(d.colaboradores, ciudades)
  const ids = new Set(colaboradores.map((c) => c.id))
  return {
    colaboradores,
    capacitaciones: filtrarPorCiudad(d.capacitaciones, ciudades),
    entregasUniforme: d.entregasUniforme.filter((e) => ids.has(e.colaborador_id)),
    entregasEpp: d.entregasEpp.filter((e) => ids.has(e.colaborador_id)),
    equipoOficinas: filtrarPorCiudad(d.equipoOficinas, ciudades),
    vehiculos: filtrarPorCiudad(d.vehiculos, ciudades),
  }
}
