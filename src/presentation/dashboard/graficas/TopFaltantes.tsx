import type { Faltante, TipoFaltante } from '@/application/dashboard-graficas'

const TIPO: Record<TipoFaltante, { texto: string; color: string }> = {
  uniforme: { texto: 'Uniforme', color: 'var(--serie-laboral)' },
  epp: { texto: 'EPP', color: 'var(--serie-trayecto)' },
  capacitacion: { texto: 'Capacitación', color: 'var(--estado-vencido)' },
}

// Artículos que más faltan, en número de colaboradores, para decidir qué reponer.
export function TopFaltantes({ faltantes }: { faltantes: Faltante[] }) {
  const maximo = Math.max(1, ...faltantes.map((f) => f.personas))
  const usados = Array.from(new Set(faltantes.map((f) => f.tipo)))
  return (
    <div className="kpi tarjeta min-w-0 p-4">
      <h3 className="rotulo">Lo que más falta</h3>
      {faltantes.length === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Sin faltantes.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {faltantes.map((f) => (
              <li key={`${f.tipo}|${f.articulo}`} className="grid grid-cols-[minmax(5rem,10rem)_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="truncate capitalize" title={f.articulo}>{f.articulo}</span>
                <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-3 w-full" role="img"
                  aria-label={`${f.articulo}: ${f.personas} colaboradores`}>
                  <rect width="100" height="8" fill="var(--borde)" />
                  <rect width={(f.personas / maximo) * 100} height="8" fill={TIPO[f.tipo].color} />
                </svg>
                <span className="text-right tabular-nums">{f.personas}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-texto-suave">
            {usados.map((t) => <span key={t} style={{ color: TIPO[t].color }}>■ {TIPO[t].texto}</span>)}
          </p>
        </>
      )}
    </div>
  )
}
