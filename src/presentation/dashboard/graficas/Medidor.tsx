import { porcentaje } from '../columnas-operativo'
import { COLOR_SEMAFORO, semaforo, TEXTO_SEMAFORO } from '../semaforo'

const RADIO = 42
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

// Anillo de cumplimiento; el color y la etiqueta de estado evitan depender solo del color.
export function Medidor({ rotulo, fraccion }: { rotulo: string; fraccion: number | null }) {
  if (fraccion === null) {
    return (
      <figure className="kpi tarjeta flex min-w-0 flex-col items-center p-4" aria-label={`${rotulo}: sin datos, ninguna regla definida`}>
        <svg viewBox="0 0 100 100" className="h-28 w-28" role="img" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIO} fill="none" stroke="var(--borde)" strokeWidth="10" />
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--texto)">—</text>
        </svg>
        <figcaption className="mt-2 text-center">
          <span className="rotulo block">{rotulo}</span>
          <span className="text-xs font-medium text-texto-suave">Sin reglas definidas</span>
        </figcaption>
      </figure>
    )
  }
  const valor = Math.min(Math.max(fraccion, 0), 1)
  const nivel = semaforo(valor)
  return (
    <figure className="kpi tarjeta flex min-w-0 flex-col items-center p-4" aria-label={`${rotulo}: ${porcentaje(valor)}%, ${TEXTO_SEMAFORO[nivel]}`}>
      <svg viewBox="0 0 100 100" className="h-28 w-28" role="img" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIO} fill="none" stroke="var(--borde)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={RADIO} fill="none" stroke={COLOR_SEMAFORO[nivel]} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${valor * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`} transform="rotate(-90 50 50)"
        />
        <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--texto)">{porcentaje(valor)}%</text>
      </svg>
      <figcaption className="mt-2 text-center">
        <span className="rotulo block">{rotulo}</span>
        <span className="text-xs font-medium" style={{ color: COLOR_SEMAFORO[nivel] }}>{TEXTO_SEMAFORO[nivel]}</span>
      </figcaption>
    </figure>
  )
}
