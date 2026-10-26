import { describe, expect, it } from 'vitest'
import {
  claveNorma, cumpleDe, esRojo, esVerde, fechaDeCelda, parsearCapacitacionesExcel, validarFilas,
} from './capacitaciones-excel'
import type { HojaLeida } from './dotacion-excel'
import { aTextoIso } from './fechas'

const NORMA = 'NOM-009-STPS-2011'
const ENCABEZADO = ['#', 'Linea de negocio', '', 'Ciudad', '', 'Nombre', '', 'Fecha de ingreso', 'Cuadrilla', 'Curso', '', 'Cumplimiento', '', 'Fecha', 'Vigencia']
const fila = (nombre: string, norma: string, fecha = '', vigencia = ''): string[] =>
  ['1', 'MKTQRO', '', 'Queretaro', '', nombre, '', '46000', 'QRO001', norma, '', 'SI', 'NO', fecha, vigencia]
const color = (si = '', no = ''): string[] => ['', '', '', '', '', '', '', '', '', '', '', si, no, '', '']
const sinColor = color()

function hoja(nombre: string, filas: [string[], string[]?][]): HojaLeida {
  return { nombre, filas: filas.map(([f]) => f), colores: filas.map(([f, c]) => c ?? f.map(() => '')) }
}

describe('fechaDeCelda', () => {
  it('lee serie de Excel, DD/MM/AAAA con punto final e ISO', () => {
    expect(aTextoIso(fechaDeCelda('46094'))).toBe('2026-03-13')
    expect(aTextoIso(fechaDeCelda('46094.0'))).toBe('2026-03-13')
    expect(aTextoIso(fechaDeCelda('18/09/2026.'))).toBe('2026-09-18')
    expect(aTextoIso(fechaDeCelda('2026-03-13'))).toBe('2026-03-13')
  })
  it('rechaza texto, fechas imposibles y series fuera de rango', () => {
    for (const t of ['Pendiente', 'Programar', 'Vencido', '', '31/02/2026', '12']) expect(fechaDeCelda(t)).toBeNull()
  })
})

describe('colores y cumplimiento', () => {
  it('distingue verde y rojo', () => {
    expect(esVerde('FF92D050')).toBe(true)
    expect(esVerde('FFFF0000')).toBe(false)
    expect(esRojo('FFFF0000')).toBe(true)
    expect(esRojo('FFDEEAF6')).toBe(false)
    expect(esRojo('')).toBe(false)
  })
  const fecha = new Date(Date.UTC(2026, 2, 13, 12))
  it('verde cumple; rojo, azul u otro relleno no cumplen aunque haya fecha', () => {
    expect(cumpleDe('FF92D050', '', null)).toBe(true)
    expect(cumpleDe('', 'FFFF0000', fecha)).toBe(false)
    expect(cumpleDe('FFDEEAF6', 'FFDEEAF6', fecha)).toBe(false)
  })
  it('sin relleno (o blanco) cumple solo si hay fecha', () => {
    expect(cumpleDe('', '', fecha)).toBe(true)
    expect(cumpleDe('FFFFFFFF', '', fecha)).toBe(true)
    expect(cumpleDe('', '', null)).toBe(false)
  })
})

describe('claveNorma', () => {
  it('normaliza y trata la 2012 como la 2011', () => {
    expect(claveNorma(NORMA)).toBe('nom-009-stps-2011')
    expect(claveNorma('NOM-009-STPS-2012')).toBe('nom-009-stps-2011')
  })
})

describe('parsearCapacitacionesExcel', () => {
  it('toma el bloque más reciente por persona y norma', () => {
    const h = hoja('Queretaro Colaboradores', [
      [['AGOSTO']], [ENCABEZADO],
      [fila('Ana Perez', NORMA, 'Pendiente', 'Pendiente'), color('', 'FFFF0000')],
      [['SEPTIEMBRE']], [ENCABEZADO],
      [fila('Ana Perez', NORMA, '46094', '46459'), color('FF92D050', '')],
    ])
    expect(parsearCapacitacionesExcel([h]).filas).toEqual([{
      hoja: 'Queretaro Colaboradores', fila: 6, nombre: 'Ana Perez', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: '2027-03-13',
    }])
  })
  it('en la misma hoja gana el bloque posterior por posición aunque su mes sea menor', () => {
    const h = hoja('H', [
      [['DICIEMBRE']], [ENCABEZADO], [fila('Ana Perez', NORMA, 'Pendiente'), color('', 'FFFF0000')],
      [['ENERO']], [ENCABEZADO], [fila('Ana Perez', NORMA, '46094'), sinColor],
    ])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ fila: 6, cumple: true })
  })
  it('entre hojas distintas gana el mes posterior', () => {
    const a = hoja('A', [[['OCTUBRE']], [ENCABEZADO], [fila('Ana Perez', NORMA, '46094'), sinColor]])
    const b = hoja('B', [[['AGOSTO']], [ENCABEZADO], [fila('Ana Perez', NORMA, 'Pendiente'), color('', 'FFFF0000')]])
    expect(parsearCapacitacionesExcel([b, a]).filas[0]).toMatchObject({ hoja: 'A', cumple: true })
  })
  it('descarta encabezados repetidos y filas sin nombre', () => {
    const h = hoja('H', [
      [ENCABEZADO], [fila('Ana Perez', 'Capacitación')], [fila('Personal', 'Curso')], [fila('', NORMA, '46094')],
    ])
    expect(parsearCapacitacionesExcel([h])).toEqual({ filas: [], hojasSinFilas: ['H'] })
  })
  it('sin relleno y con fecha cumple; vigencia faltante suma un año; acepta 18/09/2026.', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Beto Ruiz', NORMA, '18/09/2026.'), sinColor]])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ cumple: true, fecha: '2026-09-18', vencimiento: '2027-09-18' })
  })
  it('Pendiente o Programar con relleno azul o sin relleno no cumple y no trae fechas', () => {
    const h = hoja('H', [
      [ENCABEZADO],
      [fila('Caro Diaz', NORMA, 'Pendiente', 'Pendiente'), color('FFDEEAF6', 'FFDEEAF6')],
      [fila('Dani Soto', NORMA, 'Programar'), sinColor],
    ])
    for (const f of parsearCapacitacionesExcel([h]).filas) expect(f).toMatchObject({ cumple: false, fecha: null, vencimiento: null })
  })
  it('rojo en NO gana aunque haya fecha', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Eli Mora', NORMA, '46094'), color('', 'FFFF0000')]])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ cumple: false, fecha: '2026-03-13', vencimiento: '2027-03-13' })
  })
  it('sin colores en la hoja decide la fecha', () => {
    const h: HojaLeida = { nombre: 'H', filas: [ENCABEZADO, fila('Fer Gil', NORMA, '46094'), fila('Gus Paz', NORMA, 'Pendiente')] }
    expect(parsearCapacitacionesExcel([h]).filas.map((f) => f.cumple)).toEqual([true, false])
  })
  it('encuentra SI/NO aunque el encabezado Cumplimiento esté desfasado', () => {
    const desfasado = [...ENCABEZADO]
    desfasado[11] = ''
    desfasado[12] = 'Cumplimiento'
    const h = hoja('H', [[desfasado], [fila('Hugo Lara', NORMA, '46094'), color('FF92D050', '')]])
    expect(parsearCapacitacionesExcel([h]).filas[0].cumple).toBe(true)
  })
  it('la 2012 y la 2011 de la misma persona son una sola capacitación', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Ivan Rey', 'NOM-009-STPS-2011', 'Pendiente'), sinColor], [fila('Ivan Rey', 'NOM-009-STPS-2012', '46094'), sinColor]])
    expect(parsearCapacitacionesExcel([h]).filas).toHaveLength(1)
  })
  it('ignora hojas sin encabezado y reporta las que tienen encabezado pero ninguna persona', () => {
    const oficina: HojaLeida = { nombre: 'Queretaro Oficina y vehiculos', filas: [['Oficina'], ['Extintor']] }
    const colima = hoja('Colima Colaboradores', [[ENCABEZADO], [fila('', NORMA, '46094')]])
    expect(parsearCapacitacionesExcel([oficina, colima])).toEqual({ filas: [], hojasSinFilas: ['Colima Colaboradores'] })
  })
})

describe('validarFilas', () => {
  const ok = { hoja: 'H', fila: 5, nombre: ' Ana ', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: null }
  it('acepta filas válidas y recorta textos', () => {
    expect(validarFilas([ok])).toEqual({ filas: [{ ...ok, nombre: 'Ana' }] })
  })
  it('rechaza lista vacía, demasiadas filas y formatos inválidos', () => {
    expect(validarFilas([])).toHaveProperty('error')
    expect(validarFilas('x')).toHaveProperty('error')
    expect(validarFilas(Array(5001).fill(ok))).toHaveProperty('error')
    for (const mala of [{ ...ok, cumple: 'si' }, { ...ok, fecha: '13/03/2026' }, { ...ok, fecha: '2026-02-31' }, { ...ok, fila: 1.5 }, { ...ok, nombre: '' }, { ...ok, vencimiento: undefined }, null]) {
      expect(validarFilas([mala])).toHaveProperty('error')
    }
  })
})
