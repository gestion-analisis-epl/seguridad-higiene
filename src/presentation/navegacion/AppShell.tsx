'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { Icono } from '@/presentation/ui/Icono'
import { usePersistente } from '@/presentation/ui/usePersistente'
import { gruposDeNavegacion } from './enlaces'
import { BuscadorGlobal } from './BuscadorGlobal'
import { Marca } from './Marca'
import { MenuNavegacion } from './MenuNavegacion'
import { TarjetaUsuario } from './TarjetaUsuario'
import { useMenuMovil } from './useMenuMovil'

const BOTON_MENU = 'grid h-10 w-10 shrink-0 place-items-center rounded text-texto hover:bg-superficie-2 lg:hidden'
const esBooleano = (v: unknown): v is boolean => typeof v === 'boolean'
const BOTON_ICONO = 'grid h-10 w-10 place-items-center rounded text-barra-texto hover:bg-barra-2 lg:hidden'

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, cerrarSesion } = useSesion()
  const ruta = usePathname() ?? '/'
  const grupos = useMemo(() => gruposDeNavegacion(usuario), [usuario])
  const { abierto, abrir, cerrar, botonAbrir, botonCerrar } = useMenuMovil(ruta)
  // La barra solo se contrae en escritorio; el menú móvil siempre se abre completo
  const [contraida, setContraida] = usePersistente<boolean>('barra-contraida', false, esBooleano)

  return (
    <div className={`min-h-screen transition-[padding] duration-200 motion-reduce:transition-none ${contraida ? 'lg:pl-barra-mini' : 'lg:pl-barra'}`}>
      <a href="#contenido"
        className="sr-only z-[60] rounded bg-acento px-3 py-2 text-sm font-medium text-acento-texto focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 flex h-cabecera items-center gap-2 border-b border-borde bg-superficie px-3 sm:px-6 lg:px-10">
        <button ref={botonAbrir} type="button" onClick={abrir} aria-expanded={abierto} aria-controls="navegacion"
          aria-label="Abrir menú" className={BOTON_MENU}>
          <Icono nombre="menu" className="h-5 w-5" />
        </button>
        <BuscadorGlobal />
        <button type="button" onClick={() => void cerrarSesion()} aria-label="Cerrar sesión" title="Cerrar sesión"
          className={`${BOTON_MENU} ml-auto`}>
          <Icono nombre="salir" className="h-5 w-5" />
        </button>
      </header>

      {abierto && <div aria-hidden="true" onClick={cerrar} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}

      <aside id="navegacion" aria-label="Navegación principal"
        className={`zona-barra fixed inset-y-0 left-0 z-50 flex w-barra max-w-[85vw] flex-col bg-barra text-barra-texto shadow-alta
          transition-[transform,visibility,width] duration-200 ease-out motion-reduce:transition-none lg:visible lg:translate-x-0 lg:shadow-none ${
          contraida ? 'lg:w-barra-mini' : ''
        } ${
          abierto ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}>
        <div className="franja-seguridad h-1.5 shrink-0" />
        <div className={`flex h-cabecera shrink-0 items-center justify-between px-4 ${contraida ? 'lg:justify-center lg:px-0' : ''}`}>
          <Marca compacta={contraida} />
          <button ref={botonCerrar} type="button" onClick={cerrar} aria-label="Cerrar menú" className={BOTON_ICONO}>
            <Icono nombre="cerrar" className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Secciones" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          <MenuNavegacion grupos={grupos} ruta={ruta} compacta={contraida} />
        </nav>
        <div className="hidden px-3 pb-2 lg:block">
          <button type="button" onClick={() => setContraida((c) => !c)} aria-expanded={!contraida} aria-controls="navegacion"
            aria-label={contraida ? 'Expandir barra lateral' : 'Contraer barra lateral'} title={contraida ? 'Expandir' : 'Contraer'}
            className={`flex min-h-[2.25rem] w-full items-center gap-3 rounded px-3 text-sm text-barra-suave transition-colors hover:bg-barra-2 hover:text-barra-texto ${contraida ? 'justify-center px-0' : ''}`}>
            <Icono nombre={contraida ? 'pag-ultima' : 'pag-primera'} />
            {!contraida && <span>Contraer</span>}
          </button>
        </div>
        <TarjetaUsuario compacta={contraida} />
      </aside>

      <main id="contenido" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  )
}
