'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as TecladoReact } from 'react'
import { useRouter } from 'next/navigation'
import { puede } from '@/domain/permisos'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { Icono } from '@/presentation/ui/Icono'
import { Popover } from '@/presentation/ui/Popover'
import { buscar, seccionesDeGrupos, type ColaboradorBusqueda } from './busqueda'
import { gruposDeNavegacion } from './enlaces'
import { prepararTablaColaboradores, RUTA_COLABORADORES } from './filtro-colaborador'
import { ListaResultados, opcionesDe, type OpcionBusqueda } from './ListaResultados'

const esCampoEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)

export function BuscadorGlobal() {
  const { usuario } = useSesion()
  const router = useRouter()
  const id = useId()
  const idLista = `${id}-lista`
  const idOpcion = useCallback((i: number) => `${id}-op-${i}`, [id])
  const entrada = useRef<HTMLInputElement>(null)
  const ancla = useRef<HTMLDivElement>(null)
  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  const leer = puede(usuario, 'leer')
  const secciones = useMemo(() => seccionesDeGrupos(gruposDeNavegacion(usuario)), [usuario])
  const { registros } = useColeccion(leer ? 'colaboradores' : null)
  const ciudades = useCatalogo(leer ? 'ciudades' : null)
  const colaboradores = useMemo<ColaboradorBusqueda[]>(() => {
    const etiqueta = new Map(ciudades.map((c) => [c.valor, c.etiqueta]))
    return registros.map((r) => {
      const ciudad = typeof r.ciudad === 'string' ? r.ciudad : ''
      return { id: r.id, nombre: String(r.nombre ?? r.id), ciudad: etiqueta.get(ciudad) ?? ciudad, activo: r.activo !== false }
    })
  }, [registros, ciudades])
  const resultados = useMemo(() => buscar(consulta, secciones, colaboradores), [consulta, secciones, colaboradores])
  const opciones = useMemo(() => opcionesDe(resultados), [resultados])
  const total = opciones.length

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      const barra = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !esCampoEditable(e.target)
      if (!ctrlK && !barra) return
      e.preventDefault()
      entrada.current?.focus()
      entrada.current?.select()
      setAbierto(true)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  useEffect(() => {
    if (abierto && total > 0) document.getElementById(idOpcion(activo))?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo, total, idOpcion])

  const cambiarConsulta = (valor: string) => { setConsulta(valor); setActivo(0); setAbierto(true) }

  const elegir = (o: OpcionBusqueda) => {
    setAbierto(false)
    setConsulta('')
    entrada.current?.blur()
    if (o.tipo === 'seccion') { router.push(o.seccion.href); return }
    prepararTablaColaboradores(o.colaborador.nombre)
    router.push(RUTA_COLABORADORES)
  }

  const mover = (paso: number) => {
    if (!abierto) { setAbierto(true); return }
    if (total > 0) setActivo((a) => (a + paso + total) % total)
  }

  const alTeclear = (e: TecladoReact<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mover(e.key === 'ArrowDown' ? 1 : -1) }
    else if (e.key === 'Enter' && abierto && total > 0) { e.preventDefault(); elegir(opciones[Math.min(activo, total - 1)]) }
    else if (e.key === 'Escape') { if (abierto) setAbierto(false); else setConsulta('') }
  }

  const hayConsulta = consulta.trim() !== ''
  return (
    <div className="relative w-full max-w-xl">
      <div ref={ancla} className="relative">
        <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
        <input
          ref={entrada} type="search" role="combobox" autoComplete="off" spellCheck={false}
          aria-label="Buscar secciones y colaboradores" aria-autocomplete="list"
          aria-expanded={abierto} aria-controls={idLista}
          aria-activedescendant={abierto && total > 0 ? idOpcion(Math.min(activo, total - 1)) : undefined}
          placeholder="Buscar…" value={consulta}
          onChange={(e) => cambiarConsulta(e.target.value)}
          onFocus={() => setAbierto(true)} onClick={() => setAbierto(true)}
          onBlur={() => setAbierto(false)} onKeyDown={alTeclear}
          className="control pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-borde-fuerte px-1.5 font-mono text-[0.6875rem] text-texto-suave sm:block">
          /
        </kbd>
      </div>
      {abierto && leer && (
        <Popover ancla={ancla} alCerrar={() => setAbierto(false)} etiqueta="Resultados de búsqueda"
          ancho={Math.max(300, ancla.current?.offsetWidth ?? 0)} altoMax={380}>
          {total > 0 ? (
            <ListaResultados id={idLista} idOpcion={idOpcion} resultados={resultados} consulta={consulta}
              activo={Math.min(activo, total - 1)} alElegir={elegir} alApuntar={setActivo} />
          ) : (
            <p role="status" className="px-3 py-4 text-sm text-texto-suave">
              {hayConsulta ? 'Sin resultados' : 'Escribe para buscar'}
            </p>
          )}
        </Popover>
      )}
    </div>
  )
}
