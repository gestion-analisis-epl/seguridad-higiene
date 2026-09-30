'use client'

import { useSesion } from '@/presentation/auth/AuthProvider'
import { Icono } from '@/presentation/ui/Icono'
import { ETIQUETA_ROL } from './enlaces'

export function TarjetaUsuario() {
  const { correo, usuario, cerrarSesion } = useSesion()
  const inicial = (correo ?? '?').charAt(0).toUpperCase()
  return (
    <div className="border-t border-barra-borde p-3">
      <div className="flex items-center gap-3 px-1 py-2">
        <span aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-barra-borde bg-barra-2 font-mono text-xs">
          {inicial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm" title={correo ?? undefined}>{correo}</p>
          {usuario && <p className="text-xs text-barra-suave">{ETIQUETA_ROL[usuario.rol]}</p>}
        </div>
      </div>
      <button type="button" onClick={() => void cerrarSesion()}
        className="mt-1 flex min-h-[2.25rem] w-full items-center gap-3 rounded px-3 text-sm text-barra-suave transition-colors hover:bg-barra-2 hover:text-barra-texto">
        <Icono nombre="salir" />
        Cerrar sesión
      </button>
    </div>
  )
}
