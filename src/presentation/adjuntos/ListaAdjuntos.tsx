'use client'

import { useState } from 'react'
import type { Adjunto } from '@/domain/adjuntos'
import { Icono } from '@/presentation/ui/Icono'
import { esPdf, etiquetaTipo, tamanoLegible } from './formato'

interface Props {
  adjuntos: Adjunto[]
  soloLectura: boolean
  ocupado: string | null
  alVer: (a: Adjunto, disparador: HTMLElement) => void
  alDescargar: (a: Adjunto) => void
  alBorrar: (a: Adjunto) => void
}

export function ListaAdjuntos({ adjuntos, soloLectura, ocupado, alVer, alDescargar, alBorrar }: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null)

  if (adjuntos.length === 0) return <p className="text-sm text-texto-suave">Sin archivos adjuntos.</p>
  return (
    <ul className="divide-y divide-borde rounded-lg border border-borde bg-superficie">
      {adjuntos.map((a) => (
        <li key={a.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-texto" title={a.nombre}>{a.nombre}</p>
            <p className="font-mono text-xs text-texto-suave">{etiquetaTipo(a.tipo)} · {tamanoLegible(a.tamano)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {esPdf(a.tipo) && (
              <button type="button" onClick={(e) => alVer(a, e.currentTarget)} aria-label={`Ver ${a.nombre}`}
                className="boton-secundario min-h-[2.25rem] px-3">
                <Icono nombre="ver" />
                Ver
              </button>
            )}
            <button type="button" onClick={() => alDescargar(a)} disabled={ocupado === a.id}
              aria-label={`Descargar ${a.nombre}`} className="boton-secundario min-h-[2.25rem] px-3">
              <Icono nombre="descargar" />
              {ocupado === a.id ? 'Procesando...' : 'Descargar'}
            </button>
            {!soloLectura && (confirmando === a.id ? (
              <>
                <button type="button" onClick={() => { setConfirmando(null); alBorrar(a) }}
                  aria-label={`Confirmar eliminación de ${a.nombre}`}
                  className="boton-secundario min-h-[2.25rem] border-error px-3 text-error">
                  <Icono nombre="alerta" />
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmando(null)}
                  aria-label={`Cancelar eliminación de ${a.nombre}`} className="boton-secundario min-h-[2.25rem] px-3">
                  Cancelar
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(a.id)} disabled={ocupado === a.id}
                aria-label={`Eliminar ${a.nombre}`} className="boton-secundario min-h-[2.25rem] px-3 text-error">
                Eliminar
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
