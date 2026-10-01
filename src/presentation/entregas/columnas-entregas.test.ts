import { describe, expect, it } from 'vitest'
import type { FilaEntrega } from '@/application/entregas-agrupar'
import { CONFIG_EPP, CONFIG_UNIFORME } from '@/application/entregas-config'
import { columnasDeEntregas, etiquetaEstadoEntrega } from './columnas-entregas'

const hoy = new Date('2025-06-01T12:00:00Z')
const items = [{ valor: 'casco', etiqueta: 'Casco' }, { valor: 'botas', etiqueta: 'Botas' }]
const ciudades = [{ valor: 'ciudad-a', etiqueta: 'Ciudad A' }]
const fila = (ultimas: FilaEntrega['ultimas']): FilaEntrega => ({
  colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a' }, ultimas, cantidadEntregas: 1,
})

describe('etiquetaEstadoEntrega', () => {
  it('uniformes: con o sin entrega', () => {
    expect(etiquetaEstadoEntrega(CONFIG_UNIFORME, undefined, hoy)).toBe('Sin entrega')
    expect(etiquetaEstadoEntrega(CONFIG_UNIFORME, { id: 'r' }, hoy)).toBe('Con entrega')
  })
  it('EPP: usa el estado de vencimiento', () => {
    expect(etiquetaEstadoEntrega(CONFIG_EPP, undefined, hoy)).toBe('Sin entrega')
    expect(etiquetaEstadoEntrega(CONFIG_EPP, { id: 'r', entregado: false }, hoy)).toBe('No entregado')
    expect(etiquetaEstadoEntrega(CONFIG_EPP, { id: 'r', entregado: true, vencimiento: new Date('2024-01-01T12:00:00Z') }, hoy)).toBe('Vencido')
  })
})

describe('columnasDeEntregas', () => {
  const cols = columnasDeEntregas(CONFIG_EPP, items, ciudades, hoy)
  it('colaborador, ciudad, un item por columna y acciones', () => {
    expect(cols.map((c) => c.id)).toEqual(['colaborador', 'ciudad', 'casco', 'botas', 'acciones'])
    expect(cols.map((c) => c.tipo)).toEqual(['texto', 'categoria', 'categoria', 'categoria', 'texto'])
  })
  it('valores: nombre, etiqueta de ciudad y estado', () => {
    const f = fila({ casco: { id: 'r', entregado: false } })
    expect(cols[0].valor(f)).toBe('Ana')
    expect(cols[1].valor(f)).toBe('Ciudad A')
    expect(cols[2].valor(f)).toBe('No entregado')
    expect(cols[3].valor(f)).toBe('Sin entrega')
  })
  it('acciones no se ordena ni filtra', () => {
    expect(cols[4].ordenable).toBe(false)
    expect(cols[4].filtrable).toBe(false)
  })
})

describe('columna de acciones', () => {
  it('no se trunca porque contiene controles', () => {
    const acciones = columnasDeEntregas(CONFIG_EPP, items, ciudades, hoy).find((c) => c.id === 'acciones')
    expect(acciones?.sinTruncar).toBe(true)
    expect(acciones?.anchoMinimo).toBeGreaterThanOrEqual(150)
  })
})
