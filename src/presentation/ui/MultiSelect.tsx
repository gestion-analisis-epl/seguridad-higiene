'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Icono } from './Icono'
import { PanelOpciones } from './PanelOpciones'
import { Popover } from './Popover'
import { resumenSeleccion, type OpcionSeleccion } from './seleccion'

export function MultiSelect({ etiqueta, opciones, seleccion, alCambiar, textoTodos, textoNinguno, buscable }: {
  etiqueta: string
  opciones: OpcionSeleccion[]
  seleccion: string[]
  alCambiar: (seleccion: string[]) => void
  textoTodos: string
  textoNinguno: string
  buscable?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const resumen = useMemo(
    () => resumenSeleccion(opciones, seleccion, { todos: textoTodos, ninguno: textoNinguno }),
    [opciones, seleccion, textoTodos, textoNinguno],
  )
  return (
    <div className="min-w-0">
      <span id={`${id}-et`} className="etiqueta">{etiqueta}</span>
      <button
        ref={boton} type="button" aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? `${id}-panel` : undefined} aria-labelledby={`${id}-et ${id}-res`}
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); setAbierto(true) } }}
        className="control flex items-center justify-between gap-2 text-left"
      >
        <span id={`${id}-res`} className="min-w-0 truncate">{resumen}</span>
        <Icono nombre="chevron" className={`h-4 w-4 text-texto-suave transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <Popover id={`${id}-panel`} ancla={boton} alCerrar={() => setAbierto(false)} etiqueta={etiqueta}>
          <PanelOpciones etiqueta={etiqueta} opciones={opciones} seleccion={seleccion} alCambiar={alCambiar} buscable={buscable} />
        </Popover>
      )}
    </div>
  )
}
