import { describe, expect, it } from 'vitest'
import { alternar, esTodo, filtrarOpciones, ordenarOpciones, plegar, resumenSeleccion, todos } from './seleccion'

const opciones = [
  { valor: 'a', etiqueta: 'Ciudad A' },
  { valor: 'b', etiqueta: 'Ciudad B' },
  { valor: 'c', etiqueta: 'Árbol Ñandú' },
]
const textos = { todos: 'Todas las ciudades', ninguno: 'Ninguna' }

describe('seleccion', () => {
  it('plegar quita acentos y mayusculas', () => {
    expect(plegar('ÁrbOL Ñandú')).toBe('arbol nandu')
  })

  it('todos devuelve cada valor', () => {
    expect(todos(opciones)).toEqual(['a', 'b', 'c'])
  })

  it('alternar agrega y quita sin mutar', () => {
    const base = ['a']
    expect(alternar(base, 'b')).toEqual(['a', 'b'])
    expect(alternar(base, 'a')).toEqual([])
    expect(base).toEqual(['a'])
  })

  it('esTodo exige cubrir cada opcion e ignora desconocidos', () => {
    expect(esTodo(opciones, ['a', 'b', 'c'])).toBe(true)
    expect(esTodo(opciones, ['a', 'b', 'c', 'zzz'])).toBe(true)
    expect(esTodo(opciones, ['a', 'b'])).toBe(false)
    expect(esTodo([], [])).toBe(false)
  })

  it('resumen: todos, ninguno, una y varias', () => {
    expect(resumenSeleccion(opciones, ['a', 'b', 'c'], textos)).toBe('Todas las ciudades')
    expect(resumenSeleccion(opciones, [], textos)).toBe('Ninguna')
    expect(resumenSeleccion(opciones, ['b'], textos)).toBe('Ciudad B')
    expect(resumenSeleccion(opciones, ['a', 'b'], textos)).toBe('2 seleccionadas')
  })

  it('resumen ignora valores desconocidos', () => {
    expect(resumenSeleccion(opciones, ['zzz'], textos)).toBe('Ninguna')
    expect(resumenSeleccion(opciones, ['a', 'zzz'], textos)).toBe('Ciudad A')
  })

  it('filtrarOpciones ignora acentos y mayusculas', () => {
    expect(filtrarOpciones(opciones, 'ARBOL').map((o) => o.valor)).toEqual(['c'])
    expect(filtrarOpciones(opciones, '  ').length).toBe(3)
    expect(filtrarOpciones(opciones, 'ciudad').length).toBe(2)
  })

  it('filtrarOpciones exige todas las palabras sin importar el orden', () => {
    const ops = [{ valor: '1', etiqueta: 'Carlos Alberto Torres' }, { valor: '2', etiqueta: 'María Torres' }]
    expect(filtrarOpciones(ops, 'torres carlos').map((o) => o.valor)).toEqual(['1'])
  })
})

describe('ordenarOpciones', () => {
  it('ordena por etiqueta sin distinguir mayusculas ni acentos y no muta', () => {
    const entrada = [
      { valor: '1', etiqueta: 'zeta' },
      { valor: '2', etiqueta: 'Ñandú' },
      { valor: '3', etiqueta: 'árbol' },
      { valor: '4', etiqueta: 'Arbol B' },
      { valor: '5', etiqueta: 'Ciudad A' },
    ]
    expect(ordenarOpciones(entrada).map((o) => o.valor)).toEqual(['3', '4', '5', '2', '1'])
    expect(entrada[0].valor).toBe('1')
  })
})
