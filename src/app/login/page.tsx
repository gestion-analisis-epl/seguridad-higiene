'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { Icono } from '@/presentation/ui/Icono'

const AREAS = ['Capacitaciones', 'Uniformes y EPP', 'Accidentes', 'Equipo y vehículos', 'Indicadores ILI']

export default function LoginPage() {
  const { cargando, acceso, iniciarSesion } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && acceso !== 'sin_sesion') router.replace('/')
  }, [cargando, acceso, router])

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-hidden="true" className="relative flex flex-col bg-barra text-barra-texto">
        <div className="franja-seguridad h-2" />
        <div className="flex flex-1 flex-col justify-between gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-14">
          <span className="grid h-11 w-11 place-items-center rounded bg-acento text-acento-texto">
            <Icono nombre="escudo" className="h-6 w-6" />
          </span>
          <ul className="hidden space-y-3 border-l border-barra-borde pl-5 font-mono text-xs uppercase tracking-[0.14em] text-barra-suave lg:block">
            {AREAS.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </section>

      <section className="flex items-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="aparecer w-full max-w-sm">
          <p className="rotulo">Control interno</p>
          <h1 className="mt-2 text-3xl text-texto sm:text-4xl">Seguridad e Higiene</h1>
          <p className="mt-3 text-sm leading-relaxed text-texto-suave">
            Captura y seguimiento por ciudad. Entra con tu cuenta de Google de la empresa.
          </p>
          <button type="button" onClick={() => void iniciarSesion()} className="boton-primario mt-8 w-full">
            <Icono nombre="entrar" />
            Iniciar sesión con Google
          </button>
        </div>
      </section>
    </main>
  )
}
