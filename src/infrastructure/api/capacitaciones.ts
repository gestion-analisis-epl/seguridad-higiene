import type { InformeCapacitaciones } from '@/application/capacitaciones-sync'
import type { InformeNormas } from '@/application/normas-obligatorias-sync'
import type { FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import type { FilaNormasExcel } from '@/domain/normas-obligatorias-excel'
import { enviar, llamar } from './llamar'

export type InformeImportacion = InformeCapacitaciones & { totalRechazadas: number; totalSinCoincidencia: number; totalAmbiguas: number }

export const importarCapacitaciones = (filas: FilaCapacitacionExcel[], simular: boolean) =>
  llamar<InformeImportacion>('/api/capacitaciones/importar', enviar({ filas, simular }))

export type InformeNormasObligatorias = InformeNormas & { totalSinCoincidencia: number; totalAmbiguas: number }

export const importarNormasObligatorias = (filas: FilaNormasExcel[], simular: boolean) =>
  llamar<InformeNormasObligatorias>('/api/capacitaciones/normas-obligatorias', enviar({ filas, simular }))
