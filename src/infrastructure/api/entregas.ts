import type { InformeEntregas } from '@/application/entregas-sync'
import { enviar, llamar } from './llamar'

export type InformeSincronizacion = InformeEntregas & { totalRechazadas: number }

export const sincronizarEntregas = (simular: boolean) =>
  llamar<InformeSincronizacion>('/api/entregas/sincronizar', enviar({ simular }))
