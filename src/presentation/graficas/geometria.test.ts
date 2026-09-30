import { describe, expect, it } from 'vitest'
import { baseEtiquetaReferencia, maximoRedondeado, segmentosPolilinea } from './geometria'

describe('maximoRedondeado', () => {
  it.each([[0, 1], [1, 1], [2, 2], [3.2, 5], [7, 10], [0.34, 0.5], [12, 20]])('%s -> %s', (v, esperado) => {
    expect(maximoRedondeado(v)).toBeCloseTo(esperado, 10)
  })
})

describe('segmentosPolilinea', () => {
  it('genera un segmento continuo', () => {
    expect(segmentosPolilinea([0, 5, 10], 100, 50, 10)).toEqual(['0.00,50.00 50.00,25.00 100.00,0.00'])
  })
  it('parte el trazo en los valores null', () => {
    expect(segmentosPolilinea([1, null, 1], 100, 10, 1)).toEqual(['0.00,0.00', '100.00,0.00'])
  })
  it('maneja máximo 0 y un solo punto', () => {
    expect(segmentosPolilinea([0], 100, 10, 0)).toEqual(['0.00,10.00'])
  })
})

describe('baseEtiquetaReferencia', () => {
  it('coloca la etiqueta sobre la línea cuando cabe', () => {
    expect(baseEtiquetaReferencia(100, 12)).toBe(97)
  })
  it('la pasa debajo de la línea cuando saldría del área superior', () => {
    expect(baseEtiquetaReferencia(8, 12)).toBe(21)
  })
  it.each([0, 4, 8, 14.9, 15, 50, 196])('nunca queda fuera del viewBox (y=%s)', (y) => {
    const base = baseEtiquetaReferencia(y, 12)
    expect(base - 12).toBeGreaterThanOrEqual(0)
    expect(base).toBeLessThanOrEqual(220 - 24 + 12)
  })
})
