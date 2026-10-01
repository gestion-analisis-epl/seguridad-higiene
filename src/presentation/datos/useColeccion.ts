'use client'

import { useMemo } from 'react'
import { claveColeccion } from '@/application/almacen-lecturas'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { useLectura } from './useLectura'

const SIN_REGISTROS: Registro[] = []

export function useColeccion(coleccion: string | null) {
  const { dato, cargando, error } = useLectura(coleccion === null ? null : claveColeccion(coleccion))
  const registros = Array.isArray(dato) ? dato : SIN_REGISTROS
  return useMemo(() => ({ registros, cargando, error }), [registros, cargando, error])
}
