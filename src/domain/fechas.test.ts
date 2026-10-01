import { describe, expect, it } from 'vitest'
import {
  aTextoIso, deTextoIso, diasParaVencer, estadoCapacitacion, estadoVencimiento,
  esFechaCompleta, fechaCalendario, formatearFecha, periodoDe, textoParaCommit,
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

describe('anios menores a 1000', () => {
  it('fechaCalendario conserva los anios 0 a 99', () => {
    expect(fechaCalendario(2, 1, 1).getUTCFullYear()).toBe(2)
    expect(fechaCalendario(99, 12, 31).getUTCFullYear()).toBe(99)
  })
  it('ida y vuelta con texto ISO', () => {
    for (const t of ['0002-01-01', '0202-05-06', '0999-12-31', '2026-08-31']) {
      expect(aTextoIso(deTextoIso(t))).toBe(t)
    }
  })
})

describe('esFechaCompleta', () => {
  it('acepta solo fechas completas validas con anio de 4 digitos', () => {
    expect(esFechaCompleta('2026-08-31')).toBe(true)
    expect(esFechaCompleta('1000-01-01')).toBe(true)
  })
  it('rechaza parciales, anios bajos e inexistentes', () => {
    for (const t of ['', '0002-01-01', '0202-05-06', '0999-12-31', '2026-02-31', '2026-8-1', 'abc']) {
      expect(esFechaCompleta(t)).toBe(false)
    }
  })
})

describe('textoParaCommit', () => {
  it('confirma vacio y completos, ignora parciales', () => {
    expect(textoParaCommit('')).toBe('')
    expect(textoParaCommit('2026-08-31')).toBe('2026-08-31')
    expect(textoParaCommit('0002-01-01')).toBeNull()
  })
})
