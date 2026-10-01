'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { ANCHO_MAXIMO, PASO_TECLADO, PASO_TECLADO_GRANDE } from './logica'

export function ManejadorAncho({ encabezado, ancho, minimo, ultima, alArrastrar, alConfirmar, alRestablecer }: {
  encabezado: string
  ancho: number
  minimo: number
  ultima: boolean
  alArrastrar: (ancho: number) => void
  alConfirmar: (ancho: number) => void
  alRestablecer: () => void
}) {
  const inicio = useRef<{ x: number; ancho: number; ultimo: number } | null>(null)

  const alPulsar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    inicio.current = { x: e.clientX, ancho, ultimo: ancho }
  }
  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const i = inicio.current
    if (!i) return
    i.ultimo = i.ancho + e.clientX - i.x
    alArrastrar(i.ultimo)
  }
  const alSoltar = (e: PointerEvent<HTMLDivElement>) => {
    const i = inicio.current
    inicio.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (i && i.ultimo !== i.ancho) alConfirmar(i.ultimo)
  }
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = e.shiftKey ? PASO_TECLADO_GRANDE : PASO_TECLADO
    if (e.key === 'ArrowLeft') { e.preventDefault(); alConfirmar(ancho - paso) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); alConfirmar(ancho + paso) }
  }

  return (
    <div
      role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={`Ancho de la columna ${encabezado}`}
      aria-valuenow={Math.round(ancho)} aria-valuemin={minimo} aria-valuemax={ANCHO_MAXIMO}
      title="Arrastre para cambiar el ancho; doble clic para restablecer"
      onPointerDown={alPulsar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
      onKeyDown={alTeclear} onDoubleClick={alRestablecer}
      className={`group absolute top-0 z-10 flex h-full w-3 cursor-col-resize touch-none select-none items-stretch justify-center before:absolute before:inset-y-0 before:content-[''] focus-visible:outline-offset-[-2px] ${ultima ? 'right-0 before:inset-x-0' : '-right-1.5 before:-inset-x-1.5'}`}
    >
      <span aria-hidden="true" className="my-1.5 w-px bg-borde-fuerte transition-[width,background-color] group-hover:w-0.5 group-hover:bg-primario group-focus-visible:w-0.5 group-focus-visible:bg-primario group-active:w-0.5 group-active:bg-primario" />
    </div>
  )
}
