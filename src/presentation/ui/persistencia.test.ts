import { describe, expect, it } from 'vitest'
import { PREFIJO_CLAVE, claveAlmacen, escribirJson, leerJson, type Almacen } from './persistencia'

function memoria(inicial: Record<string, string> = {}): Almacen & { datos: Record<string, string> } {
  const datos = { ...inicial }
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = v } }
}
const roto: Almacen = {
  getItem: () => { throw new Error('bloqueado') },
  setItem: () => { throw new Error('cuota') },
}
const esLista = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

const validarQueLanza = Object.assign(
  () => { throw new Error('mal') },
) as unknown as (v: unknown) => v is number

describe('persistencia', () => {
  it('aplica prefijo y version a la clave', () => {
    expect(claveAlmacen('ciudades')).toBe(`${PREFIJO_CLAVE}ciudades`)
    expect(PREFIJO_CLAVE).toMatch(/^sh:v\d+:$/)
  })

  it('ida y vuelta de un valor valido', () => {
    const a = memoria()
    escribirJson(a, 'ciudades', ['Ciudad A', 'Ciudad B'])
    expect(a.datos[claveAlmacen('ciudades')]).toBe('["Ciudad A","Ciudad B"]')
    expect(leerJson(a, 'ciudades', esLista, [])).toEqual(['Ciudad A', 'Ciudad B'])
  })

  it('devuelve el valor por defecto si no hay dato', () => {
    expect(leerJson(memoria(), 'x', esLista, ['Ana'])).toEqual(['Ana'])
  })

  it('ignora JSON corrupto', () => {
    const a = memoria({ [claveAlmacen('x')]: '{no es json' })
    expect(leerJson(a, 'x', esLista, [])).toEqual([])
  })

  it('rechaza una forma incorrecta segun validar', () => {
    const a = memoria({ [claveAlmacen('x')]: '[1,2]' })
    expect(leerJson(a, 'x', esLista, ['Ana'])).toEqual(['Ana'])
  })

  it('no lanza si el almacen falla al leer o escribir', () => {
    expect(leerJson(roto, 'x', esLista, ['Ana'])).toEqual(['Ana'])
    expect(escribirJson(roto, 'x', ['Ana'])).toBe(false)
  })

  it('funciona sin almacen (SSR)', () => {
    expect(leerJson(null, 'x', esLista, ['Ana'])).toEqual(['Ana'])
    expect(escribirJson(null, 'x', ['Ana'])).toBe(false)
  })

  it('un validar que lanza cae al valor por defecto', () => {
    const a = memoria({ [claveAlmacen('x')]: '1' })
    expect(leerJson(a, 'x', validarQueLanza, 7)).toBe(7)
  })
})
