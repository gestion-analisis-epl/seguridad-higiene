import { useMemo } from 'react'
import type { Requisitos } from '@/application/dashboard'
import { useCatalogo } from '@/presentation/datos/useCatalogo'

// Valores de los catálogos prendas y tipos_epp; vacíos caen a las constantes
export function useRequisitos(): Requisitos {
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  return useMemo(
    () => ({ prendas: prendas.map((i) => i.valor), tiposEpp: tiposEpp.map((i) => i.valor) }),
    [prendas, tiposEpp],
  )
}
