'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { normalizarPuesto, type ReglaDotacion } from '@/domain/reglas-dotacion'
import { AvisoError } from '@/presentation/ui/Estado'

interface Props {
  reglas: ReglaDotacion[]
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  prendas: Opcion[]
  tiposEpp: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alEditar: (regla: ReglaDotacion) => void
  alEliminar: (id: string) => Promise<void>
}

export function ListaReglas({ reglas, lineas, ciudades, areas, prendas, tiposEpp, etiquetaDe, alEditar, alEliminar }: Props) {
  const [texto, setTexto] = useState('')
  const [linea, setLinea] = useState('')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibles = useMemo(() => {
    const q = normalizarPuesto(texto)
    return reglas
      .filter((r) => (!linea || r.linea_negocio === linea) && (!q || r.puesto.includes(q)))
      .sort((a, b) => a.linea_negocio.localeCompare(b.linea_negocio) || a.puesto.localeCompare(b.puesto)
        || (a.ciudad ?? '').localeCompare(b.ciudad ?? '') || (a.area ?? '').localeCompare(b.area ?? ''))
  }, [reglas, texto, linea])

  async function eliminar(id: string) {
    setError(null)
    try { await alEliminar(id); setConfirmando(null) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar') }
  }

  const articulos = (valores: string[], opciones: Opcion[]) => valores.map((v) => etiquetaDe(opciones, v)).join(', ') || 'Ninguno'

  return (
    <section>
      <h2 className="mb-2 text-base">Definidas ({reglas.length})</h2>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input type="search" aria-label="Buscar puesto" placeholder="Buscar puesto" className="control max-w-xs"
          value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select aria-label="Filtrar por empresa" className="control max-w-xs" value={linea} onChange={(e) => setLinea(e.target.value)}>
          <option value="">Todas las empresas</option>
          {lineas.map((l) => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)}
        </select>
      </div>
      {error && <div className="mb-3"><AvisoError>{error}</AvisoError></div>}
      <ul className="tarjeta divide-y divide-borde">
        {visibles.length === 0 && <li className="p-4 text-sm text-texto-suave">No hay reglas para mostrar.</li>}
        {visibles.map((r) => (
          <li key={r.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="font-medium">{r.puesto_etiqueta}</p>
              <p className="text-xs text-texto-suave">
                {etiquetaDe(lineas, r.linea_negocio)} · {r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las plazas'} · {r.area ? etiquetaDe(areas, r.area) : 'Todas las áreas'}
              </p>
              <p className="mt-1 text-sm">Uniforme: {articulos(r.prendas, prendas)}</p>
              <p className="text-sm">EPP: {articulos(r.tipos_epp, tiposEpp)}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="boton-secundario" onClick={() => alEditar(r)}>Editar</button>
              {confirmando === r.id ? (
                <button type="button" className="boton-secundario border-error text-error" onClick={() => void eliminar(r.id)}>Confirmar</button>
              ) : (
                <button type="button" className="boton-secundario text-error" onClick={() => setConfirmando(r.id)}>Eliminar</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
