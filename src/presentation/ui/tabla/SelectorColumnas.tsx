'use client'

import { useId, useRef, useState } from 'react'
import { Icono } from '../Icono'
import { Popover } from '../Popover'

export function SelectorColumnas({ columnas, ocultas, alAlternar, alMostrarTodas }: {
  columnas: { id: string; encabezado: string }[]
  ocultas: Set<string>
  alAlternar: (id: string) => void
  alMostrarTodas: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const id = useId()
  return (
    <>
      <button
        ref={boton} type="button" aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        onClick={() => setAbierto((a) => !a)} className="boton-secundario min-h-[2rem] px-3 text-xs"
      >
        <Icono nombre="columnas" className="h-3.5 w-3.5" />
        Columnas
        {ocultas.size > 0 && (
          <span className="rounded-full bg-primario px-1.5 text-[10px] font-semibold text-primario-texto">
            {ocultas.size}<span className="sr-only"> ocultas</span>
          </span>
        )}
      </button>
      {abierto && (
        <Popover id={id} ancla={boton} alCerrar={() => setAbierto(false)} etiqueta="Columnas visibles" ancho={260}>
          <div className="flex items-center justify-between border-b border-borde px-3 py-2">
            <span className="text-xs font-semibold text-texto-suave">Mostrar columnas</span>
            {ocultas.size > 0 && <button type="button" onClick={alMostrarTodas} className="text-xs underline">Mostrar todas</button>}
          </div>
          <ul className="min-h-0 overflow-y-auto py-1">
            {columnas.map((c, i) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-superficie-2">
                  <input type="checkbox" checked={!ocultas.has(c.id)} disabled={i === 0} onChange={() => alAlternar(c.id)} />
                  <span className="min-w-0 truncate">{c.encabezado}</span>
                  {i === 0 && <span className="ml-auto text-xs text-texto-suave">Fija</span>}
                </label>
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </>
  )
}
