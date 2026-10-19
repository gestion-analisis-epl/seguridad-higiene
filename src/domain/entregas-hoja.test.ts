import { describe, expect, it } from 'vitest'
import { claveArticulo, fechaDeCelda, parsearEntregasHoja } from './entregas-hoja'

const ENCABEZADO = ['id', 'Empresa', 'Colaborador', 'Uniforme&Cantidad', '$MontoMaterial', 'Talla', 'Cantidad', 'Observaciones', 'FechaRegistro', 'Fecha Entrega']
// 45654 = 2024-12-28
const fila = (o: Record<string, unknown> = {}) => {
  const base: Record<string, unknown> = {
    id: 1145, Empresa: 'X', Colaborador: 'ANA', 'Uniforme&Cantidad': 'CASCO PARA ALTURAS', '$MontoMaterial': 852,
    Talla: '', Cantidad: 1, Observaciones: '', FechaRegistro: 45654, 'Fecha Entrega': 45654, ...o,
  }
  return ENCABEZADO.map((h) => base[h])
}

describe('fechaDeCelda', () => {
  it('convierte número de serie, texto mexicano y texto ISO', () => {
    expect(fechaDeCelda(45654)?.toISOString().slice(0, 10)).toBe('2024-12-28')
    expect(fechaDeCelda(45654.75)?.toISOString().slice(0, 10)).toBe('2024-12-28')
    expect(fechaDeCelda('28/12/2024')?.toISOString().slice(0, 10)).toBe('2024-12-28')
    expect(fechaDeCelda('2024-12-28')?.toISOString().slice(0, 10)).toBe('2024-12-28')
  })
  it('devuelve null con vacíos o basura', () => {
    expect(fechaDeCelda(undefined)).toBeNull()
    expect(fechaDeCelda('')).toBeNull()
    expect(fechaDeCelda('abc')).toBeNull()
    expect(fechaDeCelda(0)).toBeNull()
  })
})

describe('claveArticulo', () => {
  it('une variantes de acentos, mayúsculas y espacios', () => {
    expect(claveArticulo('PANTALÓN DE MEZCLILLA')).toBe(claveArticulo(' pantalon  de mezclilla '))
  })
})

describe('parsearEntregasHoja', () => {
  it('lee por encabezado y arma la llave', () => {
    const { filas, rechazadas } = parsearEntregasHoja([ENCABEZADO, fila()])
    expect(rechazadas).toEqual([])
    expect(filas[0]).toMatchObject({
      fila: 2, id_interno: '1145', articulo: 'CASCO PARA ALTURAS', cantidad: 1, monto: 852, entregado: true,
      llave: '1145_casco-para-alturas_20241228',
    })
  })

  it('numera las llaves repetidas en el orden de la hoja', () => {
    const { filas } = parsearEntregasHoja([ENCABEZADO, fila(), fila(), fila()])
    expect(filas.map((f) => f.llave)).toEqual([
      '1145_casco-para-alturas_20241228', '1145_casco-para-alturas_20241228_2', '1145_casco-para-alturas_20241228_3',
    ])
  })

  it('no entregado con cantidad 0 o sin fecha de entrega', () => {
    const { filas } = parsearEntregasHoja([ENCABEZADO, fila({ Cantidad: 0 }), fila({ 'Fecha Entrega': undefined, 'Uniforme&Cantidad': 'GORRO' })])
    expect(filas.map((f) => f.entregado)).toEqual([false, false])
    expect(filas[1].fecha_entrega).toBeNull()
  })

  it('rechaza id, artículo, cantidad y registro inválidos', () => {
    const { filas, rechazadas } = parsearEntregasHoja([
      ENCABEZADO, fila({ id: '' }), fila({ 'Uniforme&Cantidad': '' }), fila({ Cantidad: 'x' }), fila({ Cantidad: -2 }), fila({ FechaRegistro: '' }),
    ])
    expect(filas).toEqual([])
    expect(rechazadas.map((r) => r.fila)).toEqual([2, 3, 4, 5, 6])
  })

  it('aplica la cantidad máxima solo si se define', () => {
    expect(parsearEntregasHoja([ENCABEZADO, fila({ Cantidad: 22 })]).filas).toHaveLength(1)
    const r = parsearEntregasHoja([ENCABEZADO, fila({ Cantidad: 22 })], { cantidadMaxima: 10 })
    expect(r.filas).toEqual([])
    expect(r.rechazadas[0].motivo).toMatch(/máximo/)
  })

  it('ignora filas vacías y acepta monto y talla numéricos o vacíos', () => {
    const { filas, rechazadas } = parsearEntregasHoja([ENCABEZADO, fila({ '$MontoMaterial': '', Talla: 32 }), ['', '', '']])
    expect(rechazadas).toEqual([])
    expect(filas[0]).toMatchObject({ monto: null, talla: '32' })
  })

  it('falla si falta una columna obligatoria', () => {
    expect(() => parsearEntregasHoja([['id', 'Talla']])).toThrow(/columnas/)
  })
})
