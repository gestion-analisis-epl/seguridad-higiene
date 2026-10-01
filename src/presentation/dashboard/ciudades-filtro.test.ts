import { describe, expect, it } from 'vitest'
import { ocultasDesdeSeleccion, ocultasValidas, seleccionDesdeOcultas } from './ciudades-filtro'

const todas = ['ciudad-a', 'ciudad-b', 'ciudad-c']

describe('ciudades-filtro', () => {
  it('por defecto (sin ocultas) todas quedan seleccionadas', () => {
    expect(seleccionDesdeOcultas(todas, [])).toEqual(todas)
  })
  it('las ciudades nuevas del catálogo quedan incluidas', () => {
    expect(seleccionDesdeOcultas([...todas, 'ciudad-d'], ['ciudad-b'])).toEqual(['ciudad-a', 'ciudad-c', 'ciudad-d'])
  })
  it('ignora ocultas que ya no existen', () => {
    expect(seleccionDesdeOcultas(todas, ['ciudad-x'])).toEqual(todas)
  })
  it('convierte la selección en ocultas y viceversa', () => {
    const ocultas = ocultasDesdeSeleccion(todas, ['ciudad-c', 'ciudad-a'])
    expect(ocultas).toEqual(['ciudad-b'])
    expect(seleccionDesdeOcultas(todas, ocultas)).toEqual(['ciudad-a', 'ciudad-c'])
  })
  it('sin selección oculta todas', () => {
    expect(ocultasDesdeSeleccion(todas, [])).toEqual(todas)
  })
  it('valida arreglos de texto', () => {
    expect(ocultasValidas(['a'])).toBe(true)
    expect(ocultasValidas([])).toBe(true)
    expect(ocultasValidas([1])).toBe(false)
    expect(ocultasValidas('a')).toBe(false)
    expect(ocultasValidas(null)).toBe(false)
  })
})
