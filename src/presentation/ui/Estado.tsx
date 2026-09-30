import type { ReactNode } from 'react'
import { Icono } from './Icono'

export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <p role="status" className="flex items-center gap-3 py-6 text-sm text-texto-suave">
      <span aria-hidden="true"
        className="h-4 w-4 rounded-full border-2 border-borde-fuerte border-t-texto motion-safe:animate-spin" />
      {texto}
    </p>
  )
}

export function AvisoError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="aviso-error">
      <Icono nombre="alerta" className="mt-0.5 h-4 w-4" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}
