'use client'

import { Icono } from '../Icono'
import type { OpcionSeleccion } from '../seleccion'
import { FiltroColumna } from './FiltroColumna'
import type { Direccion, Filtro, TipoColumna } from './logica'
import { ManejadorAncho } from './ManejadorAncho'

interface Props {
  tipo: TipoColumna
  encabezado: string
  derecha: boolean
  dir: Direccion | null
  ordenable: boolean
  filtrable: boolean
  filtro: Filtro | undefined
  filtroActivo: boolean
  opciones: OpcionSeleccion[]
  ancho: number
  minimo: number
  ultima: boolean
  alOrdenar: () => void
  alFiltrar: (filtro: Filtro | null) => void
  alArrastrarAncho: (ancho: number) => void
  alConfirmarAncho: (ancho: number) => void
  alRestablecerAncho: () => void
}

const TEXTO_ORDEN = { asc: 'orden ascendente', desc: 'orden descendente' } as const

export function EncabezadoColumna(p: Props) {
  return (
    <th
      scope="col" style={{ width: p.ancho }}
      aria-sort={p.dir ? (p.dir === 'asc' ? 'ascending' : 'descending') : p.ordenable ? 'none' : undefined}
      className="relative !p-0"
    >
      <div className={`flex items-center gap-1 pl-2 pr-3 py-1 ${p.derecha ? 'flex-row-reverse' : ''}`}>
        {p.ordenable ? (
          <button
            type="button" onClick={p.alOrdenar}
            className={`flex min-h-[2rem] min-w-0 flex-1 items-center gap-1.5 rounded px-1 hover:text-texto ${p.derecha ? 'flex-row-reverse text-right' : 'text-left'} ${p.dir ? 'text-texto' : ''}`}
          >
            <span className="min-w-0 truncate">{p.encabezado}</span>
            <Icono nombre={p.dir ? (p.dir === 'asc' ? 'orden-asc' : 'orden-desc') : 'orden-sin'} className={`h-3.5 w-3.5 ${p.dir ? '' : 'opacity-50'}`} />
            <span className="sr-only">{p.dir ? `, ${TEXTO_ORDEN[p.dir]}` : ', sin orden; activar para ordenar'}</span>
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate px-1">{p.encabezado}</span>
        )}
        {p.filtrable && (
          <FiltroColumna
            tipo={p.tipo} encabezado={p.encabezado} filtro={p.filtro} activo={p.filtroActivo}
            opciones={p.opciones} alCambiar={p.alFiltrar}
          />
        )}
      </div>
      <ManejadorAncho
        encabezado={p.encabezado} ancho={p.ancho} minimo={p.minimo} ultima={p.ultima}
        alArrastrar={p.alArrastrarAncho} alConfirmar={p.alConfirmarAncho} alRestablecer={p.alRestablecerAncho}
      />
    </th>
  )
}
