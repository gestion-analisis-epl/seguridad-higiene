'use client'

import { useMemo } from 'react'
import { historialDe, type FilaEntrega } from '@/application/entregas-agrupar'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import type { ConfiguracionPagina } from './configuraciones'
import { HistorialEntregas } from './HistorialEntregas'

export function PanelEntrega({ cfg, fila, items, registros }: {
  cfg: ConfiguracionPagina
  fila: FilaEntrega
  items: Opcion[]
  registros: RegistroEntrega[]
}) {
  const historial = useMemo(() => historialDe(registros, fila.colaborador.id), [registros, fila.colaborador.id])
  return (
    <div className="aparecer">
      <HistorialEntregas config={cfg.config} registros={historial} items={items} />
    </div>
  )
}
