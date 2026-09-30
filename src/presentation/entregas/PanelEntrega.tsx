'use client'

import { useMemo } from 'react'
import { historialDe, type FilaEntrega } from '@/application/entregas-agrupar'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import type { ConfiguracionPagina } from './configuraciones'
import { FormularioEntrega } from './FormularioEntrega'
import { HistorialEntregas } from './HistorialEntregas'

export function PanelEntrega({ cfg, fila, items, registros, puedeCapturar, puedeEliminar, alTerminar }: {
  cfg: ConfiguracionPagina
  fila: FilaEntrega
  items: Opcion[]
  registros: RegistroEntrega[]
  puedeCapturar: boolean
  puedeEliminar: boolean
  alTerminar: () => void
}) {
  const historial = useMemo(() => historialDe(registros, fila.colaborador.id), [registros, fila.colaborador.id])
  return (
    <div className="aparecer space-y-6">
      {puedeCapturar && (
        <FormularioEntrega key={fila.colaborador.id} cfg={cfg} fila={fila} items={items}
          alTerminar={alTerminar} alCancelar={alTerminar} />
      )}
      <HistorialEntregas config={cfg.config} registros={historial} items={items} puedeEliminar={puedeEliminar} />
    </div>
  )
}
