import type { Alerta } from '@/application/dashboard'
import { vencimientosPorOrigen } from '@/application/dashboard-graficas'

// Barra apilada de vencidos y por vencer, con desglose por origen.
export function BarraVencimientos({ alertas }: { alertas: Alerta[] }) {
  const vencidos = alertas.filter((a) => a.estado === 'vencido').length
  const porVencer = alertas.length - vencidos
  const total = alertas.length
  const desglose = vencimientosPorOrigen(alertas)
  return (
    <div className="kpi tarjeta min-w-0 p-4">
      <h3 className="rotulo">Estado de vencimientos</h3>
      {total === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Nada vencido ni por vencer en los próximos 30 días.</p>
      ) : (
        <>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-3 h-4 w-full" role="img"
            aria-label={`${vencidos} vencidos y ${porVencer} por vencer`}>
            <rect x="0" y="0" width="100" height="10" rx="1" fill="var(--borde)" />
            <rect x="0" y="0" width={(vencidos / total) * 100} height="10" fill="var(--estado-vencido)" />
            <rect x={(vencidos / total) * 100} y="0" width={(porVencer / total) * 100} height="10" fill="var(--estado-por-vencer)" />
          </svg>
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm tabular-nums">
            <span style={{ color: 'var(--estado-vencido)' }}>■ Vencidos: {vencidos}</span>
            <span style={{ color: 'var(--estado-por-vencer)' }}>■ Por vencer: {porVencer}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {desglose.map((d) => (
              <li key={d.origen} className="flex justify-between gap-2">
                <span className="capitalize">{d.origen.replace('_', ' ')}</span>
                <span className="tabular-nums text-texto-suave">{d.vencidos} venc. · {d.porVencer} por venc.</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
