import { describe, expect, it } from 'vitest'
import { etiquetaDe } from './etiquetas'

describe('etiquetaDe', () => {
  const opciones = [{ valor: 'botas', etiqueta: 'Botas' }]
  it('usa la etiqueta del catálogo', () => {
    expect(etiquetaDe(opciones, 'botas')).toBe('Botas')
  })
  it('cae al valor cuando no está en el catálogo', () => {
    expect(etiquetaDe(opciones, 'casco')).toBe('casco')
    expect(etiquetaDe(opciones, undefined)).toBe('-')
  })
})
