'use client'

import type { CSSProperties } from 'react'
import { useConteo } from '@/presentation/ui/useConteo'
import { porcentaje } from '../columnas-operativo'
import { COLOR_SEMAFORO, semaforo, TEXTO_SEMAFORO, UMBRAL_BIEN } from '../semaforo'

const RADIO = 42
const CIRCUNFERENCIA = 2 * Math.PI * RADIO
const ANGULO_META = (UMBRAL_BIEN * 360 - 90) * (Math.PI / 180)
const PUNTO = (radio: number) => [50 + radio * Math.cos(ANGULO_META), 50 + radio * Math.sin(ANGULO_META)] as const

const TARJETA = 'kpi tarjeta revelar flex min-w-0 flex-col items-center p-4 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-alta'

// Anillo de cumplimiento: se llena al aparecer y marca la meta; el color y la etiqueta evitan depender solo del color.
export function Medidor({ rotulo, fraccion, detalle, indice = 0, alElegir }: {
  rotulo: string
  fraccion: number | null
  detalle?: string
  indice?: number
  alElegir?: () => void
}) {
  const figura = <Figura rotulo={rotulo} fraccion={fraccion} detalle={detalle} indice={indice} />
  if (!alElegir) return figura
  return (
    <button type="button" onClick={alElegir} title={`Ver los colaboradores: ${rotulo}`}
      className="block min-w-0 rounded text-left [&>figure]:h-full">
      {figura}
    </button>
  )
}

function Figura({ rotulo, fraccion, detalle, indice }: { rotulo: string; fraccion: number | null; detalle?: string; indice: number }) {
  const valor = fraccion === null ? 0 : Math.min(Math.max(fraccion, 0), 1)
  const animado = useConteo(valor * 100)
  const nivel = semaforo(valor)
  const color = fraccion === null ? 'var(--borde-fuerte)' : COLOR_SEMAFORO[nivel]
  const [x1, y1] = PUNTO(RADIO - 8)
  const [x2, y2] = PUNTO(RADIO + 8)
  const turno = { '--i': indice, borderTop: `3px solid ${color}` } as CSSProperties
  return (
    <figure
      className={TARJETA} style={turno}
      aria-label={fraccion === null ? `${rotulo}: sin datos` : `${rotulo}: ${porcentaje(valor)}%, ${TEXTO_SEMAFORO[nivel]}`}
    >
      <svg viewBox="0 0 100 100" className="h-28 w-28" role="img" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIO} fill="none" stroke="var(--borde)" strokeWidth="10" />
        {fraccion !== null && (
          <>
            <circle
              cx="50" cy="50" r={RADIO} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(animado / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`} transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 55%, transparent))` }}
            />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--texto)" strokeWidth="1.5" opacity="0.6">
              <title>Meta {Math.round(UMBRAL_BIEN * 100)}%</title>
            </line>
          </>
        )}
        <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--texto)">
          {fraccion === null ? '—' : `${Math.round(animado)}%`}
        </text>
      </svg>
      <figcaption className="mt-2 text-center">
        <span className="rotulo block">{rotulo}</span>
        <span className="text-xs font-medium" style={{ color: fraccion === null ? undefined : color }}>
          {fraccion === null ? 'Sin datos' : TEXTO_SEMAFORO[nivel]}
        </span>
        {detalle && <span className="block text-xs text-texto-suave">{detalle}</span>}
      </figcaption>
    </figure>
  )
}
