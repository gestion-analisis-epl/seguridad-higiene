import { describe, expect, it } from 'vitest'
import { fechaCalendario } from '@/domain/fechas'
import { MODULOS } from '@/domain/modulos-definiciones'
import { ordenarRegistros } from './orden'

describe('ordenarRegistros', () => {
  it('con columna fecha ordena de la más reciente a la más antigua y deja sin fecha al final', () => {
    const registros = [
      { id: 'a', fecha: fechaCalendario(2026, 1, 5) },
      { id: 'b', fecha: null },
      { id: 'c', fecha: fechaCalendario(2026, 8, 24) },
      { id: 'd', fecha: fechaCalendario(2025, 12, 1) },
    ]
    expect(ordenarRegistros(MODULOS.accidentes, registros, {}).map((r) => r.id)).toEqual(['c', 'a', 'd', 'b'])
  })

  it('sin columna fecha ordena por la etiqueta de la primera columna en español', () => {
    const opciones = { ciudad: [{ valor: 'ciudad-b', etiqueta: 'Ciudad B' }, { valor: 'ciudad-a', etiqueta: 'Ciudad A' }] }
    const registros = [{ id: 'x', ciudad: 'ciudad-b' }, { id: 'y', ciudad: 'ciudad-a' }, { id: 'z', ciudad: 'ciudad-c' }]
    expect(ordenarRegistros(MODULOS.vehiculos, registros, opciones).map((r) => r.id)).toEqual(['y', 'x', 'z'])
  })

  it('ordena nombres con acentos junto a su letra', () => {
    const registros = [{ id: '1', nombre: 'Óscar' }, { id: '2', nombre: 'Beto' }, { id: '3', nombre: 'Omar' }]
    expect(ordenarRegistros(MODULOS.colaboradores, registros, {}).map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('no modifica el arreglo recibido', () => {
    const registros = [{ id: 'b', nombre: 'B' }, { id: 'a', nombre: 'A' }]
    ordenarRegistros(MODULOS.colaboradores, registros, {})
    expect(registros.map((r) => r.id)).toEqual(['b', 'a'])
  })
})
