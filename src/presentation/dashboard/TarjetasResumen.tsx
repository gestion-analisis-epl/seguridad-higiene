import type { ResumenGlobal } from '@/application/dashboard'
import { porcentaje } from './columnas-operativo'
import { Tarjeta } from './TarjetasIndicadores'

export function TarjetasResumen({ resumen }: { resumen: ResumenGlobal }) {
  return (
    <dl className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Tarjeta rotulo="Colaboradores activos" valor={String(resumen.activos)} />
      <Tarjeta rotulo="Capacitación vigente" valor={`${porcentaje(resumen.pctCapacitacion)}%`} />
      <Tarjeta rotulo="Uniforme completo" valor={`${porcentaje(resumen.pctUniforme)}%`} />
      <Tarjeta rotulo="EPP completo" valor={`${porcentaje(resumen.pctEpp)}%`} />
      <Tarjeta rotulo="Vencidos" valor={String(resumen.vencidos)} />
      <Tarjeta rotulo="Por vencer" valor={String(resumen.porVencer)} />
    </dl>
  )
}
