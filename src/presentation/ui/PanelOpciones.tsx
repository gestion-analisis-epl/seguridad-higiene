'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Icono } from './Icono'
import { alternar, filtrarOpciones, type OpcionSeleccion } from './seleccion'

const ACCION = 'rounded px-1 py-1.5 text-xs font-medium underline underline-offset-2 hover:bg-superficie-2'

export function PanelOpciones({ etiqueta, opciones, seleccion, alCambiar, enfocar = true, textoMarcar = 'Seleccionar todo', textoDesmarcar = 'Limpiar' }: {
  etiqueta: string
  opciones: OpcionSeleccion[]
  seleccion: string[]
  alCambiar: (seleccion: string[]) => void
  enfocar?: boolean
  textoMarcar?: string
  textoDesmarcar?: string
}) {
  const [texto, setTexto] = useState('')
  const lista = useRef<HTMLUListElement>(null)
  const busqueda = useRef<HTMLInputElement>(null)
  const visibles = useMemo(() => filtrarOpciones(opciones, texto), [opciones, texto])

  const items = () => Array.from(lista.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])

  useEffect(() => {
    if (enfocar) busqueda.current?.focus({ preventScroll: true })
    // Solo al abrir el panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const valoresVisibles = visibles.map((o) => o.valor)
  const seleccionarVisibles = () => alCambiar([...seleccion, ...valoresVisibles.filter((v) => !seleccion.includes(v))])
  const limpiarVisibles = () => alCambiar(seleccion.filter((v) => !valoresVisibles.includes(v)))

  const alTeclear = (e: KeyboardEvent<HTMLUListElement>) => {
    const todas = items()
    const i = todas.indexOf(document.activeElement as HTMLElement)
    const mover = (n: number) => { e.preventDefault(); todas[Math.max(0, Math.min(todas.length - 1, n))]?.focus({ preventScroll: true }) }
    if (e.key === 'ArrowDown') mover(i + 1)
    else if (e.key === 'ArrowUp') {
      if (i <= 0) { e.preventDefault(); busqueda.current?.focus({ preventScroll: true }) } else mover(i - 1)
    } else if (e.key === 'Home') mover(0)
    else if (e.key === 'End') mover(todas.length - 1)
    else if ((e.key === ' ' || e.key === 'Enter') && i >= 0) {
      e.preventDefault()
      alCambiar(alternar(seleccion, todas[i].dataset.valor ?? ''))
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative border-b border-borde p-2">
        <Icono nombre="buscar" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
        <input
          ref={busqueda} type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
          aria-label={`Buscar en ${etiqueta}`} placeholder="Buscar" autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); items()[0]?.focus({ preventScroll: true }) } }}
          className="control pl-9"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-borde px-3 py-1">
        <button type="button" onClick={seleccionarVisibles} className={ACCION}>{textoMarcar}</button>
        <button type="button" onClick={limpiarVisibles} className={ACCION}>{textoDesmarcar}</button>
      </div>
      <ul ref={lista} role="listbox" aria-multiselectable="true" aria-label={etiqueta} onKeyDown={alTeclear}
        className="min-h-0 flex-1 overflow-y-auto py-1">
        {visibles.length === 0 && <li className="px-3 py-3 text-texto-suave">Sin coincidencias</li>}
        {visibles.map((o, i) => {
          const marcada = seleccion.includes(o.valor)
          return (
            <li
              key={o.valor} role="option" aria-selected={marcada} data-valor={o.valor} tabIndex={i === 0 ? 0 : -1}
              onClick={() => alCambiar(alternar(seleccion, o.valor))}
              className="flex min-h-[2.5rem] cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-superficie-2 focus-visible:bg-superficie-2 focus-visible:outline-offset-[-2px]"
            >
              <span aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${marcada ? 'border-primario bg-primario text-primario-texto' : 'border-borde-control bg-superficie'}`}>
                {marcada && <Icono nombre="check" className="h-3 w-3" />}
              </span>
              <span className="min-w-0 break-words">{o.etiqueta}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
