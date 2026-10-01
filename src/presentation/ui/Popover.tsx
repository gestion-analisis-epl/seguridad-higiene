'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { posicionarPanel, type PosicionPanel } from './posicion'

const MARGEN = 8

const igual = (a: PosicionPanel | null, b: PosicionPanel) =>
  !!a && a.left === b.left && a.ancho === b.ancho && a.arriba === b.arriba
  && a.top === b.top && a.bottom === b.bottom && a.maxHeight === b.maxHeight

// Panel fijo en el viewport: no lo recorta el overflow del contenedor de la tabla
export function Popover({ id, ancla, alCerrar, ancho = 288, altoMax = 340, etiqueta, children }: {
  id?: string
  ancla: RefObject<HTMLElement>
  alCerrar: () => void
  ancho?: number
  altoMax?: number
  etiqueta: string
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PosicionPanel | null>(null)
  const cierre = useRef(alCerrar)
  cierre.current = alCerrar

  const cerrar = useCallback((devolverFoco: boolean) => {
    cierre.current()
    if (devolverFoco) ancla.current?.focus()
  }, [ancla])

  const recolocar = useCallback(() => {
    const el = ancla.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const nueva = posicionarPanel({
      ancla: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      ancho, altoMax, margen: MARGEN,
      vista: { ancho: window.innerWidth, alto: window.innerHeight },
    })
    setPos((previa) => (igual(previa, nueva) ? previa : nueva))
  }, [ancla, ancho, altoMax])

  useLayoutEffect(() => { recolocar() }, [recolocar])

  useEffect(() => {
    const alPulsar = (e: PointerEvent) => {
      const o = e.target as Node
      if (!panel.current?.contains(o) && !ancla.current?.contains(o)) cerrar(false)
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(true) }
    }
    const alDesplazar = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) recolocar()
    }
    document.addEventListener('pointerdown', alPulsar)
    document.addEventListener('keydown', alTeclear)
    window.addEventListener('resize', recolocar)
    window.addEventListener('scroll', alDesplazar, true)
    return () => {
      document.removeEventListener('pointerdown', alPulsar)
      document.removeEventListener('keydown', alTeclear)
      window.removeEventListener('resize', recolocar)
      window.removeEventListener('scroll', alDesplazar, true)
    }
  }, [ancla, cerrar, recolocar])

  const alSalirFoco = (e: React.FocusEvent) => {
    const destino = e.relatedTarget as Node | null
    if (destino && !panel.current?.contains(destino) && !ancla.current?.contains(destino)) cerrar(false)
  }

  // Antes de medir se oculta con opacidad: visibility:hidden impediria enfocar el contenido
  return (
    <div
      ref={panel} id={id} role="dialog" aria-label={etiqueta} onBlur={alSalirFoco}
      style={pos ? {
        position: 'fixed', left: pos.left, width: pos.ancho, maxHeight: pos.maxHeight,
        ...(pos.arriba ? { bottom: pos.bottom } : { top: pos.top }),
      } : { position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none' }}
      className="aparecer z-40 flex flex-col overflow-hidden rounded-lg border border-borde-fuerte bg-superficie font-sans text-sm font-normal normal-case tracking-normal text-texto shadow-alta"
    >
      {children}
    </div>
  )
}
