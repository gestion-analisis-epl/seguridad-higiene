'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import type { Diagnostico, Gravedad, Hallazgo, ReglaDotacion, TipoRegla } from '@/domain/reglas-dotacion'
import { EliminarRedundantes } from './EliminarRedundantes'
import { etiquetaAlcance, InsigniaHallazgo, InsigniaTipo, textoHallazgo, type ContextoTexto } from './diagnostico-vista'

export interface ItemRevision { tipo: TipoRegla; diagnostico: Diagnostico; hallazgo: Hallazgo }

interface Props {
  items: ItemRevision[]
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  contexto: Record<TipoRegla, ContextoTexto>
  alEditar: (tipo: TipoRegla, regla: ReglaDotacion) => void
  alEliminar: (tipo: TipoRegla, id: string) => Promise<void>
  redundantes: Record<TipoRegla, number>
  alEliminarVarias: (tipo: TipoRegla, ids: string[]) => Promise<void>
  idsRedundantes: (tipo: TipoRegla) => string[]
}

const PESO: Record<Gravedad, number> = { error: 0, aviso: 1, info: 2 }

export function Revision({ items, lineas, ciudades, areas, etiquetaDe, contexto, alEditar, alEliminar, redundantes, alEliminarVarias, idsRedundantes }: Props) {
  const [gravedad, setGravedad] = useState<'' | Gravedad>('')
  const [tipo, setTipo] = useState<'' | TipoRegla>('')
  const [fallo, setFallo] = useState<string | null>(null)

  const visibles = useMemo(() => items
    .filter((i) => (!gravedad || i.hallazgo.gravedad === gravedad) && (!tipo || i.tipo === tipo))
    .sort((a, b) => PESO[a.hallazgo.gravedad] - PESO[b.hallazgo.gravedad]
      || a.diagnostico.regla.puesto_etiqueta.localeCompare(b.diagnostico.regla.puesto_etiqueta, 'es')), [items, gravedad, tipo])

  const errores = items.filter((i) => i.hallazgo.gravedad === 'error').length

  async function eliminar(t: TipoRegla, id: string) {
    setFallo(null)
    try { await alEliminar(t, id) } catch (e) { setFallo(e instanceof Error ? e.message : 'No se pudo eliminar') }
  }

  return (
    <section className="space-y-3" aria-labelledby="revision-titulo">
      <div>
        <h2 id="revision-titulo" className="text-base">Revisión de reglas</h2>
        <p className="text-sm text-texto-suave">
          {items.length === 0
            ? 'Ninguna regla se duplica, se contradice ni queda sin efecto.'
            : `${items.length} avisos${errores > 0 ? `, ${errores} conflictos que requieren decisión` : ''}.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <select aria-label="Filtrar por gravedad" className="control max-w-xs" value={gravedad} onChange={(e) => setGravedad(e.target.value as '' | Gravedad)}>
          <option value="">Conflictos y avisos</option>
          <option value="error">Solo conflictos</option>
          <option value="aviso">Solo avisos</option>
        </select>
        <select aria-label="Filtrar por tipo" className="control max-w-xs" value={tipo} onChange={(e) => setTipo(e.target.value as '' | TipoRegla)}>
          <option value="">Uniformes y EPP</option>
          <option value="uniforme">Solo uniformes</option>
          <option value="epp">Solo EPP</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {(['uniforme', 'epp'] as TipoRegla[]).map((t) => (
          <EliminarRedundantes key={t} cantidad={redundantes[t]} alcance={`de ${t === 'epp' ? 'EPP' : 'uniforme'}`}
            alConfirmar={() => alEliminarVarias(t, idsRedundantes(t))} />
        ))}
      </div>
      {fallo && <p role="alert" className="aviso-error">{fallo}</p>}
      {visibles.length > 0 && (
        <ul className="tarjeta divide-y divide-borde">
          {visibles.map((i, n) => {
            const r = i.diagnostico.regla
            return (
              <li key={`${i.tipo}${r.id}${i.hallazgo.codigo}${n}`} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <InsigniaTipo tipo={i.tipo} />
                    <InsigniaHallazgo codigo={i.hallazgo.codigo} gravedad={i.hallazgo.gravedad} />
                    <span className="font-medium">{r.puesto_etiqueta}</span>
                    <span className="text-xs text-texto-suave">{etiquetaDe(lineas, r.linea_negocio)} · {etiquetaAlcance(r, ciudades, areas, etiquetaDe)}</span>
                  </p>
                  <p className="text-sm text-texto-suave">{textoHallazgo(i.hallazgo, contexto[i.tipo])}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="boton-secundario" onClick={() => alEditar(i.tipo, r)}>Editar</button>
                  {i.hallazgo.codigo === 'redundante' && i.hallazgo.articulos.length === 0 && (
                    <button type="button" className="boton-secundario text-error" onClick={() => void eliminar(i.tipo, r.id)}>Eliminar</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
