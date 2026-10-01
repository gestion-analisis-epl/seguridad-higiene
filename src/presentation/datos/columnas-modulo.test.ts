import { describe, expect, it } from 'vitest'
import type { ModuloDef } from '@/domain/modulos'
import { columnasDeModulo, filtrosInicialesDeModulo } from './columnas-modulo'

const def: ModuloDef = {
  id: 'ejemplo', coleccion: 'ejemplos', titulo: 'Ejemplo',
  campos: [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion' },
    { nombre: 'oculto', etiqueta: 'Oculto', tipo: 'texto' },
  ],
  columnas: ['ciudad', 'nombre', 'cantidad', 'fecha', 'activo'],
}
const opciones = { ciudad: [{ valor: 'ciudad-a', etiqueta: 'Ciudad A' }] }
const cols = columnasDeModulo(def, opciones)
const por = (id: string) => cols.find((c) => c.id === id)!
const fila = (p: Record<string, unknown>) => ({ id: '1', ...p })

describe('columnasDeModulo', () => {
  it('respeta el orden y solo las columnas del módulo', () => {
    expect(cols.map((c) => c.id)).toEqual(['ciudad', 'nombre', 'cantidad', 'fecha', 'activo'])
    expect(cols.map((c) => c.encabezado)).toEqual(['Ciudad', 'Nombre', 'Cantidad', 'Fecha', 'Activo'])
  })
  it('mapea los tipos de campo a tipos de columna', () => {
    expect(cols.map((c) => c.tipo)).toEqual(['categoria', 'texto', 'numero', 'fecha', 'booleano'])
  })
  it('selección usa la etiqueta humana y cae al valor si no existe', () => {
    expect(por('ciudad').valor(fila({ ciudad: 'ciudad-a' }))).toBe('Ciudad A')
    expect(por('ciudad').valor(fila({ ciudad: 'otra' }))).toBe('otra')
    expect(por('ciudad').valor(fila({}))).toBeNull()
  })
  it('numero, fecha y booleano normalizan valores', () => {
    const d = new Date('2025-01-02T12:00:00Z')
    expect(por('cantidad').valor(fila({ cantidad: 3 }))).toBe(3)
    expect(por('cantidad').valor(fila({ cantidad: 'x' }))).toBeNull()
    expect(por('fecha').valor(fila({ fecha: d }))).toBe(d)
    expect(por('fecha').valor(fila({ fecha: 'x' }))).toBeNull()
    expect(por('activo').valor(fila({ activo: true }))).toBe(true)
    expect(por('activo').valor(fila({ activo: false }))).toBe(false)
    expect(por('activo').valor(fila({}))).toBeNull()
  })
  it('texto vacío es nulo y numero se alinea a la derecha', () => {
    expect(por('nombre').valor(fila({ nombre: '' }))).toBeNull()
    expect(por('nombre').valor(fila({ nombre: 'Ana' }))).toBe('Ana')
    expect(por('cantidad').alinear).toBe('derecha')
  })
})

describe('columnasDeModulo con lista', () => {
  const lista: ModuloDef = {
    id: 'l', coleccion: 'l', titulo: 'L', columnas: ['items'],
    campos: [{ nombre: 'items', etiqueta: 'Contenido', tipo: 'lista', subcampos: [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto' }] }],
  }
  const col = columnasDeModulo(lista, {})[0]
  it('resume en texto con cantidad y nombres filtrables', () => {
    expect(col.tipo).toBe('texto')
    expect(col.valor({ id: '1', items: [{ nombre: 'Gasas' }, { nombre: 'Venda' }] })).toBe('2 ítems: Gasas, Venda')
    expect(col.valor({ id: '1', items: [{ nombre: 'Gasas' }] })).toBe('1 ítem: Gasas')
    expect(col.valor({ id: '1', items: [] })).toBeNull()
    expect(col.valor({ id: '1' })).toBeNull()
  })
})

describe('columna Estado derivada del colaborador', () => {
  const conColab: ModuloDef = {
    id: 'cap', coleccion: 'cap', titulo: 'Cap', columnas: ['colaborador_id', 'norma'],
    campos: [
      { nombre: 'colaborador_id', etiqueta: 'Colaborador', tipo: 'seleccion' },
      { nombre: 'norma', etiqueta: 'Norma', tipo: 'texto' },
    ],
  }
  const activos = new Map([['c1', true], ['c2', false]])
  const cs = columnasDeModulo(conColab, {}, activos)
  it('se inserta tras el colaborador y es categoria', () => {
    expect(cs.map((c) => c.id)).toEqual(['colaborador_id', 'estado_colaborador', 'norma'])
    expect(cs[1].tipo).toBe('categoria')
  })
  it('resuelve Activo, Inactivo y Sin colaborador', () => {
    const v = (id?: string) => cs[1].valor({ id: 'r', colaborador_id: id })
    expect([v('c1'), v('c2'), v('zz'), v(undefined)]).toEqual(['Activo', 'Inactivo', 'Sin colaborador', 'Sin colaborador'])
  })
  it('sin mapa o sin campo colaborador no agrega columna', () => {
    expect(columnasDeModulo(conColab, {}).length).toBe(2)
    expect(columnasDeModulo(def, {}, activos).length).toBe(5)
  })
  it('filtros iniciales: Estado en módulos con colaborador, activo en colaboradores, nada en otros', () => {
    expect(Object.keys(filtrosInicialesDeModulo(conColab)!)).toEqual(['estado_colaborador'])
    const colaboradores: ModuloDef = { ...def, id: 'colaboradores' }
    expect(Object.keys(filtrosInicialesDeModulo(colaboradores)!)).toEqual(['activo'])
    expect(columnasDeModulo(colaboradores, {}).find((c) => c.id === 'activo')!.valor(fila({}))).toBe(true)
    expect(filtrosInicialesDeModulo(def)).toBeUndefined()
  })
})
