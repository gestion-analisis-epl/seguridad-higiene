import Link from 'next/link'
import type { Alerta, ResumenGlobal } from '@/application/dashboard'
import { BarraVencimientos } from './graficas/BarraVencimientos'
import { Medidor } from './graficas/Medidor'
import { Tarjeta } from './TarjetasIndicadores'

export type TarjetaElegida = 'capacitacion' | 'uniforme' | 'epp' | 'activos' | 'sinRegla' | 'vencimientos'

export function TarjetasResumen({ resumen, alertas, alElegir }: { resumen: ResumenGlobal; alertas: Alerta[]; alElegir: (t: TarjetaElegida) => void }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
      <Medidor rotulo="Capacitación vigente" fraccion={resumen.pctCapacitacion} alElegir={() => alElegir('capacitacion')} />
      <Medidor rotulo="Uniforme completo" fraccion={resumen.pctUniforme} alElegir={() => alElegir('uniforme')} />
      <Medidor rotulo="EPP completo" fraccion={resumen.pctEpp} alElegir={() => alElegir('epp')} />
      <div className="flex min-w-0 flex-col gap-3">
        <dl>
          <Tarjeta rotulo="Colaboradores activos" valor={String(resumen.activos)} alElegir={() => alElegir('activos')} />
          {resumen.sinRegla > 0 && <Tarjeta rotulo="Sin regla de dotación" valor={String(resumen.sinRegla)} alElegir={() => alElegir('sinRegla')} />}
        </dl>
        {resumen.sinRegla > 0 && (
          <Link href="/admin/reglas-dotacion" className="text-sm underline">Definir reglas de dotación</Link>
        )}
        <BarraVencimientos alertas={alertas} alElegir={() => alElegir('vencimientos')} />
      </div>
    </div>
  )
}
