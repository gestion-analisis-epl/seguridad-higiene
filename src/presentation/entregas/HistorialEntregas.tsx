'use client'

import { useState } from 'react'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import { formatearFecha } from '@/domain/fechas'
import type { Opcion } from '@/domain/modulos'
import { eliminar } from '@/infrastructure/firestore/repositorio'
import { AvisoError } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { etiquetaDe } from './etiquetas'

function EntradaHistorial({ config, registro, etiqueta, puedeEliminar }: {
  config: ConfigEntrega; registro: RegistroEntrega; etiqueta: string; puedeEliminar: boolean
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  async function borrar() {
    setEliminando(true)
    setFallo(null)
    try {
      await eliminar(config.coleccion, registro.id)
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo eliminar')
      setConfirmando(false)
      setEliminando(false)
    }
  }

  return (
    <li className="px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="w-24 shrink-0 font-mono text-xs text-texto-suave tabular-nums">
          {formatearFecha(registro.fecha instanceof Date ? registro.fecha : null)}
        </p>
        <div className="min-w-0 flex-1 basis-48">
          <p className="break-words text-sm font-medium">{etiqueta}</p>
          <p className="break-words text-sm text-texto-suave">{config.detalle(registro)}</p>
        </div>
        {puedeEliminar && (
          <div className="flex flex-wrap gap-2">
            {confirmando ? (
              <>
                <button type="button" onClick={() => void borrar()} disabled={eliminando}
                  className="boton-secundario !min-h-[2rem] border-error !px-3 text-error">
                  <Icono nombre="alerta" className="h-3.5 w-3.5" />
                  {eliminando ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} disabled={eliminando}
                  className="boton-secundario !min-h-[2rem] !px-3">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)}
                className="boton-secundario !min-h-[2rem] !px-3 text-error">
                Eliminar<span className="sr-only"> entrega de {etiqueta}</span>
              </button>
            )}
          </div>
        )}
      </div>
      {fallo && <div className="mt-2"><AvisoError>{fallo}</AvisoError></div>}
    </li>
  )
}

export function HistorialEntregas({ config, registros, items, puedeEliminar }: {
  config: ConfigEntrega; registros: RegistroEntrega[]; items: Opcion[]; puedeEliminar: boolean
}) {
  return (
    <section aria-labelledby="titulo-historial" className="tarjeta overflow-hidden">
      <h2 id="titulo-historial" className="border-b border-borde bg-superficie-2 px-4 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-texto-suave sm:px-6">
        Historial de entregas ({registros.length})
      </h2>
      {registros.length === 0 ? (
        <p className="px-4 py-6 text-sm text-texto-suave sm:px-6">Sin entregas registradas.</p>
      ) : (
        <ul className="divide-y divide-borde">
          {registros.map((r) => (
            <EntradaHistorial key={r.id} config={config} registro={r} puedeEliminar={puedeEliminar}
              etiqueta={etiquetaDe(items, r[config.campoItem])} />
          ))}
        </ul>
      )}
    </section>
  )
}
