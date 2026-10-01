'use client'

import type { Opcion } from '@/domain/modulos'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

export interface FiltroEntregas { ciudad: string; texto: string }

export function FiltrosEntregas({ filtro, ciudades, alCambiar }: {
  filtro: FiltroEntregas; ciudades: Opcion[]; alCambiar: (f: FiltroEntregas) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
      <div className="min-w-0">
        <label id="filtro-ciudad-et" htmlFor="filtro-ciudad" className="etiqueta">Ciudad</label>
        <SelectBuscable id="filtro-ciudad" etiqueta="Ciudad" etiquetaId="filtro-ciudad-et" opciones={ciudades}
          valor={filtro.ciudad} textoVacio="Todas" alCambiar={(ciudad) => alCambiar({ ...filtro, ciudad })} />
      </div>
      <div className="min-w-0">
        <label htmlFor="filtro-nombre" className="etiqueta">Buscar colaborador</label>
        <input id="filtro-nombre" type="search" className="control" value={filtro.texto} autoComplete="off"
          onChange={(e) => alCambiar({ ...filtro, texto: e.target.value })} />
      </div>
    </div>
  )
}
