'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { Icono } from '@/presentation/ui/Icono'
import { estaActivo, type GrupoEnlaces } from './enlaces'

// compacta: en escritorio solo íconos; el nombre queda como etiqueta accesible y tooltip
export function MenuNavegacion({ grupos, ruta, compacta = false }: { grupos: GrupoEnlaces[]; ruta: string; compacta?: boolean }) {
  // Con la barra contraída el nombre aparece al lado del ícono; va en un portal porque el scroll y la transformación de la barra lo recortarían
  const [tip, setTip] = useState<{ texto: string; top: number; left: number } | null>(null)
  const mostrar = (texto: string, el: HTMLElement) => {
    if (!compacta) return
    const r = el.getBoundingClientRect()
    setTip({ texto, top: r.top + r.height / 2, left: r.right + 10 })
  }
  return (
    <div onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)} className={compacta ? 'space-y-6 lg:space-y-3' : 'space-y-6'}>
      {grupos.map((g) => (
        <div key={g.titulo}>
          <h2 className={`mb-1.5 px-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-barra-suave ${compacta ? 'lg:hidden' : ''}`}>
            {g.titulo}
          </h2>
          <ul className="space-y-0.5">
            {g.enlaces.map((e) => {
              const activo = estaActivo(e.href, ruta)
              return (
                <li key={e.href}>
                  <Link href={e.href} onMouseEnter={(ev) => mostrar(e.titulo, ev.currentTarget)} onFocus={(ev) => mostrar(e.titulo, ev.currentTarget)}
                    aria-current={activo ? 'page' : undefined} aria-label={e.titulo}
                    className={`relative flex min-h-[2.25rem] items-center gap-3 rounded px-3 text-sm transition-colors ${compacta ? 'lg:justify-center lg:px-0' : ''} ${
                      activo
                        ? 'bg-barra-2 font-medium text-barra-texto before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-acento'
                        : 'text-barra-suave hover:bg-barra-2 hover:text-barra-texto'
                    }`}>
                    <Icono nombre={e.icono} className={`h-4 w-4 ${activo ? 'text-acento' : ''}`} />
                    <span className={`truncate ${compacta ? 'lg:hidden' : ''}`}>{e.titulo}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {compacta && tip && createPortal(
        <span role="tooltip" style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-[70] hidden -translate-y-1/2 whitespace-nowrap rounded bg-barra-texto px-2.5 py-1.5 text-xs font-medium text-barra shadow-alta lg:block">
          {tip.texto}
        </span>,
        document.body,
      )}
    </div>
  )
}
