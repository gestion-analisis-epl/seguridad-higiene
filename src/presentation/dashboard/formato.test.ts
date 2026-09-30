import { describe, expect, it } from 'vitest'
import { anioDeTexto, miles, num } from './formato'

describe('formato', () => {
  it('acepta solo años enteros desde 2000', () => {
    expect(anioDeTexto('2026')).toBe(2026)
    expect(anioDeTexto('')).toBeNull()
    expect(anioDeTexto('202')).toBeNull()
    expect(anioDeTexto('1999')).toBeNull()
    expect(anioDeTexto('2026.5')).toBeNull()
  })

  it('formatea decimales y miles', () => {
    expect(num(null)).toBe('-')
    expect(num(1.23456, 3)).toBe('1.235')
    expect(miles(12345)).toBe('12,345')
  })
})
