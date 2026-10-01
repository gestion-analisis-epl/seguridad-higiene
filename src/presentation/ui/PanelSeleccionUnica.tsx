'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Icono } from './Icono'
import { filtrarOpciones, type OpcionSeleccion } from './seleccion'

export function PanelSeleccionUnica({ etiqueta, opciones, valor, alElegir }: {
  etiqueta: string
  opciones: OpcionSeleccion[]
  valor: string
  alElegir: (valor: string) => void
}) {
  const [texto, setTexto] = useState('')
  const lista = useRef<HTMLUListElement>(null)
  const busqueda = useRef<HTMLInputElement>(null)
  const visibles = useMemo(() => filtrarOpciones(opciones, texto), [opciones, texto])

  const items = () => Array.from(lista.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
  const enfocar = (el?: HTMLElement) => el?.focus({ preventScroll: true })

  // Solo al abrir el panel
  useEffect(() => { busqueda.current?.focus({ preventScroll: true }) }, [])

  const alTeclear = (e: KeyboardEvent<HTMLUListElement>) => {
    const todas = items()
    const i = todas.indexOf(document.activeElement as HTMLElement)
    const mover = (n: number) => { e.preventDefault(); enfocar(todas[Math.max(0, Math.min(todas.length - 1, n))]) }
    if (e.key === 'ArrowDown') mover(i + 1)
    else if (e.key === 'ArrowUp') {
      if (i <= 0) { e.preventDefault(); busqueda.current?.focus({ preventScroll: true }) } else mover(i - 1)
    } else if (e.key === 'Home') mover(0)
    else if (e.key === 'End') mover(todas.length - 1)
    else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault()
      alElegir(todas[i].dataset.valor ?? '')
    }
  }

  const alTeclearBusqueda = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const todas = items()
      enfocar(todas.find((i) => i.getAttribute('aria-selected') === 'true') ?? todas[0])
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visibles.length > 0) alElegir(visibles[0].valor)
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative border-b border-borde p-2">
        <Icono nombre="buscar" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
        <input
          ref={busqueda} type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
          aria-label={`Buscar en ${etiqueta}`} placeholder="Buscar" autoComplete="off"
          onKeyDown={alTeclearBusqueda} className="control pl-9"
        />
      </div>
      <ul ref={lista} role="listbox" aria-label={etiqueta} onKeyDown={alTeclear}
        className="min-h-0 flex-1 overflow-y-auto py-1">
        {visibles.length === 0 && <li className="px-3 py-3 text-texto-suave">Sin coincidencias</li>}
        {visibles.map((o, i) => {
          const elegida = o.valor === valor
          return (
            <li
              key={o.valor} role="option" aria-selected={elegida} data-valor={o.valor} tabIndex={i === 0 ? 0 : -1}
              onClick={() => alElegir(o.valor)}
              className={`flex min-h-[2.5rem] cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-superficie-2 focus-visible:bg-superficie-2 focus-visible:outline-offset-[-2px] ${elegida ? 'font-medium' : ''}`}
            >
              <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center text-primario">
                {elegida && <Icono nombre="check" className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 break-words">{o.etiqueta}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
