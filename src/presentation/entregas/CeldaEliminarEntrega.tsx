'use client'

import { useState } from 'react'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import { eliminar } from '@/infrastructure/firestore/repositorio'
import { AvisoError } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'

export function CeldaEliminarEntrega({ config, registro, etiqueta }: {
  config: ConfigEntrega; registro: RegistroEntrega; etiqueta: string
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
    <div className="whitespace-normal">
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
      {fallo && <div className="mt-2"><AvisoError>{fallo}</AvisoError></div>}
    </div>
  )
}
