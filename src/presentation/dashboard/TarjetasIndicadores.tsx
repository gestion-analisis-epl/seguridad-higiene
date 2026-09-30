import type { Indices, NivelIli } from '@/domain/indicadores'
import { miles, num } from './formato'
import { NIVELES } from './niveles'

function Tarjeta({ rotulo, valor, nivel }: { rotulo: string; valor: string; nivel?: NivelIli }) {
  return (
    <div data-nivel={nivel} className="kpi tarjeta min-w-0 p-4">
      <dt className="rotulo">{rotulo}</dt>
      <dd className="mt-2 break-words text-xl font-semibold leading-tight tabular-nums">{valor}</dd>
    </div>
  )
}

export function TarjetasIndicadores({ anual, nivel }: { anual: Indices; nivel: NivelIli }) {
  return (
    <>
      <dl className="mb-2 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Tarjeta rotulo="HHT anual" valor={miles(anual.hht)} />
        <Tarjeta rotulo="Eventos laborales" valor={String(anual.eventos)} />
        <Tarjeta rotulo="Días de incapacidad (laborales)" valor={String(anual.dias)} />
        <Tarjeta rotulo="Índice de frecuencia" valor={num(anual.indiceFrecuencia)} />
        <Tarjeta rotulo="Índice de severidad" valor={num(anual.indiceSeveridad)} />
        <Tarjeta rotulo="ILI" valor={`${num(anual.ili, 3)} (${NIVELES[nivel]})`} nivel={nivel} />
      </dl>
      <p className="mb-6 text-sm text-texto-suave">IF, IS e ILI consideran solo accidentes laborales; trayecto no entra al índice.</p>
    </>
  )
}
