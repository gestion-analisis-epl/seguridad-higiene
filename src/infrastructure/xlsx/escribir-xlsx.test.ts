import { describe, expect, it } from 'vitest'
import { crc32, escribirXlsx, nombreHoja, serieExcel, xmlDeHoja, type HojaExcel } from './escribir-xlsx'
import { leerXlsx } from './leer-xlsx'

const HOJA: HojaExcel = {
  nombre: 'Datos',
  columnas: [{ encabezado: 'Nombre', ancho: 20 }, { encabezado: 'Cantidad', ancho: 10 }, { encabezado: 'Fecha', ancho: 12 }],
  filas: [
    ['Ana & <Pérez>', 3, new Date(Date.UTC(2026, 2, 13, 12))],
    [' con espacios ', null, null],
    ['', 0, null],
  ],
}

describe('crc32', () => {
  it('coincide con el vector estándar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
})

describe('serieExcel', () => {
  it('convierte a número de serie sin la hora', () => {
    expect(serieExcel(new Date(Date.UTC(2026, 2, 13, 12)))).toBe(46094)
    expect(serieExcel(new Date(Date.UTC(2026, 2, 13, 0)))).toBe(46094)
  })
})

describe('nombreHoja', () => {
  it('quita caracteres no válidos, recorta a 31 y nunca queda vacío', () => {
    expect(nombreHoja('Entregas [EPP]: 2026/10?')).toBe('Entregas EPP 2026 10')
    expect(nombreHoja('x'.repeat(50))).toHaveLength(31)
    expect(nombreHoja('???')).toBe('Hoja1')
  })
})

describe('escribirXlsx', () => {
  it('se lee de vuelta con textos, números y fechas, sin celdas vacías', async () => {
    const [hoja] = await leerXlsx(escribirXlsx(HOJA))
    expect(hoja.nombre).toBe('Datos')
    expect(hoja.filas).toEqual([
      ['Nombre', 'Cantidad', 'Fecha'],
      ['Ana & <Pérez>', '3', '46094'],
      [' con espacios '],
      ['', '0'],
    ])
  })
  it('quita caracteres de control y deja las fórmulas como texto', async () => {
    const [hoja] = await leerXlsx(escribirXlsx({ ...HOJA, filas: [['a\u0000b\u0007c', '=1+1', null]] }))
    expect(hoja.filas[1]).toEqual(['abc', '=1+1'])
  })
  it('sin columnas es un error', () => {
    expect(() => escribirXlsx({ nombre: 'x', columnas: [], filas: [] })).toThrow()
  })
})

describe('xmlDeHoja', () => {
  const xml = xmlDeHoja(HOJA)
  it('fija el encabezado, aplica autofiltro a todo el rango y respeta anchos', () => {
    expect(xml).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>')
    expect(xml).toContain('<autoFilter ref="A1:C4"/>')
    expect(xml).toContain('<col min="1" max="1" width="20" customWidth="1"/>')
  })
  it('da formato de fecha a las fechas y negrita al encabezado', () => {
    expect(xml).toContain('<c r="C2" s="2"><v>46094</v></c>')
    expect(xml).toContain('<c r="A1" s="1" t="inlineStr">')
  })
})
