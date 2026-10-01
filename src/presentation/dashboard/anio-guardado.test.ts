import { describe, expect, it } from 'vitest'
import { anioGuardadoValido } from './anio-guardado'

describe('anioGuardadoValido', () => {
  it('acepta anios plausibles y null', () => {
    expect([null, 2000, 2026, 2100].every(anioGuardadoValido)).toBe(true)
  })
  it('rechaza lo demas', () => {
    expect([1999, 2101, 20.5, NaN, '2026', undefined, {}].some(anioGuardadoValido)).toBe(false)
  })
})
