'use client'

import { useEffect, useState } from 'react'
import { CONFIG_INDICADORES_INICIAL, configDesdeDoc, type ConfigIndicadores } from '@/domain/indicadores'
import { suscribirDoc } from '@/infrastructure/firestore/repositorio'

export function useConfigIndicadores(): ConfigIndicadores {
  const [cfg, setCfg] = useState<ConfigIndicadores>(CONFIG_INDICADORES_INICIAL)

  useEffect(() => suscribirDoc('configuracion', 'indicadores', (r) => setCfg(configDesdeDoc(r))), [])

  return cfg
}
