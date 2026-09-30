'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { puede, type Accion, type EstadoAcceso } from '@/domain/permisos'
import { Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { useSesion } from './AuthProvider'

const MENSAJES: Record<Exclude<EstadoAcceso, 'sin_sesion' | 'autorizado'>, string> = {
  dominio_no_permitido: 'Solo se permiten cuentas del dominio de la empresa.',
  sin_registro: 'Estamos registrando tu cuenta, un momento.',
  pendiente: 'Tu cuenta no tiene un rol asignado. Un administrador debe asignarte uno.',
  inactivo: 'Tu cuenta está desactivada. Contacta a un administrador.',
}
const MENSAJE_ERROR = 'No se pudo verificar tu acceso. Revisa tu conexión o avisa a un administrador.'

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-10">
      <div role="alert" className="tarjeta aparecer w-full max-w-md overflow-hidden">
        <div className="franja-seguridad h-1.5" />
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-texto-suave">
            <Icono nombre="candado" />
            <span className="rotulo">Acceso restringido</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function RequireAcceso({ accion, children }: { accion: Accion; children: ReactNode }) {
  const { cargando, errorAcceso, acceso, usuario, correo, cerrarSesion } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && acceso === 'sin_sesion') router.replace('/login')
  }, [cargando, acceso, router])

  if (cargando) return <div className="grid min-h-[60vh] place-items-center"><Cargando /></div>
  if (acceso === 'sin_sesion') return null
  if (errorAcceso || acceso !== 'autorizado') {
    return (
      <Panel>
        <p className="text-base text-texto">{errorAcceso || acceso === 'autorizado' ? MENSAJE_ERROR : MENSAJES[acceso]}</p>
        {correo && <p className="break-all text-sm text-texto-suave">Sesión: {correo}</p>}
        <button type="button" onClick={() => void cerrarSesion()} className="boton-secundario">
          <Icono nombre="salir" />
          Cerrar sesión
        </button>
      </Panel>
    )
  }
  if (!puede(usuario, accion)) {
    return <Panel><p className="text-base text-texto">No tienes permiso para ver esta sección.</p></Panel>
  }
  return <>{children}</>
}
