import { describe, expect, it } from 'vitest'
import { estadoDeColaborador, mapaActivos } from './estado-colaborador'

const mapa = mapaActivos([
  { id: 'c1', activo: true }, { id: 'c2', activo: false }, { id: 'c3' },
])

describe('estadoDeColaborador', () => {
  it('activo explícito o sin dato cuenta como Activo', () => {
    expect(estadoDeColaborador(mapa, 'c1')).toBe('Activo')
    expect(estadoDeColaborador(mapa, 'c3')).toBe('Activo')
  })
  it('activo false es Inactivo', () => {
    expect(estadoDeColaborador(mapa, 'c2')).toBe('Inactivo')
  })
  it('id desconocido o vacío es Sin colaborador, visible con el filtro por defecto', () => {
    expect(estadoDeColaborador(mapa, 'zz')).toBe('Sin colaborador')
    expect(estadoDeColaborador(mapa, undefined)).toBe('Sin colaborador')
    expect(estadoDeColaborador(mapa, '')).toBe('Sin colaborador')
  })
})
