import { describe, expect, it } from 'vitest'
import {
  aTextoIso, deTextoIso, diasParaVencer, estadoCapacitacion, estadoVencimiento,
  fechaCalendario, formatearFecha, periodoDe,
} from './fechas'

const hoy = new Date(2026, 8, 30)

describe('fechas de calendario', () => {
  it('guarda a las 12:00 UTC', () => {
    expect(fechaCalendario(2026, 8, 31).toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })
  it('calcula el periodo', () => {
    expect(periodoDe(fechaCalendario(2026, 8, 31))).toBe('2026-08')
    expect(periodoDe(fechaCalendario(2026, 1, 1))).toBe('2026-01')
  })
  it('formatea en UTC y maneja null', () => {
    expect(formatearFecha(fechaCalendario(2026, 8, 31))).toBe('31/08/2026')
    expect(formatearFecha(null)).toBe('-')
  })
  it('convierte a y desde texto ISO', () => {
    expect(aTextoIso(fechaCalendario(2026, 8, 31))).toBe('2026-08-31')
    expect(aTextoIso(null)).toBe('')
    expect(deTextoIso('2026-08-31')?.toISOString()).toBe('2026-08-31T12:00:00.000Z')
    expect(deTextoIso('')).toBeNull()
  })
})

describe('vencimientos', () => {
  it('cuenta días', () => {
    expect(diasParaVencer(fechaCalendario(2026, 9, 29), hoy)).toBe(-1)
    expect(diasParaVencer(fechaCalendario(2026, 9, 30), hoy)).toBe(0)
  })
  it('clasifica el estado', () => {
    expect(estadoVencimiento(null, hoy)).toBe('sin_fecha')
    expect(estadoVencimiento(fechaCalendario(2026, 9, 29), hoy)).toBe('vencido')
    expect(estadoVencimiento(fechaCalendario(2026, 9, 30), hoy)).toBe('por_vencer')
    expect(estadoVencimiento(fechaCalendario(2026, 10, 30), hoy)).toBe('por_vencer')
    expect(estadoVencimiento(fechaCalendario(2026, 10, 31), hoy)).toBe('vigente')
  })
  it('calcula el estado de capacitación', () => {
    expect(estadoCapacitacion(null, null, hoy)).toBe('pendiente')
    expect(estadoCapacitacion(fechaCalendario(2026, 5, 4), null, hoy)).toBe('vigente')
    expect(estadoCapacitacion(fechaCalendario(2025, 5, 4), fechaCalendario(2026, 5, 4), hoy)).toBe('vencido')
    expect(estadoCapacitacion(fechaCalendario(2026, 5, 4), fechaCalendario(2027, 5, 4), hoy)).toBe('vigente')
  })
})
