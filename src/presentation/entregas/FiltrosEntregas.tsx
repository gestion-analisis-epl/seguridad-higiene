'use client'

import type { Opcion } from '@/domain/modulos'

export interface FiltroEntregas { ciudad: string; texto: string }

export function FiltrosEntregas({ filtro, ciudades, alCambiar }: {
  filtro: FiltroEntregas; ciudades: Opcion[]; alCambiar: (f: FiltroEntregas) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
      <div className="min-w-0">
        <label htmlFor="filtro-ciudad" className="etiqueta">Ciudad</label>
        <select id="filtro-ciudad" className="control" value={filtro.ciudad}
          onChange={(e) => alCambiar({ ...filtro, ciudad: e.target.value })}>
          <option value="">Todas</option>
          {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="filtro-nombre" className="etiqueta">Buscar colaborador</label>
        <input id="filtro-nombre" type="search" className="control" value={filtro.texto} autoComplete="off"
          onChange={(e) => alCambiar({ ...filtro, texto: e.target.value })} />
      </div>
    </div>
  )
}
