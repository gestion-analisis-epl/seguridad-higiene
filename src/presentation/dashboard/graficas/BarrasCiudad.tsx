'use client'

import { useState } from 'react'
import type { ResumenCiudad } from '@/application/dashboard'
import { porcentaje } from '../columnas-operativo'
import { COLOR_SEMAFORO, semaforo } from '../semaforo'

import type { Indicador as Poblacion } from '@/application/dashboard-graficas'

type Indicador = 'pctCapacitacion' | 'pctUniforme' | 'pctEpp'

const INDICADORES: { clave: Indicador; texto: string; poblacion: Poblacion }[] = [
  { clave: 'pctCapacitacion', texto: 'Capacitación', poblacion: 'capacitacion' },
  { clave: 'pctUniforme', texto: 'Uniforme', poblacion: 'uniforme' },
  { clave: 'pctEpp', texto: 'EPP', poblacion: 'epp' },
]

// Una barra por ciudad, de menor a mayor cumplimiento, para ver de inmediato dónde hay rezago.
export function BarrasCiudad({ filas, etiqueta, alElegir }: {
  filas: ResumenCiudad[]
  etiqueta: (ciudad: string) => string
  alElegir: (ciudad: string, indicador: { texto: string; poblacion: Poblacion }) => void
}) {
  const [indicador, setIndicador] = useState<Indicador>('pctCapacitacion')
  const orden = (f: ResumenCiudad) => f[indicador] ?? -1
  const ordenadas = [...filas].sort((a, b) => orden(a) - orden(b) || a.ciudad.localeCompare(b.ciudad))
  return (
    <div className="kpi tarjeta min-w-0 p-4">
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
        <ul className="mt-3 space-y-2">
          {ordenadas.map((f) => {
            const valor = f[indicador]
            const fuera = indicador !== 'pctCapacitacion' && f.sinRegla > 0 ? ` · ${f.sinRegla} sin regla` : ''
            return (
              <li key={f.ciudad}>
              <button type="button" onClick={() => alElegir(f.ciudad, INDICADORES.find((i) => i.clave === indicador)!)}
                title={`Ver los colaboradores de ${etiqueta(f.ciudad)}${fuera}`}
                className="grid w-full grid-cols-[minmax(5rem,9rem)_1fr_3rem] items-center gap-2 rounded text-left text-sm hover:bg-superficie-2">
                <span className="truncate">{etiqueta(f.ciudad)}</span>
                <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-3 w-full" role="img"
                  aria-label={valor === null ? `${etiqueta(f.ciudad)}: sin reglas` : `${etiqueta(f.ciudad)}: ${porcentaje(valor)}%${fuera}`}>
                  <rect width="100" height="8" fill="var(--borde)" />
                  {valor !== null && <rect width={valor * 100} height="8" fill={COLOR_SEMAFORO[semaforo(valor)]} />}
                </svg>
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
