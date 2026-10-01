export const DIAS_AVISO_VENCIMIENTO = 30

export function fechaCalendario(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(Date.UTC(2000, mes - 1, dia, 12))
  // Date.UTC mapea los anios 0 a 99 a 1900-1999; setUTCFullYear no
  fecha.setUTCFullYear(anio, mes - 1, dia)
  return fecha
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

const ANIO_MINIMO_COMPLETO = 1000

// Fecha escrita completa: AAAA-MM-DD real y anio de 4 digitos sin ceros a la izquierda
export function esFechaCompleta(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (!m || Number(m[1]) < ANIO_MINIMO_COMPLETO) return false
  const fecha = deTextoIso(texto)
  return !!fecha && aTextoIso(fecha) === texto
}

// Texto a confirmar al padre mientras se escribe: vacio o completo; null si aun es parcial
export function textoParaCommit(texto: string): string | null {
  return texto === '' || esFechaCompleta(texto) ? texto : null
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
