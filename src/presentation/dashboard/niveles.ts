import type { NivelIli } from '@/domain/indicadores'

export const NIVELES: Record<NivelIli, string> = {
  supera: 'Supera', meta: 'Meta', minimo: 'Mínimo', fuera_de_meta: 'Fuera de meta', sin_dato: 'Sin dato',
}
