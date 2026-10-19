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
  it('colaborador, ciudad, estado y un item por columna', () => {
    expect(cols.map((c) => c.id)).toEqual(['colaborador', 'ciudad', 'estado_colaborador', 'casco', 'botas'])
    expect(cols.map((c) => c.tipo)).toEqual(['texto', 'categoria', 'categoria', 'categoria', 'categoria'])
  })
  it('valores: nombre, etiqueta de ciudad y estado', () => {
    const f = fila({ casco: { id: 'r', entregado: false } })
    expect(cols[0].valor(f)).toBe('Ana')
    expect(cols[1].valor(f)).toBe('Ciudad A')
    expect(cols[2].valor(f)).toBe('Activo')
    expect(cols[2].valor({ ...f, colaborador: { ...f.colaborador, activo: false } })).toBe('Inactivo')
    expect(cols[3].valor(f)).toBe('No entregado')
    expect(cols[4].valor(f)).toBe('Sin entrega')
  })
  it('una entrega de uniforme no entregada se distingue de una entregada', () => {
    const uniforme = columnasDeEntregas(CONFIG_UNIFORME, items, ciudades, hoy)
    expect(uniforme[3].valor(fila({ casco: { id: 'r', entregado: false } }))).toBe('No entregado')
    expect(uniforme[3].valor(fila({ casco: { id: 'r', entregado: true } }))).toBe('Con entrega')
  })
})
