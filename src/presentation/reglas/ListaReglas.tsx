'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { nivelDe, normalizarPuesto, redundantesEliminables, type Diagnostico, type ReglaDotacion, type TipoRegla } from '@/domain/reglas-dotacion'
import { AvisoError } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { EliminarRedundantes } from './EliminarRedundantes'
import {
  CambiosArticulos, ESTILO_TIPO, etiquetaAlcance, FichasArticulos, InsigniaHallazgo, problemasDe, textoHallazgo,
} from './diagnostico-vista'

interface Props {
  tipo: TipoRegla
  reglas: ReglaDotacion[]
  diagnosticos: Map<string, Diagnostico>
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  articulo: (valor: string) => string
  alEditar: (regla: ReglaDotacion) => void
  alNueva: (puesto: { linea_negocio: string; puesto_etiqueta: string }) => void
  alEliminar: (id: string) => Promise<void>
  alEliminarVarias: (ids: string[]) => Promise<void>
}

interface GrupoPuesto { clave: string; linea: string; puesto: string; reglas: ReglaDotacion[] }

const SANGRIA = ['', 'pl-10', 'pl-10', 'pl-16']

export function ListaReglas({ tipo, reglas, diagnosticos, lineas, ciudades, areas, etiquetaDe, articulo, alEditar, alNueva, alEliminar, alEliminarVarias }: Props) {
  const estilo = ESTILO_TIPO[tipo]
  const [texto, setTexto] = useState('')
  const [linea, setLinea] = useState('')
  const [soloProblemas, setSoloProblemas] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const grupos = useMemo(() => {
    const q = normalizarPuesto(texto)
    const alcance = (r: ReglaDotacion) => etiquetaAlcance(r, ciudades, areas, etiquetaDe)
    const porPuesto = new Map<string, GrupoPuesto>()
    for (const r of reglas) {
      const d = diagnosticos.get(r.id)
      if ((linea && r.linea_negocio !== linea) || (q && !r.puesto.includes(q)) || (soloProblemas && (!d || problemasDe(d).length === 0))) continue
      const clave = `${r.linea_negocio}|${r.puesto}`
      const grupo = porPuesto.get(clave) ?? { clave, linea: r.linea_negocio, puesto: r.puesto_etiqueta, reglas: [] }
      grupo.reglas.push(r)
      porPuesto.set(clave, grupo)
    }
    for (const g of porPuesto.values()) g.reglas.sort((a, b) => nivelDe(a) - nivelDe(b) || alcance(a).localeCompare(alcance(b), 'es'))
    return Array.from(porPuesto.values()).sort((a, b) =>
      etiquetaDe(lineas, a.linea).localeCompare(etiquetaDe(lineas, b.linea), 'es') || a.puesto.localeCompare(b.puesto, 'es'))
  }, [reglas, diagnosticos, texto, linea, soloProblemas, lineas, ciudades, areas, etiquetaDe])

  const contexto = useMemo(() => ({
    articulo, alcance: (r: ReglaDotacion) => etiquetaAlcance(r, ciudades, areas, etiquetaDe),
    regla: (id: string) => reglas.find((r) => r.id === id),
  }), [articulo, ciudades, areas, etiquetaDe, reglas])

  async function eliminar(id: string) {
    setError(null)
    try { await alEliminar(id); setConfirmando(null) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar') }
  }

  const redundantes = useMemo(() => redundantesEliminables(diagnosticos), [diagnosticos])
  const dependientes = (id: string) => Array.from(diagnosticos.values()).filter((d) => d.previas.some((p) => p.id === id)).length

  return (
    <section aria-labelledby={`definidas-${tipo}`}>
      <h2 id={`definidas-${tipo}`} className="mb-2 text-base">Reglas de {estilo.singular} definidas ({reglas.length})</h2>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input type="search" aria-label="Buscar puesto" placeholder="Buscar puesto" className="control max-w-xs"
          value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select aria-label="Filtrar por empresa" className="control max-w-xs" value={linea} onChange={(e) => setLinea(e.target.value)}>
          <option value="">Todas las empresas</option>
          {lineas.map((l) => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)}
        </select>
        <EliminarRedundantes cantidad={redundantes.length} alcance={`de ${estilo.singular}`} compacto
          alConfirmar={() => alEliminarVarias(redundantes.map((r) => r.id))} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="casilla" checked={soloProblemas} onChange={(e) => setSoloProblemas(e.target.checked)} />
          Solo con avisos
        </label>
      </div>
      {error && <div className="mb-3"><AvisoError>{error}</AvisoError></div>}
      {grupos.length === 0 && <p className="tarjeta p-4 text-sm text-texto-suave">No hay reglas para mostrar.</p>}
      <div className="space-y-3">
        {grupos.map((g) => {
          const plazas = Array.from(new Set(g.reglas.flatMap((r) => (r.ciudad ? [r.ciudad] : []))))
          const plegable = plazas.length > 1
          const avisos = g.reglas.reduce((n, r) => n + (diagnosticos.get(r.id) ? problemasDe(diagnosticos.get(r.id)!).length : 0), 0)
          const titulo = (
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{g.puesto}</h3>
              <p className="text-xs text-texto-suave">
                {etiquetaDe(lineas, g.linea)}
                {plegable && ` · ${g.reglas.length} reglas en ${plazas.length} ciudades: ${plazas.map((c) => etiquetaDe(ciudades, c)).join(', ')}`}
              </p>
            </div>
          )
          const delPuesto = redundantes.filter((r) => `${r.linea_negocio}|${r.puesto}` === g.clave)
          const nuevaRegla = (
            <span className="flex flex-wrap items-center gap-2">
              <button type="button" className="boton-secundario min-h-0 py-1 text-xs"
                onClick={() => alNueva({ linea_negocio: g.linea, puesto_etiqueta: g.puesto })}>
                <Icono nombre="mas" className="h-3.5 w-3.5" />Regla para este puesto
              </button>
              <EliminarRedundantes cantidad={delPuesto.length} alcance="de este puesto" compacto
                alConfirmar={() => alEliminarVarias(delPuesto.map((r) => r.id))} />
            </span>
          )
          const cuerpo = (
            <ul className="divide-y divide-borde">
              {g.reglas.map((r) => {
                const d = diagnosticos.get(r.id)
                const nivel = nivelDe(r)
                const nuevos = d ? r.agrega.filter((a) => !d.heredados.includes(a)) : r.agrega
                const quitados = d ? r.quita.filter((a) => d.heredados.includes(a)) : []
                const hijos = dependientes(r.id)
                return (
                  <li key={r.id} className={`grid gap-2 py-3 pr-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${nivel === 0 ? 'pl-4' : SANGRIA[nivel]}`}>
                    <div className="min-w-0 space-y-1.5">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {nivel > 0 && <span aria-hidden="true" className="-ml-5 w-3 text-texto-suave">↳</span>}
                        <span className="font-medium">{etiquetaAlcance(r, ciudades, areas, etiquetaDe)}</span>
                        {d && <span className="text-xs text-texto-suave">{d.colaboradores} colaboradores</span>}
                        {d?.hallazgos.map((h, i) => <InsigniaHallazgo key={`${h.codigo}${i}`} codigo={h.codigo} gravedad={h.gravedad} />)}
                      </p>
                      {nivel === 0
                        ? <FichasArticulos articulos={r.agrega} articulo={articulo} vacio="Sin artículos obligatorios" />
                        : <CambiosArticulos agrega={nuevos} quita={quitados} articulo={articulo} />}
                      {nivel > 0 && d && <p className="text-xs text-texto-suave">Recibe: {d.efectivos.map(articulo).join(', ') || 'ninguno'}</p>}
                      {d && d.hallazgos.length > 0 && (
                        <ul className="space-y-0.5 text-xs text-texto-suave">
                          {d.hallazgos.map((h, i) => <li key={`${h.codigo}${i}`}>{textoHallazgo(h, contexto)}</li>)}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button type="button" className="boton-secundario" onClick={() => alEditar(r)}>Editar</button>
                      {confirmando === r.id ? (
                        <span className="flex items-center gap-2">
                          <button type="button" className="boton-secundario border-error text-error" onClick={() => void eliminar(r.id)}>
                            {hijos > 0 ? `Confirmar (${hijos} dependen)` : 'Confirmar'}
                          </button>
                          <button type="button" className="boton-secundario" onClick={() => setConfirmando(null)}>No</button>
                        </span>
                      ) : (
                        <button type="button" className="boton-secundario text-error" onClick={() => setConfirmando(r.id)}>Eliminar</button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )
          return plegable ? (
            <details key={g.clave} className={`group tarjeta border-l-4 ${estilo.franja}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
                {titulo}
                <span className="flex shrink-0 items-center gap-2">
                  {avisos > 0 && <span className="insignia-por-vencer">{avisos} avisos</span>}
                  <Icono nombre="chevron" className="h-4 w-4 text-texto-suave transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="border-t border-borde px-4 py-2">{nuevaRegla}</div>
              <div className="border-t border-borde">{cuerpo}</div>
            </details>
          ) : (
            <article key={g.clave} className={`tarjeta border-l-4 ${estilo.franja}`}>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-2">
                {titulo}
                {nuevaRegla}
              </header>
              {cuerpo}
            </article>
          )
        })}
      </div>
    </section>
  )
}
