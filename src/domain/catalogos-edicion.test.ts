import { describe, expect, it } from 'vitest'
import {
  aplicarEdicion, contarUso, mensajeUsoEnUso, quitarItem, usosDeCatalogo, validarAlta, validarEdicion,
} from './catalogos-edicion'
import type { ModuloDef } from './modulos'

const items = [{ valor: 'alfa', etiqueta: 'Alfa' }, { valor: 'beta', etiqueta: 'Árbol Beta' }]

describe('validarAlta', () => {
  it('genera el valor interno desde la etiqueta', () => {
    expect(validarAlta(items, '  Gamma Uno ')).toEqual({ valor: 'gamma-uno', etiqueta: 'Gamma Uno', error: null })
  })
  it('rechaza etiqueta vacía', () => {
    expect(validarAlta(items, '   ').error).toMatch(/etiqueta/i)
    expect(validarAlta(items, '---').error).toMatch(/etiqueta/i)
  })
  it('rechaza un valor interno que ya existe', () => {
    expect(validarAlta(items, 'ALFA!').error).toMatch(/ya existe/i)
  })
  it('rechaza etiqueta repetida sin importar mayúsculas ni acentos', () => {
    expect(validarAlta(items, 'arbol  beta').error).toMatch(/etiqueta/i)
  })
})

describe('validarEdicion y aplicarEdicion', () => {
  it('acepta conservar la misma etiqueta del propio ítem', () => {
    expect(validarEdicion(items, 'alfa', ' alfa ')).toBeNull()
  })
  it('rechaza vacía y duplicada de otro ítem', () => {
    expect(validarEdicion(items, 'alfa', '')).not.toBeNull()
    expect(validarEdicion(items, 'alfa', 'ARBOL beta')).not.toBeNull()
  })
  it('cambia solo la etiqueta y nunca el valor', () => {
    expect(aplicarEdicion(items, 'alfa', ' Alfa 2 ')).toEqual([
      { valor: 'alfa', etiqueta: 'Alfa 2' }, items[1],
    ])
  })
})

describe('uso y eliminación', () => {
  const modulos = {
    a: { id: 'a', coleccion: 'col_a', titulo: 'Módulo A', campos: [
      { nombre: 'x', etiqueta: 'X', tipo: 'seleccion', origen: { tipo: 'catalogo', id: 'cat1' } },
      { nombre: 'y', etiqueta: 'Y', tipo: 'seleccion', origen: { tipo: 'catalogo', id: 'cat1' } },
      { nombre: 'z', etiqueta: 'Z', tipo: 'texto' },
    ], columnas: [] },
    b: { id: 'b', coleccion: 'col_b', titulo: 'Módulo B', campos: [
      { nombre: 'k', etiqueta: 'K', tipo: 'seleccion', origen: { tipo: 'catalogo', id: 'cat1' } },
      { nombre: 'p', etiqueta: 'P', tipo: 'seleccion', origen: { tipo: 'catalogo', id: 'cat2' } },
      { nombre: 'q', etiqueta: 'Q', tipo: 'seleccion', origen: { tipo: 'colaboradores' } },
    ], columnas: [] },
  } as unknown as Record<string, ModuloDef>

  it('deriva colección y campo desde las definiciones', () => {
    expect(usosDeCatalogo(modulos, 'cat1')).toEqual([
      { coleccion: 'col_a', campos: ['x', 'y'] }, { coleccion: 'col_b', campos: ['k'] },
    ])
    expect(usosDeCatalogo(modulos, 'cat2')).toEqual([{ coleccion: 'col_b', campos: ['p'] }])
    expect(usosDeCatalogo(modulos, 'nada')).toEqual([])
  })
  it('cuenta registros distintos por colección', () => {
    const usos = usosDeCatalogo(modulos, 'cat1')
    const registros = {
      col_a: [{ id: '1', x: 'v1', y: 'v1' }, { id: '2', x: 'v2', y: 'v1' }, { id: '3', x: 'v2' }],
      col_b: [{ id: '4', k: 'v1' }],
    }
    expect(contarUso(usos, registros, 'v1')).toEqual({ total: 3, porColeccion: { col_a: 2, col_b: 1 } })
    expect(contarUso(usos, registros, 'v9')).toEqual({ total: 0, porColeccion: {} })
  })
  it('mensaje de uso lista cada colección', () => {
    const m = mensajeUsoEnUso({ total: 3, porColeccion: { col_a: 2, col_b: 1 } })
    expect(m).toContain('col_a: 2')
    expect(m).toContain('col_b: 1')
    expect(m).toMatch(/etiqueta/i)
  })
  it('quita un ítem solo si no está en uso', () => {
    expect(quitarItem(items, 'alfa', { total: 0, porColeccion: {} })).toEqual({ items: [items[1]], error: null })
    const bloqueado = quitarItem(items, 'alfa', { total: 2, porColeccion: { col_a: 2 } })
    expect(bloqueado.items).toEqual(items)
    expect(bloqueado.error).toContain('col_a: 2')
  })
})

describe('limpieza de etiquetas', () => {
  it('colapsa espacios internos en alta y edicion', () => {
    expect(validarAlta([], ' Gamma \n  Uno​ ').etiqueta).toBe('Gamma Uno')
    expect(aplicarEdicion([{ valor: 'a', etiqueta: 'A' }], 'a', ' B   C ')).toEqual([{ valor: 'a', etiqueta: 'B C' }])
  })
})
