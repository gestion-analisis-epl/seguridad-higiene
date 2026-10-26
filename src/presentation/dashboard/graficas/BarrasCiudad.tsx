'use client'

import { useState, type CSSProperties } from 'react'
import type { ResumenCiudad } from '@/application/dashboard'
import { porcentaje } from '../columnas-operativo'
import { COLOR_SEMAFORO, semaforo, UMBRAL_ATENCION, UMBRAL_BIEN } from '../semaforo'
import { BarraAnimada } from './BarraAnimada'

import type { Indicador as Poblacion } from '@/application/dashboard-graficas'

type Indicador = 'pctCapacitacion' | 'coberturaUniforme' | 'coberturaEpp'

const valorDe = (f: ResumenCiudad, i: Indicador): number | null =>
  i === 'pctCapacitacion' ? f.pctCapacitacion : f[i].fraccion

const INDICADORES: { clave: Indicador; texto: string; poblacion: Poblacion }[] = [
  { clave: 'pctCapacitacion', texto: 'Capacitación', poblacion: 'capacitacion' },
  { clave: 'coberturaUniforme', texto: 'Uniforme', poblacion: 'uniforme' },
  { clave: 'coberturaEpp', texto: 'EPP', poblacion: 'epp' },
]

// Una barra por ciudad, de menor a mayor cumplimiento, para ver de inmediato dónde hay rezago.
export function BarrasCiudad({ filas, etiqueta, alElegir }: {
  filas: ResumenCiudad[]
  etiqueta: (ciudad: string) => string
  alElegir: (ciudad: string, indicador: { texto: string; poblacion: Poblacion }) => void
}) {
  const [indicador, setIndicador] = useState<Indicador>('pctCapacitacion')
  const orden = (f: ResumenCiudad) => valorDe(f, indicador) ?? -1
  const ordenadas = [...filas].sort((a, b) => orden(a) - orden(b) || a.ciudad.localeCompare(b.ciudad))
  return (
    <div className="kpi tarjeta revelar min-w-0 p-4" style={{ '--i': 4 } as CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="rotulo">Cumplimiento por ciudad</h3>
        <div role="group" aria-label="Indicador" className="flex gap-1">
          {INDICADORES.map((i) => (
            <button key={i.clave} type="button" aria-pressed={indicador === i.clave} onClick={() => setIndicador(i.clave)}
              className={`rounded border px-2 py-1 text-xs ${indicador === i.clave ? 'border-primario bg-primario text-primario-texto' : 'border-borde-control'}`}>
              {i.texto}
            </button>
          ))}
        </div>
      </div>
      {ordenadas.length === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Sin colaboradores activos.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {ordenadas.map((f, i) => {
            const valor = valorDe(f, indicador)
            return (
              <li key={f.ciudad}>
              <button type="button" onClick={() => alElegir(f.ciudad, INDICADORES.find((i) => i.clave === indicador)!)}
                title={`Ver los colaboradores de ${etiqueta(f.ciudad)}`}
                className="grid w-full grid-cols-[minmax(5rem,9rem)_1fr_3rem] items-center gap-2 rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-superficie-2">
                <span className="truncate">{etiqueta(f.ciudad)}</span>
                <BarraAnimada fraccion={valor ?? 0} color={valor === null ? 'var(--borde)' : COLOR_SEMAFORO[semaforo(valor)]}
                  etiqueta={valor === null ? `${etiqueta(f.ciudad)}: sin datos` : `${etiqueta(f.ciudad)}: ${porcentaje(valor)}%`}
                  retraso={i * 55} marcas={[UMBRAL_ATENCION, UMBRAL_BIEN]} />
                <span className="text-right tabular-nums">{valor === null ? '—' : `${porcentaje(valor)}%`}</span>
              </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
