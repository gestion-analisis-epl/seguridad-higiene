import { estadoVencimiento, formatearFecha, type EstadoVencimiento } from '@/domain/fechas'
import type { ConfigEntrega } from './entregas-config'
import type { RegistroEntrega } from './entregas-tipos'

export type ClaveEstadoEpp = EstadoVencimiento | 'no_entregado'

const TEXTOS: Record<ClaveEstadoEpp, string> = {
  no_entregado: 'No entregado',
  sin_fecha: 'Sin vencimiento',
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
}

const comoFecha = (v: unknown) => (v instanceof Date ? v : null)

export function estadoEpp(registro: RegistroEntrega, hoy: Date): { clave: ClaveEstadoEpp; texto: string } {
  const clave: ClaveEstadoEpp = registro.entregado === true
    ? estadoVencimiento(comoFecha(registro.vencimiento), hoy)
    : 'no_entregado'
  return { clave, texto: TEXTOS[clave] }
}

export function textoCelda(config: ConfigEntrega, registro: RegistroEntrega): string {
  return `${config.resumen(registro)}, ${formatearFecha(comoFecha(registro.fecha))}`
}
