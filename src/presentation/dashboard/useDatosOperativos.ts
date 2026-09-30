'use client'

import { useMemo } from 'react'
import type { DatosOperativos } from '@/domain/entidades'
import { useColeccion } from '@/presentation/datos/useColeccion'

export function useDatosOperativos() {
  const colaboradores = useColeccion('colaboradores')
  const capacitaciones = useColeccion('capacitaciones')
  const entregasUniforme = useColeccion('entregas_uniforme')
  const entregasEpp = useColeccion('entregas_epp')
  const equipoOficinas = useColeccion('oficinas_equipo')
  const vehiculos = useColeccion('vehiculos')
  const fuentes = [colaboradores, capacitaciones, entregasUniforme, entregasEpp, equipoOficinas, vehiculos]

  const datos = useMemo<DatosOperativos>(() => ({
    colaboradores: colaboradores.registros as unknown as DatosOperativos['colaboradores'],
    capacitaciones: capacitaciones.registros as unknown as DatosOperativos['capacitaciones'],
    entregasUniforme: entregasUniforme.registros as unknown as DatosOperativos['entregasUniforme'],
    entregasEpp: entregasEpp.registros as unknown as DatosOperativos['entregasEpp'],
    equipoOficinas: equipoOficinas.registros as unknown as DatosOperativos['equipoOficinas'],
    vehiculos: vehiculos.registros as unknown as DatosOperativos['vehiculos'],
  }), [colaboradores.registros, capacitaciones.registros, entregasUniforme.registros,
    entregasEpp.registros, equipoOficinas.registros, vehiculos.registros])

  return {
    cargando: fuentes.some((f) => f.cargando),
    error: fuentes.find((f) => f.error)?.error ?? null,
    datos,
  }
}
