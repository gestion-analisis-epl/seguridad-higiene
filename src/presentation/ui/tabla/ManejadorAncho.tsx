'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { ANCHO_MAXIMO, PASO_TECLADO, PASO_TECLADO_GRANDE } from './logica'

export function ManejadorAncho({ encabezado, ancho, minimo, alCambiar, alRestablecer }: {
  encabezado: string
  ancho: number
  minimo: number
  alCambiar: (ancho: number) => void
  alRestablecer: () => void
}) {
  const inicio = useRef<{ x: number; ancho: number } | null>(null)

  const alPulsar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    inicio.current = { x: e.clientX, ancho }
  }
  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    if (inicio.current) alCambiar(inicio.current.ancho + e.clientX - inicio.current.x)
  }
  const alSoltar = (e: PointerEvent<HTMLDivElement>) => {
    inicio.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = e.shiftKey ? PASO_TECLADO_GRANDE : PASO_TECLADO
    if (e.key === 'ArrowLeft') { e.preventDefault(); alCambiar(ancho - paso) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); alCambiar(ancho + paso) }
  }

  return (
    <div
      role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={`Ancho de la columna ${encabezado}`}
      aria-valuenow={Math.round(ancho)} aria-valuemin={minimo} aria-valuemax={ANCHO_MAXIMO}
      title="Arrastre para cambiar el ancho; doble clic para restablecer"
      onPointerDown={alPulsar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
      onKeyDown={alTeclear} onDoubleClick={alRestablecer}
      className="group absolute -right-1.5 top-0 z-10 flex h-full w-3 cursor-col-resize touch-none select-none items-stretch justify-center focus-visible:outline-offset-[-2px]"
    >
      <span aria-hidden="true" className="my-1.5 w-px bg-borde-fuerte transition-[width,background-color] group-hover:w-0.5 group-hover:bg-primario group-focus-visible:w-0.5 group-focus-visible:bg-primario group-active:w-0.5 group-active:bg-primario" />
    </div>
  )
}
