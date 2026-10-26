import type { CSSProperties } from 'react'
import type { Alerta, Cobertura, ResumenGlobal } from '@/application/dashboard'
import { BarraVencimientos } from './graficas/BarraVencimientos'
import { Medidor } from './graficas/Medidor'
import { Tarjeta } from './TarjetasIndicadores'

export type TarjetaElegida = 'capacitacion' | 'uniforme' | 'epp' | 'activos' | 'vencimientos'

const detalleCobertura = (c: Cobertura) => `${c.entregados} de ${c.exigidos} artículos · ${c.completos} de ${c.evaluados} personas completas`

export function TarjetasResumen({ resumen, alertas, alElegir }: { resumen: ResumenGlobal; alertas: Alerta[]; alElegir: (t: TarjetaElegida) => void }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
      <Medidor rotulo="Capacitación vigente" fraccion={resumen.pctCapacitacion} indice={0} alElegir={() => alElegir('capacitacion')} />
      <Medidor rotulo="Cobertura de uniforme" fraccion={resumen.coberturaUniforme.fraccion} detalle={detalleCobertura(resumen.coberturaUniforme)} indice={1} alElegir={() => alElegir('uniforme')} />
      <Medidor rotulo="Cobertura de EPP" fraccion={resumen.coberturaEpp.fraccion} detalle={detalleCobertura(resumen.coberturaEpp)} indice={2} alElegir={() => alElegir('epp')} />
      <div className="revelar flex min-w-0 flex-col gap-3" style={{ '--i': 3 } as CSSProperties}>
        <dl>
          <Tarjeta rotulo="Colaboradores activos" valor={String(resumen.activos)} alElegir={() => alElegir('activos')} />
        </dl>
        <BarraVencimientos alertas={alertas} alElegir={() => alElegir('vencimientos')} />
      </div>
    </div>
  )
}
