import { describe, expect, it } from 'vitest'
import { agruparPorRegion, letraSecuencial } from './epp-regiones'

describe('agruparPorRegion', () => {
  it('ordena por región de la norma, deja sin región al final y omite regiones vacías', () => {
    const grupos = agruparPorRegion([
      { valor: 'a', etiqueta: 'A', region: 'tronco' },
      { valor: 'b', etiqueta: 'B' },
      { valor: 'c', etiqueta: 'C', region: 'cabeza' },
      { valor: 'd', etiqueta: 'D', region: 'inventada' },
    ])
    expect(grupos.map((g) => [g.etiqueta, g.items.map((i) => i.valor)])).toEqual([
      ['Cabeza', ['c']], ['Tronco', ['a']], ['Sin región', ['b', 'd']],
    ])
  })
})

describe('numeración', () => {
  it('numera las regiones por su lugar en la norma y asigna letras por orden de captura', () => {
    const [cabeza, tronco] = agruparPorRegion([
      { valor: 'a', etiqueta: 'Casco', region: 'cabeza' },
      { valor: 'b', etiqueta: 'Capucha', region: 'cabeza' },
      { valor: 'c', etiqueta: 'Overol', region: 'tronco' },
    ])
    expect(cabeza.titulo).toBe('1) Cabeza')
    expect(cabeza.opciones.map((o) => o.etiqueta)).toEqual(['A) Casco', 'B) Capucha'])
    expect(tronco.titulo).toBe('6) Tronco')
    expect(tronco.opciones.map((o) => [o.valor, o.etiqueta])).toEqual([['c', 'A) Overol']])
  })
  it('sigue con AA después de la Z', () => {
    expect([letraSecuencial(0), letraSecuencial(25), letraSecuencial(26)]).toEqual(['A', 'Z', 'AA'])
  })
})
