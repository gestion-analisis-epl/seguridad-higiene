import { maximoRedondeado } from './geometria'

interface Props {
  titulo: string
  datos: { etiqueta: string; valores: number[] }[]
  series: { etiqueta: string; color: string }[]
}

const ANCHO = 480
const ALTO = 220
const MARGEN = { izq: 32, abajo: 24, arriba: 8 }

export function GraficaBarrasApiladas({ titulo, datos, series }: Props) {
  const totales = datos.map((d) => d.valores.reduce((a, b) => a + b, 0))
  const max = maximoRedondeado(Math.max(0, ...totales))
  const alto = ALTO - MARGEN.abajo - MARGEN.arriba
  const paso = (ANCHO - MARGEN.izq) / Math.max(datos.length, 1)
  const ancho = paso * 0.6

  return (
    <figure className="tarjeta min-w-0 p-4">
      <figcaption className="rotulo mb-3">{titulo}</figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} width="100%"
        className="block h-auto w-full text-texto-suave">
        <title>{titulo}</title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={MARGEN.izq} x2={ANCHO} y1={MARGEN.arriba + alto * (1 - f)} y2={MARGEN.arriba + alto * (1 - f)}
              stroke="currentColor" strokeOpacity={0.25} />
            <text x={MARGEN.izq - 4} y={MARGEN.arriba + alto * (1 - f) + 4} textAnchor="end" fontSize="12" fill="currentColor">
              {+(max * f).toFixed(2)}
            </text>
          </g>
        ))}
        {datos.map((d, i) => {
          let acumulado = 0
          const x = MARGEN.izq + i * paso + (paso - ancho) / 2
          return (
            <g key={d.etiqueta}>
              {d.valores.map((v, s) => {
                const h = (v / max) * alto
                const y = MARGEN.arriba + alto - ((acumulado + v) / max) * alto
                acumulado += v
                return h > 0 ? (
                  <rect key={series[s].etiqueta} x={x} y={y} width={ancho} height={h} fill={series[s].color}
                    stroke="var(--superficie)" strokeWidth={1}>
                    <title>{`${d.etiqueta}: ${series[s].etiqueta} ${v}`}</title>
                  </rect>
                ) : null
              })}
              <text x={x + ancho / 2} y={ALTO - 8} textAnchor="middle" fontSize="12" fill="currentColor">{d.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <ul aria-label="Leyenda" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.etiqueta}
          </li>
        ))}
      </ul>
    </figure>
  )
}
