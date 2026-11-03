'use client'

import { useMemo } from 'react'
import { aRegla, COLECCION_REGLAS, COLECCION_REGLAS_ANTERIOR, type Dotacion } from '@/domain/reglas-dotacion'
import { useColeccion } from './useColeccion'

export function useDotacion() {
  const uniforme = useColeccion(COLECCION_REGLAS.uniforme)
  const epp = useColeccion(COLECCION_REGLAS.epp)
  const dotacion = useMemo<Dotacion>(
    () => ({ uniforme: uniforme.registros.map((r) => aRegla(r)), epp: epp.registros.map((r) => aRegla(r)) }),
    [uniforme.registros, epp.registros],
  )
  return { dotacion, cargando: uniforme.cargando || epp.cargando, error: uniforme.error ?? epp.error }
}

// Reglas del modelo anterior, que juntaban uniforme y EPP; solo sirven para migrarlas
export function useReglasAnteriores() {
  const { registros, cargando } = useColeccion(COLECCION_REGLAS_ANTERIOR)
  return { cantidad: registros.length, cargando }
}
