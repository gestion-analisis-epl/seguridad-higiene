import { describe, expect, it } from 'vitest'
import { aplicarFiltros, type Filtro } from './logica'
import { sanearEstado } from './estado'
import { FILTRO_ACTIVO_BOOLEANO, FILTRO_ESTADO_ACTIVO } from './filtros-estado'
import { difiereDeIniciales, estadoBase, filtrosRestablecidos, mismosFiltros } from './filtros-iniciales'
import type { ColumnaTabla } from './tipos'

interface Fila { id: string; estado: string; activo: boolean }
const filas: Fila[] = [
  { id: '1', estado: 'Activo', activo: true },
  { id: '2', estado: 'Inactivo', activo: false },
  { id: '3', estado: 'Sin colaborador', activo: true },
]
const columnas: ColumnaTabla<Fila>[] = [
  { id: 'estado', encabezado: 'Estado', tipo: 'categoria', valor: (f) => f.estado },
  { id: 'activo', encabezado: 'Activo', tipo: 'booleano', valor: (f) => f.activo },
]
const iniciales = { estado: FILTRO_ESTADO_ACTIVO }

describe('forma de los filtros por defecto', () => {
  it('categoria oculta Inactivo y deja Sin colaborador visible', () => {
    expect(aplicarFiltros(filas, columnas, iniciales).map((f) => f.id)).toEqual(['1', '3'])
  })
  it('booleano deja solo los activos', () => {
    expect(aplicarFiltros(filas, columnas, { activo: FILTRO_ACTIVO_BOOLEANO }).map((f) => f.id)).toEqual(['1', '3'])
  })
})

describe('estadoBase', () => {
  const sin = {}
  it('sin guardado usa los iniciales', () => {
    expect(estadoBase(sin, false, iniciales)).toEqual({ filtros: iniciales })
  })
  it('con guardado, incluso sin filtros, no reaplica el defecto', () => {
    const guardado = { filtros: {}, orden: null, pagina: 1 }
    expect(estadoBase(guardado, true, iniciales)).toBe(guardado)
  })
  it('sin iniciales devuelve lo recibido', () => {
    expect(estadoBase(sin, false, undefined)).toBe(sin)
  })
})

describe('mismosFiltros y restablecer', () => {
  it('ignora filtros inactivos y el orden de ocultos', () => {
    const vacio: Filtro = { tipo: 'categoria', ocultos: [] }
    expect(mismosFiltros({ estado: vacio }, {})).toBe(true)
    const a: Filtro = { tipo: 'categoria', ocultos: ['b', 'a'] }
    const b: Filtro = { tipo: 'categoria', ocultos: ['a', 'b'] }
    expect(mismosFiltros({ x: a }, { x: b })).toBe(true)
  })
  it('detecta diferencias', () => {
    expect(difiereDeIniciales({}, iniciales)).toBe(true)
    expect(difiereDeIniciales(iniciales, iniciales)).toBe(false)
    expect(difiereDeIniciales({ activo: FILTRO_ACTIVO_BOOLEANO }, undefined)).toBe(true)
    expect(difiereDeIniciales({}, undefined)).toBe(false)
  })
  it('restablecer devuelve los iniciales o vacío', () => {
    expect(filtrosRestablecidos(iniciales)).toBe(iniciales)
    expect(filtrosRestablecidos(undefined)).toEqual({})
  })
})

describe('sanearEstado con iniciales', () => {
  const guardado = { filtros: iniciales, orden: null, pagina: 1 }
  it('sin filas inactivas conserva el defecto', () => {
    const soloActivas = filas.filter((f) => f.estado !== 'Inactivo')
    expect(sanearEstado(guardado, columnas, soloActivas, iniciales).filtros).toEqual(iniciales)
  })
  it('sin pasar iniciales se poda como antes', () => {
    const soloActivas = filas.filter((f) => f.estado !== 'Inactivo')
    expect(sanearEstado(guardado, columnas, soloActivas).filtros).toEqual({})
  })
  it('un filtro distinto del inicial se sanea normalmente', () => {
    const g = { filtros: { estado: { tipo: 'categoria', ocultos: ['Activo'] } } }
    expect(sanearEstado(g, columnas, filas, iniciales).filtros.estado).toEqual({ tipo: 'categoria', ocultos: ['Activo'] })
  })
})
