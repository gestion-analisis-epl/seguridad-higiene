import type { InformeCapacitaciones } from '@/application/capacitaciones-sync'
import type { FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { enviar, llamar } from './llamar'

export type InformeImportacion = InformeCapacitaciones & { totalRechazadas: number; totalSinCoincidencia: number; totalAmbiguas: number }

export const importarCapacitaciones = (filas: FilaCapacitacionExcel[], simular: boolean) =>
  llamar<InformeImportacion>('/api/capacitaciones/importar', enviar({ filas, simular }))
