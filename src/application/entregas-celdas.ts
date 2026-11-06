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
  // Sin entrega, la fecha útil es la de registro: indica desde cuándo se solicitó
  const registrada = comoFecha(registro.fecha_registro)
  if (registro.entregado === false && registrada) return `${config.resumen(registro)}, solicitado ${formatearFecha(registrada)}`
  return `${config.resumen(registro)}, ${formatearFecha(comoFecha(registro.fecha))}`
}
