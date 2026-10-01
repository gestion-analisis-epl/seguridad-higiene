'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Icono } from './Icono'
import { PanelSeleccionUnica } from './PanelSeleccionUnica'
import { Popover } from './Popover'
import { ordenarOpciones, type OpcionSeleccion } from './seleccion'

export interface PropsSelectBuscable {
  id: string
  etiqueta: string
  etiquetaId?: string
  opciones: OpcionSeleccion[]
  valor: string
  alCambiar: (valor: string) => void
  textoVacio?: string
  deshabilitado?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

// Selector de un valor con busqueda; textoVacio agrega la opcion que limpia la seleccion
export function SelectBuscable({
  id, etiqueta, etiquetaId, opciones, valor, alCambiar, textoVacio, deshabilitado = false, ...aria
}: PropsSelectBuscable) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const idPanel = useId()
  const lista = useMemo(() => {
    const ordenadas = ordenarOpciones(opciones)
    return textoVacio === undefined ? ordenadas : [{ valor: '', etiqueta: textoVacio }, ...ordenadas]
  }, [opciones, textoVacio])
  const actual = opciones.find((o) => o.valor === valor)?.etiqueta ?? (valor === '' ? textoVacio : valor) ?? ''

  const elegir = (nuevo: string) => {
    setAbierto(false)
    boton.current?.focus()
    if (nuevo !== valor) alCambiar(nuevo)
  }

  return (
    <>
      <button
        ref={boton} id={id} type="button" disabled={deshabilitado}
        aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? idPanel : undefined}
        aria-labelledby={etiquetaId ? `${etiquetaId} ${id}` : undefined} aria-label={etiquetaId ? undefined : etiqueta}
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); setAbierto(true) } }}
        className="control flex items-center justify-between gap-2 text-left"
        {...aria}
      >
        <span className={`min-w-0 truncate ${valor === '' ? 'text-texto-suave' : ''}`}>{actual}</span>
        <Icono nombre="chevron" className={`h-4 w-4 shrink-0 text-texto-suave transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <Popover id={idPanel} ancla={boton} alCerrar={() => setAbierto(false)} etiqueta={etiqueta}
          ancho={Math.max(240, boton.current?.offsetWidth ?? 0)}>
          <PanelSeleccionUnica etiqueta={etiqueta} opciones={lista} valor={valor} alElegir={elegir} />
        </Popover>
      )}
    </>
  )
}
