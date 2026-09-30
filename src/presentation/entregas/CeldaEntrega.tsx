import { estadoEpp, textoCelda, type ClaveEstadoEpp } from '@/application/entregas-celdas'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import { formatearFecha } from '@/domain/fechas'

const INSIGNIA: Record<ClaveEstadoEpp, string> = {
  vigente: 'insignia-vigente',
  por_vencer: 'insignia-por-vencer',
  vencido: 'insignia-vencido',
  sin_fecha: 'insignia-neutra',
  no_entregado: 'insignia-neutra',
}

export function CeldaEntrega({ config, registro, hoy }: {
  config: ConfigEntrega; registro: RegistroEntrega | undefined; hoy: Date
}) {
  if (!registro) return <td className="whitespace-nowrap text-texto-suave"><span aria-hidden="true">-</span><span className="sr-only">Sin entrega</span></td>
  if (!config.conVencimiento) return <td className="whitespace-nowrap">{textoCelda(config, registro)}</td>
  const estado = estadoEpp(registro, hoy)
  const vence = registro.entregado === true && registro.vencimiento instanceof Date
  return (
    <td className="whitespace-nowrap">
      <span className={INSIGNIA[estado.clave]}>{estado.texto}</span>
      {vence && <span className="mt-0.5 block text-xs text-texto-suave">vence {formatearFecha(registro.vencimiento as Date)}</span>}
    </td>
  )
}
