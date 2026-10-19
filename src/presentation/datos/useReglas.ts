'use client'

import { useMemo } from 'react'
import { aRegla } from '@/domain/reglas-dotacion'
import { useColeccion } from './useColeccion'

export function useReglas() {
  const { registros, cargando, error } = useColeccion('reglas_dotacion')
  const reglas = useMemo(() => registros.map((r) => aRegla(r)), [registros])
  return { reglas, cargando, error }
}
