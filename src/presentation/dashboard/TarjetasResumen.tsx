import Link from 'next/link'
import type { Alerta, ResumenGlobal } from '@/application/dashboard'
import { BarraVencimientos } from './graficas/BarraVencimientos'
import { Medidor } from './graficas/Medidor'
import { Tarjeta } from './TarjetasIndicadores'

export function TarjetasResumen({ resumen, alertas }: { resumen: ResumenGlobal; alertas: Alerta[] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
      <Medidor rotulo="Capacitación vigente" fraccion={resumen.pctCapacitacion} />
      <Medidor rotulo="Uniforme completo" fraccion={resumen.pctUniforme} />
      <Medidor rotulo="EPP completo" fraccion={resumen.pctEpp} />
      <div className="flex min-w-0 flex-col gap-3">
        <dl>
          <Tarjeta rotulo="Colaboradores activos" valor={String(resumen.activos)} />
          {resumen.sinRegla > 0 && <Tarjeta rotulo="Sin regla de dotación" valor={String(resumen.sinRegla)} />}
        </dl>
        {resumen.sinRegla > 0 && (
          <Link href="/admin/reglas-dotacion" className="text-sm underline">Definir reglas de dotación</Link>
        )}
        <BarraVencimientos alertas={alertas} />
      </div>
    </div>
  )
}
