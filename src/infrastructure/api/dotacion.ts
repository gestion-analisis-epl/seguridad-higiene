import type { AlcanceReinicio, ConteoReinicio, RespaldoReinicio } from '@/application/reinicio-dotacion'
import { enviar, llamar } from './llamar'

const consulta = (alcances: AlcanceReinicio[]) => `/api/dotacion/reiniciar?alcances=${alcances.join(',')}`

export const consultarReinicio = (alcances: AlcanceReinicio[]) =>
  llamar<{ conteos: ConteoReinicio[] }>(consulta(alcances))

export const respaldoReinicio = (alcances: AlcanceReinicio[]) =>
  llamar<RespaldoReinicio>(`${consulta(alcances)}&respaldo=1`)

export const ejecutarReinicio = (alcances: AlcanceReinicio[], confirmar: string) =>
  llamar<{ conteos: ConteoReinicio[] }>('/api/dotacion/reiniciar', enviar({ alcances, confirmar }))
