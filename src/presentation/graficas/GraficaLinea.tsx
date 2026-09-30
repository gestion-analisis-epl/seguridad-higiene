import { baseEtiquetaReferencia, maximoRedondeado, segmentosPolilinea } from './geometria'

interface Props {
  titulo: string
  etiquetas: string[]
  valores: (number | null)[]
  referencias?: { valor: number; etiqueta: string }[]
  decimales?: number
}

const ANCHO = 480
const ALTO = 220
const M = { izq: 40, der: 8, arriba: 8, abajo: 24 }

export function GraficaLinea({ titulo, etiquetas, valores, referencias = [], decimales = 2 }: Props) {
  const max = maximoRedondeado(Math.max(0, ...valores.filter((v): v is number => v !== null), ...referencias.map((r) => r.valor)))
  const ancho = ANCHO - M.izq - M.der
  const alto = ALTO - M.arriba - M.abajo
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0
  const y = (v: number) => M.arriba + alto - (v / max) * alto

  return (
    <figure className="tarjeta min-w-0 p-4">
      <figcaption className="rotulo mb-3">{titulo}</figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} width="100%"
        className="block h-auto w-full text-texto-suave">
        <title>{titulo}</title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" strokeOpacity={0.25} />
            <text x={M.izq - 4} y={y(max * f) + 4} textAnchor="end" fontSize="12" fill="currentColor">
              {+(max * f).toFixed(2)}
            </text>
          </g>
        ))}
        {referencias.map((r) => (
          <g key={r.etiqueta}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={y(r.valor)} y2={y(r.valor)} stroke="currentColor"
              strokeDasharray="4 3" strokeOpacity={0.8} />
            <text x={ANCHO - M.der} y={baseEtiquetaReferencia(y(r.valor), 12)} textAnchor="end" fontSize="12" fill="currentColor">{r.etiqueta}</text>
          </g>
        ))}
        <g transform={`translate(${M.izq} ${M.arriba})`} className="text-texto">
          {segmentosPolilinea(valores, ancho, alto, max).map((puntos) => (
            <polyline key={puntos} points={puntos} fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {valores.map((v, i) => v === null ? null : (
            <circle key={etiquetas[i]} cx={i * paso} cy={alto - (v / max) * alto} r={3.5} fill="currentColor"
              stroke="var(--superficie)" strokeWidth={1.5}>
              <title>{`${etiquetas[i]}: ${v.toFixed(decimales)}`}</title>
            </circle>
          ))}
        </g>
        {etiquetas.map((e, i) => (
          <text key={e} x={M.izq + i * paso} y={ALTO - 8} textAnchor="middle" fontSize="12" fill="currentColor">{e}</text>
        ))}
      </svg>
    </figure>
  )
}
