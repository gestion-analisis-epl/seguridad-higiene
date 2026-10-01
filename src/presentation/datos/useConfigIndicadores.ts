'use client'

import { useMemo } from 'react'
import { claveDoc } from '@/application/almacen-lecturas'
import { CONFIG_INDICADORES_INICIAL, configDesdeDoc, type ConfigIndicadores } from '@/domain/indicadores'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { useLectura } from './useLectura'

export function useConfigIndicadores(): ConfigIndicadores {
  const { dato } = useLectura(claveDoc('configuracion', 'indicadores'))
  return useMemo(
    () => (dato === undefined ? CONFIG_INDICADORES_INICIAL : configDesdeDoc(dato as Registro | null)),
    [dato],
  )
}
