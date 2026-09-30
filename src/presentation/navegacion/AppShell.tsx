'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { Icono } from '@/presentation/ui/Icono'
import { gruposDeNavegacion } from './enlaces'
import { Marca } from './Marca'
import { MenuNavegacion } from './MenuNavegacion'
import { TarjetaUsuario } from './TarjetaUsuario'
import { useMenuMovil } from './useMenuMovil'

const BOTON_ICONO = 'grid h-10 w-10 place-items-center rounded text-barra-texto hover:bg-barra-2 lg:hidden'

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario } = useSesion()
  const ruta = usePathname() ?? '/'
  const grupos = useMemo(() => gruposDeNavegacion(usuario), [usuario])
  const { abierto, abrir, cerrar, botonAbrir, botonCerrar } = useMenuMovil(ruta)

  return (
    <div className="min-h-screen lg:pl-barra">
      <a href="#contenido"
        className="sr-only z-[60] rounded bg-acento px-3 py-2 text-sm font-medium text-acento-texto focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Saltar al contenido
      </a>

      <header className="zona-barra sticky top-0 z-30 flex h-cabecera items-center justify-between border-b border-barra-borde bg-barra px-4 text-barra-texto lg:hidden">
        <Marca />
        <button ref={botonAbrir} type="button" onClick={abrir} aria-expanded={abierto} aria-controls="navegacion"
          aria-label="Abrir menú" className={BOTON_ICONO}>
          <Icono nombre="menu" className="h-5 w-5" />
        </button>
      </header>

      {abierto && <div aria-hidden="true" onClick={cerrar} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}

      <aside id="navegacion" aria-label="Navegación principal"
        className={`zona-barra fixed inset-y-0 left-0 z-50 flex w-barra max-w-[85vw] flex-col bg-barra text-barra-texto shadow-alta
          transition-[transform,visibility] duration-200 ease-out lg:visible lg:translate-x-0 lg:shadow-none ${
          abierto ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}>
        <div className="franja-seguridad h-1.5 shrink-0" />
        <div className="flex h-cabecera shrink-0 items-center justify-between px-4">
          <Marca />
          <button ref={botonCerrar} type="button" onClick={cerrar} aria-label="Cerrar menú" className={BOTON_ICONO}>
            <Icono nombre="cerrar" className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-3 py-3">
          <MenuNavegacion grupos={grupos} ruta={ruta} />
        </nav>
        <TarjetaUsuario />
      </aside>

      <main id="contenido" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  )
}
