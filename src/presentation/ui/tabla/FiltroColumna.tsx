'use client'

import { useId, useRef, useState } from 'react'
import { Icono } from '../Icono'
import { Popover } from '../Popover'
import type { OpcionSeleccion } from '../seleccion'
import { ContenidoFiltro } from './ContenidoFiltro'
import type { Filtro, TipoColumna } from './logica'

export function FiltroColumna({ tipo, encabezado, filtro, activo, opciones, alCambiar }: {
  tipo: TipoColumna
  encabezado: string
  filtro: Filtro | undefined
  activo: boolean
  opciones: OpcionSeleccion[]
  alCambiar: (filtro: Filtro | null) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const id = useId()
  return (
    <>
      <button
        ref={boton} type="button" aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        onClick={() => setAbierto((a) => !a)}
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded border ${activo
          ? 'border-primario bg-primario text-primario-texto'
          : 'border-transparent text-texto-suave hover:border-borde-fuerte hover:bg-superficie hover:text-texto'}`}
      >
        <Icono nombre="filtro" className={`h-4 w-4 ${activo ? '[&_path]:fill-current' : ''}`} />
        <span className="sr-only">Filtrar {encabezado}{activo ? ' (filtro activo)' : ''}</span>
      </button>
      {abierto && (
        <Popover id={id} ancla={boton} alCerrar={() => setAbierto(false)} etiqueta={`Filtrar ${encabezado}`} ancho={272}>
          <ContenidoFiltro tipo={tipo} encabezado={encabezado} filtro={filtro} opciones={opciones} alCambiar={alCambiar} />
        </Popover>
      )}
    </>
  )
}
