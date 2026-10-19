import { formatearFecha } from '@/domain/fechas'
import type { RegistroEntrega } from './entregas-tipos'

export interface ConfigEntrega {
  coleccion: string
  campoItem: 'prenda' | 'tipo'
  conVencimiento: boolean
  resumen(registro: RegistroEntrega): string
  detalle(registro: RegistroEntrega): string
}

const relleno = (v: unknown) => v !== null && v !== undefined && v !== ''
const texto = (v: unknown) => (relleno(v) ? String(v) : '-')
const fechaDe = (v: unknown) => (v instanceof Date ? formatearFecha(v) : '-')

const resumenEpp = (r: RegistroEntrega) => (r.entregado === true ? 'Entregado' : 'No entregado')
  + (r.vencimiento instanceof Date ? `, vence ${fechaDe(r.vencimiento)}` : '')

export const CONFIG_UNIFORME: ConfigEntrega = {
  coleccion: 'entregas_uniforme',
  campoItem: 'prenda',
  conVencimiento: false,
  resumen: (r) => (r.entregado === false ? 'No entregado' : `${texto(r.talla)}, ${texto(r.cantidad)}`),
  detalle: (r) => (r.entregado === false ? 'No entregado' : `Talla ${texto(r.talla)}, cantidad ${texto(r.cantidad)}`),
}

export const CONFIG_EPP: ConfigEntrega = {
  coleccion: 'entregas_epp',
  campoItem: 'tipo',
  conVencimiento: true,
  resumen: resumenEpp,
  detalle: resumenEpp,
}
