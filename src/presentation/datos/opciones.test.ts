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
    expect(resolverOpciones({ ...base, opciones }, {}, [])).toEqual(opciones)
  })

  it('toma items del catalogo indicado', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'catalogo', id: 'normas' } }
    const cat = { normas: [{ valor: 'n1', etiqueta: 'N1' }] }
    expect(resolverOpciones(campo, cat, [])).toEqual(cat.normas)
    expect(resolverOpciones(campo, {}, [])).toEqual([])
  })

  it('al mostrar, resuelve el nombre de TODOS los colaboradores, tambien inactivos', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'colaboradores' } }
    const opciones = resolverOpciones(campo, {}, colaboradores)
    expect(opciones.map((o) => o.valor)).toEqual(['a', 'b', 'c'])
    expect(opciones.find((o) => o.valor === 'c')?.etiqueta).toBe('Caro')
  })

  it('al elegir, ofrece solo activos ordenados por nombre', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'colaboradores' } }
    expect(resolverOpciones(campo, {}, colaboradores, 'elegir').map((o) => o.valor)).toEqual(['a', 'b'])
  })

  it('al elegir, conserva al colaborador inactivo ya seleccionado y lo marca', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'colaboradores' } }
    const opciones = resolverOpciones(campo, {}, colaboradores, 'elegir', 'c')
    expect(opciones.map((o) => o.valor)).toEqual(['a', 'b', 'c'])
    expect(opciones.find((o) => o.valor === 'c')?.etiqueta).toBe('Caro (inactivo)')
    expect(opciones.find((o) => o.valor === 'a')?.etiqueta).toBe('Ana')
  })

  it('ordena catalogos y opciones fijas por etiqueta', () => {
    const campo: CampoDef = { ...base, origen: { tipo: 'catalogo', id: 'c' } }
    const cat = { c: [{ valor: '2', etiqueta: 'Ciudad B' }, { valor: '1', etiqueta: 'ciudad A' }] }
    expect(resolverOpciones(campo, cat, []).map((o) => o.valor)).toEqual(['1', '2'])
    const fijas = [{ valor: 'z', etiqueta: 'Zeta' }, { valor: 'a', etiqueta: 'Árbol' }]
    expect(resolverOpciones({ ...base, opciones: fijas }, {}, []).map((o) => o.valor)).toEqual(['a', 'z'])
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
