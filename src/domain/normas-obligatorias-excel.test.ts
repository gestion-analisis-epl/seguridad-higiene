import { describe, expect, it } from 'vitest'
import { parsearNormasObligatoriasExcel, validarFilasNormas } from './normas-obligatorias-excel'

const hoja = (filas: string[][]) => [{ nombre: 'Hoja1', filas }]
const ENC = ['Colaborador', 'Empresa', 'Ciudad', 'Área', 'NOM-009', 'NOM-027']

describe('parsearNormasObligatoriasExcel', () => {
  it('lee X como obligatoria y N/A como no aplica', () => {
    const r = parsearNormasObligatoriasExcel(hoja([ENC, ['Ana Pérez', 'E', 'León', 'Ops', 'X', 'N/A'], ['Beto', 'E', 'León', 'Ops', 'n/a', 'x']]))
    expect(r.normas).toEqual(['NOM-009', 'NOM-027'])
    expect(r.filas.map((f) => f.normas)).toEqual([{ 'NOM-009': true, 'NOM-027': false }, { 'NOM-009': false, 'NOM-027': true }])
    expect(r.filas[0]).toMatchObject({ nombre: 'Ana Pérez', fila: 2 })
  })
  it('rechaza valores distintos de X y N/A y omite filas sin nombre', () => {
    const r = parsearNormasObligatoriasExcel(hoja([ENC, ['Ana', '', '', '', 'SI', 'X'], ['', '', '', '', 'X', 'X']]))
    expect(r.filas).toEqual([])
    expect(r.rechazadas).toHaveLength(1)
    expect(r.rechazadas[0].fila).toBe(2)
  })
  it('ignora hojas sin encabezado de colaborador', () => {
    expect(parsearNormasObligatoriasExcel(hoja([['Otra', 'cosa']]))).toEqual({ filas: [], normas: [], rechazadas: [] })
  })
})

describe('validarFilasNormas', () => {
  it('acepta filas bien formadas', () => {
    expect(validarFilasNormas([{ hoja: 'H', fila: 2, nombre: ' Ana ', normas: { 'NOM-009': true } }]))
      .toEqual({ filas: [{ hoja: 'H', fila: 2, nombre: 'Ana', normas: { 'NOM-009': true } }] })
  })
  it('rechaza vacío y formatos inválidos', () => {
    expect(validarFilasNormas([])).toHaveProperty('error')
    expect(validarFilasNormas([{ hoja: 'H', fila: 2, nombre: 'Ana', normas: { 'NOM-009': 'X' } }])).toHaveProperty('error')
    expect(validarFilasNormas([{ hoja: 'H', fila: 2, nombre: 'Ana', normas: [] }])).toHaveProperty('error')
  })
})
