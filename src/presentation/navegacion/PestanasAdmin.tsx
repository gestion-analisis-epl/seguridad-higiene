'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { puede } from '@/domain/permisos'
import { estaActivo, GRUPOS_ADMIN } from './enlaces'

export function PestanasAdmin() {
  const { usuario } = useSesion()
  const ruta = usePathname()
  if (!puede(usuario, 'administrar')) return null
  return (
    <nav aria-label="Administración" className="mb-6 overflow-x-auto overflow-y-hidden">
      <ul className="flex w-max min-w-full items-center gap-1 border-b border-borde">
        {GRUPOS_ADMIN.map((g, i) => (
          <Fragment key={g.titulo}>
            {i > 0 && <li aria-hidden="true" className="mx-2 h-4 w-px bg-borde-fuerte" />}
            {g.enlaces.map((e) => {
              const activa = estaActivo(e.href, ruta)
              return (
                <li key={e.href}>
                  <Link href={e.href} aria-current={activa ? 'page' : undefined}
                    className={`block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activa ? 'border-primario text-texto' : 'border-transparent text-texto-suave hover:text-texto'}`}>
                    {e.titulo}
                  </Link>
                </li>
              )
            })}
          </Fragment>
        ))}
      </ul>
    </nav>
  )
}
