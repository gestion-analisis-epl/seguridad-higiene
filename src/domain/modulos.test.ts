import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import {
  derivarCiudad, derivarPeriodo, formatearValor, validarRegistro,
  type CampoDef, type ModuloDef,
} from './modulos'

const def: ModuloDef = {
  id: 'x', coleccion: 'x', titulo: 'X', columnas: [],
  campos: [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano', requerido: true },
    { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'texto', patron: /^\d{4}-\d{2}$/, mensajePatron: 'Formato AAAA-MM' },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: [{ valor: 'a', etiqueta: 'A' }] },
  ],
}

describe('validarRegistro', () => {
  it('marca obligatorios vacíos, pero no booleanos en false', () => {
    const e = validarRegistro(def, { nombre: '', cantidad: null, activo: false })
    expect(e).toEqual({ nombre: 'Obligatorio', cantidad: 'Obligatorio' })
  })
  it('valida números, fechas, patrón y opciones', () => {
    const e = validarRegistro(def, {
      nombre: 'a', cantidad: -1, activo: true, fecha: new Date('x'), periodo: '2026', tipo: 'z',
    })
    expect(e).toEqual({
      cantidad: 'Número inválido', fecha: 'Fecha inválida', periodo: 'Formato AAAA-MM', tipo: 'Opción inválida',
    })
  })
  it('acepta un registro correcto', () => {
    const v = { nombre: 'a', cantidad: 0, activo: true, fecha: fechaCalendario(2026, 8, 1), periodo: '2026-08', tipo: 'a' }
    expect(validarRegistro(def, v)).toEqual({})
  })
})

describe('formatearValor', () => {
  const campo = (tipo: CampoDef['tipo']): CampoDef => ({ nombre: 'c', etiqueta: 'C', tipo })
  it('formatea por tipo', () => {
    expect(formatearValor(campo('fecha'), fechaCalendario(2026, 8, 31))).toBe('31/08/2026')
    expect(formatearValor(campo('booleano'), true)).toBe('Sí')
    expect(formatearValor(campo('booleano'), false)).toBe('No')
    expect(formatearValor(campo('seleccion'), 'a', [{ valor: 'a', etiqueta: 'Alfa' }])).toBe('Alfa')
    expect(formatearValor(campo('seleccion'), 'zz')).toBe('zz')
    expect(formatearValor(campo('texto'), null)).toBe('-')
  })
})

describe('derivaciones', () => {
  it('toma la ciudad del colaborador', () => {
    const ctx = { ciudadDeColaborador: (id: string) => (id === 'c1' ? 'ciudad-a' : null) }
    expect(derivarCiudad({ colaborador_id: 'c1' }, ctx).ciudad).toBe('ciudad-a')
    expect(derivarCiudad({ colaborador_id: 'x' }, ctx).ciudad).toBeNull()
  })
  it('calcula el periodo desde una fecha', () => {
    expect(derivarPeriodo({ fecha: fechaCalendario(2026, 8, 24) }, 'fecha').periodo).toBe('2026-08')
    expect(derivarPeriodo({ fecha: null }, 'fecha').periodo).toBeNull()
  })
})
