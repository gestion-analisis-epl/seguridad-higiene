import type { CSSProperties } from 'react'
import type { Faltante, TipoFaltante } from '@/application/dashboard-graficas'
import { BarraAnimada } from './BarraAnimada'

const TIPO: Record<TipoFaltante, { texto: string; color: string }> = {
  uniforme: { texto: 'Uniforme', color: 'var(--serie-laboral)' },
  epp: { texto: 'EPP', color: 'var(--serie-trayecto)' },
  capacitacion: { texto: 'Capacitación', color: 'var(--estado-vencido)' },
}

// Artículos que más faltan, en número de colaboradores, para decidir qué reponer.
export function TopFaltantes({ faltantes, etiquetaArticulo, alElegir }: {
  faltantes: Faltante[]
  etiquetaArticulo: (valor: string) => string
  alElegir: (f: Faltante) => void
}) {
  const maximo = Math.max(1, ...faltantes.map((f) => f.personas))
  const usados = Array.from(new Set(faltantes.map((f) => f.tipo)))
  return (
    <div className="kpi tarjeta revelar min-w-0 p-4" style={{ '--i': 5 } as CSSProperties}>
      <h3 className="rotulo">Lo que más falta</h3>
      {faltantes.length === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Sin faltantes.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5">
            {faltantes.map((f, i) => {
              const nombre = etiquetaArticulo(f.articulo)
              return (
                <li key={`${f.tipo}|${f.articulo}`}>
                  <button type="button" onClick={() => alElegir(f)} title={`Ver los ${f.personas} colaboradores: ${nombre}`}
                    className="grid w-full grid-cols-[minmax(5rem,10rem)_1fr_2.5rem] items-center gap-2 rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-superficie-2">
                    <span className="truncate capitalize">{nombre}</span>
                    <BarraAnimada fraccion={f.personas / maximo} color={TIPO[f.tipo].color}
                      etiqueta={`${nombre}: ${f.personas} colaboradores`} retraso={i * 55} />
                    <span className="text-right tabular-nums">{f.personas}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-texto-suave">
            {usados.map((t) => <span key={t} style={{ color: TIPO[t].color }}>■ {TIPO[t].texto}</span>)}
          </p>
        </>
      )}
    </div>
  )
}
