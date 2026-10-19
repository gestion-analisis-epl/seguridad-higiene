'use client'

import { useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import type { CombinacionPendiente } from '@/domain/reglas-dotacion'

const clave = (p: CombinacionPendiente) => `${p.linea_negocio}|${p.puesto}|${p.ciudad}`

interface Props {
  pendientes: CombinacionPendiente[]
  lineas: Opcion[]
  ciudades: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alDefinir: (p: CombinacionPendiente) => void
  alDefinirVarias: (ps: CombinacionPendiente[]) => void
}

export function ListaPorDefinir({ pendientes, lineas, ciudades, etiquetaDe, alDefinir, alDefinirVarias }: Props) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const elegidas = pendientes.filter((p) => marcadas.has(clave(p)))

  function alternar(p: CombinacionPendiente) {
    const siguiente = new Set(marcadas)
    if (siguiente.has(clave(p))) siguiente.delete(clave(p))
    else siguiente.add(clave(p))
    setMarcadas(siguiente)
  }

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="text-base">Por definir ({pendientes.length})</h2>
        <button type="button" className="boton-secundario" disabled={elegidas.length === 0}
          onClick={() => { alDefinirVarias(elegidas); setMarcadas(new Set()) }}>
          Definir seleccionadas ({elegidas.length})
        </button>
      </div>
      <ul className="tarjeta divide-y divide-borde">
        {pendientes.length === 0 && <li className="p-4 text-sm text-texto-suave">Todos los colaboradores activos tienen regla.</li>}
        {pendientes.map((p) => (
          <li key={clave(p)} className="grid gap-2 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <input type="checkbox" className="casilla" aria-label={`Seleccionar ${p.puesto_etiqueta} en ${etiquetaDe(ciudades, p.ciudad)}`}
              checked={marcadas.has(clave(p))} onChange={() => alternar(p)} />
            <div className="min-w-0">
              <p className="font-medium">{p.puesto_etiqueta}</p>
              <p className="text-xs text-texto-suave">
                {etiquetaDe(lineas, p.linea_negocio)} · {etiquetaDe(ciudades, p.ciudad)} · {p.colaboradores} colaboradores
              </p>
            </div>
            <button type="button" className="boton-primario" onClick={() => alDefinir(p)}>Definir</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
