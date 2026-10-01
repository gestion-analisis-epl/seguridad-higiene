'use client'

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { crearBloqueoScroll, indiceFocoTab } from './dialogo-foco'

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'

let bloquear: (() => () => void) | null = null

// Diálogo modal en un portal: foco atrapado, Escape y clic en el fondo cierran, scroll del body bloqueado.
export function Dialogo({ titulo, alCerrar, retorno, children }: {
  titulo: string
  alCerrar: () => void
  retorno?: RefObject<HTMLElement>
  children: ReactNode
}) {
  const idTitulo = useId()
  const panel = useRef<HTMLDivElement>(null)
  const cierre = useRef(alCerrar)
  cierre.current = alCerrar

  useEffect(() => {
    const destino = retorno?.current ?? (document.activeElement as HTMLElement | null)
    bloquear ??= crearBloqueoScroll(document.body)
    const liberar = bloquear()
    panel.current?.focus()
    const alEnfocar = (e: FocusEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) panel.current.focus()
    }
    document.addEventListener('focusin', alEnfocar)
    return () => {
      document.removeEventListener('focusin', alEnfocar)
      liberar()
      destino?.focus()
    }
  }, [retorno])

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      cierre.current()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const lista = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES))
    const i = indiceFocoTab(lista.indexOf(document.activeElement as HTMLElement), lista.length, e.shiftKey)
    e.preventDefault()
    if (i >= 0) lista[i].focus()
    else panel.current.focus()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) cierre.current() }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} onKeyDown={alTeclear}
        className="aparecer flex h-full w-full flex-col overflow-hidden bg-superficie text-texto shadow-alta outline-none sm:h-[90vh] sm:w-[90vw] sm:rounded-lg sm:border sm:border-borde-fuerte">
        <h2 id={idTitulo} className="sr-only">{titulo}</h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
