import { describe, expect, it } from 'vitest'
import type { CampoDef } from '@/domain/modulos'
import { itemsDeCatalogo, resolverOpciones } from './opciones'

const base: CampoDef = { nombre: 'x', etiqueta: 'X', tipo: 'seleccion' }
const colaboradores = [
  { id: 'b', nombre: 'Beto' },
  { id: 'a', nombre: 'Ana' },
  { id: 'c', nombre: 'Caro', activo: false },
]

describe('resolverOpciones', () => {
  it('prioriza opciones fijas', () => {
    const opciones = [{ valor: '1', etiqueta: 'Uno' }]
    expect(resolverOpciones({ ...base, opciones }, {}, [])).toBe(opciones)
  })

  it('toma items del catalogo indicado', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'catalogo', id: 'normas' } }
    const cat = { normas: [{ valor: 'n1', etiqueta: 'N1' }] }
    expect(resolverOpciones(campo, cat, [])).toEqual(cat.normas)
    expect(resolverOpciones(campo, {}, [])).toEqual([])
  })

  it('lista colaboradores activos ordenados por nombre', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'colaboradores' } }
    expect(resolverOpciones(campo, {}, colaboradores).map((o) => o.valor)).toEqual(['a', 'b'])
  })

  it('sin origen devuelve vacio', () => {
    expect(resolverOpciones(base, {}, colaboradores)).toEqual([])
  })
})

describe('itemsDeCatalogo', () => {
  it('normaliza items y tolera ausencia', () => {
    expect(itemsDeCatalogo({ items: [{ valor: 'a', etiqueta: 'A', extra: 1 }] })).toEqual([{ valor: 'a', etiqueta: 'A' }])
    expect(itemsDeCatalogo({})).toEqual([])
  })
})
