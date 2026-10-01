'use client'

import { useMemo } from 'react'
import { claveDoc } from '@/application/almacen-lecturas'
import type { Opcion } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { itemsDeCatalogo } from './opciones'
import { useLectura } from './useLectura'

export function useCatalogo(id: string | null): Opcion[] {
  const { dato } = useLectura(id === null ? null : claveDoc('catalogos', id))
  return useMemo(() => itemsDeCatalogo((dato as Registro | null | undefined) ?? undefined), [dato])
}
