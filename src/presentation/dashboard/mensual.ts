import type { PuntoMes } from '@/application/dashboard'
import { clasificarIli, type ConfigIndicadores, type NivelIli } from '@/domain/indicadores'
import { MESES } from './formato'

export interface FilaMensual extends PuntoMes { mes: string; nivel: NivelIli }

export function filasMensuales(serie: PuntoMes[], cfg: ConfigIndicadores): FilaMensual[] {
  return serie.map((p, i) => ({ ...p, mes: MESES[i], nivel: clasificarIli(p.ili, cfg) }))
}
