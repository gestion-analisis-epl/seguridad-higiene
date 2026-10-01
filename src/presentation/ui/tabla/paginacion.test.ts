import { describe, expect, it } from 'vitest'
import { TAMANOS_PAGINA, TAMANO_PAGINA_INICIAL, paginar, resumenPagina, tamanoValido } from './paginacion'

const filas = Array.from({ length: 23 }, (_, i) => i + 1)

describe('paginar', () => {
  it('primera pagina', () => {
    const p = paginar(filas, 1, 10)
    expect(p.filas).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(p).toMatchObject({ pagina: 1, paginas: 3, desde: 1, hasta: 10, total: 23 })
  })
  it('ultima pagina parcial', () => {
    const p = paginar(filas, 3, 10)
    expect(p.filas).toEqual([21, 22, 23])
    expect(p).toMatchObject({ pagina: 3, desde: 21, hasta: 23 })
  })
  it('ajusta paginas fuera de rango', () => {
    expect(paginar(filas, 99, 10).pagina).toBe(3)
    expect(paginar(filas, 0, 10).pagina).toBe(1)
    expect(paginar(filas, -4, 10).pagina).toBe(1)
    expect(paginar(filas, Number.NaN, 10).pagina).toBe(1)
  })
  it('sin filas: una pagina vacia', () => {
    expect(paginar([], 5, 10)).toMatchObject({ filas: [], pagina: 1, paginas: 1, desde: 0, hasta: 0, total: 0 })
  })
  it('tamano mayor al total muestra todo', () => {
    expect(paginar(filas, 1, 100)).toMatchObject({ paginas: 1, desde: 1, hasta: 23 })
  })
  it('no muta la entrada', () => {
    const copia = [...filas]
    paginar(filas, 2, 5)
    expect(filas).toEqual(copia)
  })
})

describe('tamanos de pagina', () => {
  it('opciones y valor inicial', () => {
    expect(TAMANOS_PAGINA).toEqual([5, 10, 15, 20, 50, 100])
    expect(TAMANO_PAGINA_INICIAL).toBe(10)
  })
  it('valida solo los permitidos', () => {
    expect(tamanoValido(15)).toBe(true)
    expect(tamanoValido(7)).toBe(false)
    expect(tamanoValido('10')).toBe(false)
    expect(tamanoValido(null)).toBe(false)
  })
})

describe('resumenPagina', () => {
  it('sin filtros', () => {
    expect(resumenPagina(paginar(filas, 1, 10), 23)).toBe('Mostrando 1-10 de 23')
  })
  it('con filtros agrega el total', () => {
    expect(resumenPagina(paginar(filas.slice(0, 12), 2, 10), 23)).toBe('Mostrando 11-12 de 12 (12 de 23 en total)')
  })
  it('sin resultados', () => {
    expect(resumenPagina(paginar([], 1, 10), 23)).toBe('Mostrando 0 de 0 (0 de 23 en total)')
  })
})
