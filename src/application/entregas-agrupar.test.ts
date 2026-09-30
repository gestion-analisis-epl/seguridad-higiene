import { describe, expect, it } from 'vitest'
import { fechaCalendario } from '@/domain/fechas'
import { filasPorColaborador, filtrarFilas, historialDe, ultimaEntregaPorItem } from './entregas-agrupar'

const r = (id: string, colaborador_id: string, prenda: string, fecha: Date | null) =>
  ({ id, colaborador_id, prenda, fecha })

const registros = [
  r('a', 'c1', 'botas', fechaCalendario(2026, 1, 10)),
  r('b', 'c1', 'botas', fechaCalendario(2026, 6, 10)),
  r('c', 'c1', 'playera', null),
  r('d', 'c1', 'playera', fechaCalendario(2025, 1, 1)),
  r('e', 'c2', 'botas', fechaCalendario(2026, 6, 10)),
  r('f', 'c2', 'botas', fechaCalendario(2026, 6, 10)),
]

describe('ultimaEntregaPorItem', () => {
  const mapa = ultimaEntregaPorItem(registros, 'prenda')
  it('toma la fecha más reciente por colaborador e item', () => {
    expect(mapa.get('c1')?.botas.id).toBe('b')
  })
  it('una fecha gana sobre una entrega sin fecha', () => {
    expect(mapa.get('c1')?.playera.id).toBe('d')
  })
  it('en empate de fecha gana el id mayor, sin depender del orden de entrada', () => {
    expect(mapa.get('c2')?.botas.id).toBe('f')
    const invertido = ultimaEntregaPorItem([...registros].reverse(), 'prenda')
    expect(invertido.get('c2')?.botas.id).toBe('f')
  })
  it('no crea entradas para quien no tiene entregas', () => {
    expect(mapa.has('c9')).toBe(false)
  })
})

describe('filasPorColaborador', () => {
  const colaboradores = [
    { id: 'c3', nombre: 'Zoe', ciudad: 'x', activo: false },
    { id: 'c2', nombre: 'Álvaro', ciudad: 'x' },
    { id: 'c1', nombre: 'Beto', ciudad: 'y', activo: true },
    { id: 'c4', nombre: 'Carla', ciudad: 'y' },
  ]
  const filas = filasPorColaborador(colaboradores, registros, 'prenda')
  it('una fila por colaborador activo ordenada por nombre', () => {
    expect(filas.map((f) => f.colaborador.id)).toEqual(['c2', 'c1', 'c4'])
  })
  it('incluye ultimas y cantidad de entregas', () => {
    const beto = filas.find((f) => f.colaborador.id === 'c1')!
    expect(beto.cantidadEntregas).toBe(4)
    expect(beto.ultimas.botas.id).toBe('b')
  })
  it('quien no tiene entregas aparece con celdas vacías', () => {
    const carla = filas.find((f) => f.colaborador.id === 'c4')!
    expect(carla.cantidadEntregas).toBe(0)
    expect(carla.ultimas).toEqual({})
  })
})

describe('historialDe', () => {
  it('solo de la persona, fecha descendente y sin fecha al final', () => {
    expect(historialDe(registros, 'c1').map((x) => x.id)).toEqual(['b', 'a', 'd', 'c'])
  })
})

describe('filtrarFilas', () => {
  const colaboradores = [
    { id: 'c1', nombre: 'José Pérez', ciudad: 'x' },
    { id: 'c2', nombre: 'Ana', ciudad: 'y' },
  ]
  const filas = filasPorColaborador(colaboradores, [], 'prenda')
  it('filtra por ciudad', () => {
    expect(filtrarFilas(filas, { ciudad: 'y', texto: '' }).map((f) => f.colaborador.id)).toEqual(['c2'])
  })
  it('busca por nombre sin acentos ni mayúsculas', () => {
    expect(filtrarFilas(filas, { ciudad: '', texto: ' jose perez ' }).map((f) => f.colaborador.id)).toEqual(['c1'])
  })
  it('sin filtros devuelve todo', () => {
    expect(filtrarFilas(filas, { ciudad: '', texto: '' })).toHaveLength(2)
  })
})
