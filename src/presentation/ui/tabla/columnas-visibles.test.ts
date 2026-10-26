import { describe, expect, it } from 'vitest'
import { alternarOculta, columnasMostradas, filtrosEnOcultas, idsOcultos, ocultasPorDefecto, ocultasValidas } from './columnas-visibles'
import type { Filtro } from './logica'
import type { ColumnaTabla } from './tipos'

const col = (id: string): ColumnaTabla<{ a: string }> => ({ id, encabezado: id, tipo: 'texto', valor: (f) => f.a })
const columnas = [col('nombre'), col('ciudad'), col('estado')]

describe('ocultasValidas', () => {
  it('acepta solo listas de texto', () => {
    expect(ocultasValidas(['a', 'b'])).toBe(true)
    expect(ocultasValidas([])).toBe(true)
    expect(ocultasValidas(['a', 1])).toBe(false)
    expect(ocultasValidas('a')).toBe(false)
    expect(ocultasValidas(null)).toBe(false)
  })
})

describe('idsOcultos y columnasMostradas', () => {
  it('oculta las elegidas, ignora ids que ya no existen y nunca oculta la primera', () => {
    expect([...idsOcultos(columnas, ['ciudad', 'viejo', 'nombre'])]).toEqual(['ciudad'])
    expect(columnasMostradas(columnas, ['ciudad', 'viejo', 'nombre']).map((c) => c.id)).toEqual(['nombre', 'estado'])
  })
  it('sin ocultas devuelve las mismas columnas', () => {
    expect(columnasMostradas(columnas, [])).toBe(columnas)
  })
})

describe('ocultasPorDefecto', () => {
  it('lista las marcadas, salvo la primera que nunca se oculta', () => {
    const marcadas = [{ ...col('nombre'), ocultaPorDefecto: true }, col('ciudad'), { ...col('estado'), ocultaPorDefecto: true }]
    expect(ocultasPorDefecto(marcadas)).toEqual(['estado'])
    expect(ocultasPorDefecto(columnas)).toEqual([])
  })
})

describe('alternarOculta', () => {
  it('agrega y quita sin repetir', () => {
    expect(alternarOculta([], 'ciudad')).toEqual(['ciudad'])
    expect(alternarOculta(['ciudad', 'estado'], 'ciudad')).toEqual(['estado'])
  })
})

describe('filtrosEnOcultas', () => {
  const filtros: Record<string, Filtro> = {
    ciudad: { tipo: 'categoria', ocultos: ['x'] },
    estado: { tipo: 'texto', texto: 'a' },
  }
  it('cuenta los filtros activos sobre columnas ocultas', () => {
    expect(filtrosEnOcultas(filtros, new Set(['ciudad']))).toBe(1)
    expect(filtrosEnOcultas(filtros, new Set(['ciudad', 'estado']))).toBe(2)
    expect(filtrosEnOcultas(filtros, new Set())).toBe(0)
  })
})
