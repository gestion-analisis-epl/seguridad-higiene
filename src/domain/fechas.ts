export const DIAS_AVISO_VENCIMIENTO = 30

export function fechaCalendario(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
}

export function periodoDe(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatearFecha(fecha: Date | null): string {
  if (!fecha) return '-'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(fecha)
}

export function aTextoIso(fecha: Date | null): string {
  return fecha ? fecha.toISOString().slice(0, 10) : ''
}

export function deTextoIso(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  return m ? fechaCalendario(Number(m[1]), Number(m[2]), Number(m[3])) : null
}

export function diasParaVencer(vencimiento: Date, hoy: Date): number {
  const v = Date.UTC(vencimiento.getUTCFullYear(), vencimiento.getUTCMonth(), vencimiento.getUTCDate())
  const h = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((v - h) / 86_400_000)
}

export type EstadoVencimiento = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencido'

export function estadoVencimiento(
  vencimiento: Date | null, hoy: Date, diasAviso = DIAS_AVISO_VENCIMIENTO,
): EstadoVencimiento {
  if (!vencimiento) return 'sin_fecha'
  const dias = diasParaVencer(vencimiento, hoy)
  if (dias < 0) return 'vencido'
  return dias <= diasAviso ? 'por_vencer' : 'vigente'
}

export function estadoCapacitacion(
  fecha: Date | null, vencimiento: Date | null, hoy: Date,
): 'pendiente' | 'vigente' | 'vencido' {
  if (!fecha) return 'pendiente'
  return vencimiento && diasParaVencer(vencimiento, hoy) < 0 ? 'vencido' : 'vigente'
}
