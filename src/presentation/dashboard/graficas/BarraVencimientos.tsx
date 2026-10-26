'use client'

import type { Alerta } from '@/application/dashboard'
import { vencimientosPorOrigen } from '@/application/dashboard-graficas'
import { useMontado } from '@/presentation/ui/useConteo'

// Barra apilada de vencidos y por vencer, con desglose por origen.
export function BarraVencimientos({ alertas, alElegir }: { alertas: Alerta[]; alElegir?: () => void }) {
  const vencidos = alertas.filter((a) => a.estado === 'vencido').length
  const porVencer = alertas.length - vencidos
  const total = alertas.length
  const desglose = vencimientosPorOrigen(alertas)
  const montado = useMontado()
  const tramo = (n: number) => `${montado && total > 0 ? (n / total) * 100 : 0}%`
  const crecer = (retraso: number) => ({ transition: 'width 800ms cubic-bezier(0.2, 0.7, 0.2, 1)', transitionDelay: `${retraso}ms` })
  return (
    <div className="kpi tarjeta min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="rotulo">Estado de vencimientos</h3>
        {alElegir && total > 0 && <button type="button" className="text-xs underline" onClick={alElegir}>Ver detalle</button>}
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Nada vencido ni por vencer en los próximos 30 días.</p>
      ) : (
        <>
          <div role="img" aria-label={`${vencidos} vencidos y ${porVencer} por vencer`}
            className="mt-3 flex h-4 w-full overflow-hidden rounded-sm bg-borde">
            <div className="barra-viva h-full" style={{ width: tramo(vencidos), background: 'var(--estado-vencido)', ...crecer(0) }} />
            <div className="barra-viva h-full" style={{ width: tramo(porVencer), background: 'var(--estado-por-vencer)', ...crecer(120) }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm tabular-nums">
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--estado-vencido)' }}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full bg-current ${vencidos > 0 ? 'latido' : ''}`} />Vencidos: {vencidos}
            </span>
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--estado-por-vencer)' }}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />Por vencer: {porVencer}
            </span>
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
