import { formatearFecha } from '@/domain/fechas'
import type { CampoDef, Valores } from '@/domain/modulos'
import { MODULOS } from '@/domain/modulos-definiciones'
import type { RegistroEntrega } from './entregas-tipos'

export interface ConfigEntrega {
  coleccion: string
  campoItem: 'prenda' | 'tipo'
  campos: CampoDef[]
  derivaPeriodo: boolean
  conVencimiento: boolean
  fechaObligatoriaAlEditar: boolean
  ignorarVacioAlCorregir: boolean
  capturado(valores: Valores): boolean
  resumen(registro: RegistroEntrega): string
  detalle(registro: RegistroEntrega): string
}

const relleno = (v: unknown) => v !== null && v !== undefined && v !== ''
const camposDe = (modulo: string, item: string) =>
  MODULOS[modulo].campos.filter((c) => c.nombre !== 'colaborador_id' && c.nombre !== item)
const texto = (v: unknown) => (relleno(v) ? String(v) : '-')
const fechaDe = (v: unknown) => (v instanceof Date ? formatearFecha(v) : '-')

const resumenEpp = (r: RegistroEntrega) => (r.entregado === true ? 'Entregado' : 'No entregado')
  + (r.vencimiento instanceof Date ? `, vence ${fechaDe(r.vencimiento)}` : '')

export const CONFIG_UNIFORME: ConfigEntrega = {
  coleccion: 'entregas_uniforme',
  campoItem: 'prenda',
  campos: camposDe('entregas_uniforme', 'prenda'),
  derivaPeriodo: true,
  conVencimiento: false,
  fechaObligatoriaAlEditar: true,
  ignorarVacioAlCorregir: true,
  capturado: (v) => relleno(v.talla) || relleno(v.cantidad),
  resumen: (r) => `${texto(r.talla)}, ${texto(r.cantidad)}`,
  detalle: (r) => `Talla ${texto(r.talla)}, cantidad ${texto(r.cantidad)}`,
}

export const CONFIG_EPP: ConfigEntrega = {
  coleccion: 'entregas_epp',
  campoItem: 'tipo',
  campos: camposDe('entregas_epp', 'tipo'),
  derivaPeriodo: false,
  conVencimiento: true,
  fechaObligatoriaAlEditar: false,
  ignorarVacioAlCorregir: false,
  capturado: (v) => v.entregado === true,
  resumen: resumenEpp,
  detalle: resumenEpp,
}
