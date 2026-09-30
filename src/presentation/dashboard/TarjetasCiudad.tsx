import type { ResumenCiudad } from '@/application/dashboard'

const pct = (n: number) => `${Math.round(n * 100)}%`

function Medidor({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <dt className="text-texto-suave">{rotulo}</dt>
        <dd className="font-semibold tabular-nums">{pct(valor)}</dd>
      </div>
      <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-sm bg-superficie-2">
        <div className="h-full bg-primario" style={{ width: pct(valor) }} />
      </div>
    </div>
  )
}

export function TarjetasCiudad({ resumen, etiqueta }: {
  resumen: ResumenCiudad[]; etiqueta: (valor: string) => string
}) {
  if (resumen.length === 0) return <p className="text-sm text-texto-suave">Sin colaboradores activos.</p>
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {resumen.map((r) => (
        <li key={r.ciudad} className="tarjeta min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-base">{etiqueta(r.ciudad)}</h3>
            <p className="shrink-0 text-right">
              <span className="block text-xl font-semibold leading-none tabular-nums">{r.activos}</span>
              <span className="rotulo">Activos</span>
            </p>
          </div>
          <dl className="mt-4 space-y-3">
            <Medidor rotulo="Capacitación vigente" valor={r.pctCapacitacion} />
            <Medidor rotulo="Uniforme completo" valor={r.pctUniforme} />
            <Medidor rotulo="EPP completo" valor={r.pctEpp} />
          </dl>
        </li>
      ))}
    </ul>
  )
}
