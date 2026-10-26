import { slug } from '@/domain/slug'
import type { CeldaExcel, HojaExcel } from '@/infrastructure/xlsx/escribir-xlsx'
import { ANCHO_BASE, type ValorCelda } from './logica'
import type { ColumnaTabla } from './tipos'

const PX_POR_CARACTER = 7

export function celdaExcel(v: ValorCelda): CeldaExcel {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  return typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v
}

export const anchoExcel = (px: number): number => Math.min(60, Math.max(10, Math.round(px / PX_POR_CARACTER)))

// Las filas ya vienen filtradas y ordenadas; las columnas, solo las visibles
export function hojaParaExcel<T>(columnas: ColumnaTabla<T>[], filas: T[], anchos: Record<string, number>, etiqueta: string): HojaExcel {
  return {
    nombre: etiqueta,
    columnas: columnas.map((c) => ({ encabezado: c.encabezado, ancho: anchoExcel(anchos[c.id] ?? ANCHO_BASE) })),
    filas: filas.map((f) => columnas.map((c) => celdaExcel(c.valor(f)))),
  }
}

export function nombreArchivo(etiqueta: string, hoy: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${slug(etiqueta) || 'tabla'}-${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}.xlsx`
}
