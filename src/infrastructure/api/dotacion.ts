import type { AlcanceReinicio, ConteoReinicio, RespaldoReinicio } from '@/application/reinicio-dotacion'
import { enviar, llamar } from './llamar'

const consulta = (alcances: AlcanceReinicio[]) => `/api/dotacion/reiniciar?alcances=${alcances.join(',')}`

export const consultarReinicio = (alcances: AlcanceReinicio[]) =>
  llamar<{ conteos: ConteoReinicio[] }>(consulta(alcances))

export const respaldoReinicio = (alcances: AlcanceReinicio[]) =>
  llamar<RespaldoReinicio>(`${consulta(alcances)}&respaldo=1`)

export const ejecutarReinicio = (alcances: AlcanceReinicio[], confirmar: string) =>
  llamar<{ conteos: ConteoReinicio[] }>('/api/dotacion/reiniciar', enviar({ alcances, confirmar }))

export interface ReglaAImportar { linea_negocio: string; puesto_etiqueta: string; ciudad: string | null; area: string | null; tipos_epp: string[] }

export const importarReglas = (reglas: ReglaAImportar[]) =>
  llamar<{ creadas: number; actualizadas: number }>('/api/dotacion/reglas/importar', enviar({ reglas }))
