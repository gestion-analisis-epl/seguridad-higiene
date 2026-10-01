import { describe, expect, it } from 'vitest'
import { crearBloqueoScroll, indiceFocoTab } from './dialogo-foco'

describe('indiceFocoTab', () => {
  it('avanza y da la vuelta al final', () => {
    expect(indiceFocoTab(0, 3, false)).toBe(1)
    expect(indiceFocoTab(2, 3, false)).toBe(0)
  })
  it('retrocede y da la vuelta al inicio', () => {
    expect(indiceFocoTab(2, 3, true)).toBe(1)
    expect(indiceFocoTab(0, 3, true)).toBe(2)
  })
  it('sin foco dentro entra por el primero o el último', () => {
    expect(indiceFocoTab(-1, 3, false)).toBe(0)
    expect(indiceFocoTab(-1, 3, true)).toBe(2)
  })
  it('un solo elemento se queda; sin elementos devuelve -1', () => {
    expect(indiceFocoTab(0, 1, false)).toBe(0)
    expect(indiceFocoTab(0, 1, true)).toBe(0)
    expect(indiceFocoTab(-1, 0, false)).toBe(-1)
  })
})

describe('crearBloqueoScroll', () => {
  const nuevo = (overflow = '') => {
    const el = { style: { overflow } }
    return { el, bloquear: crearBloqueoScroll(el) }
  }
  it('bloquea y restaura el valor previo', () => {
    const { el, bloquear } = nuevo('auto')
    const liberar = bloquear()
    expect(el.style.overflow).toBe('hidden')
    liberar()
    expect(el.style.overflow).toBe('auto')
  })
  it('con bloqueos anidados restaura solo al liberar el último', () => {
    const { el, bloquear } = nuevo()
    const a = bloquear()
    const b = bloquear()
    a()
    expect(el.style.overflow).toBe('hidden')
    b()
    expect(el.style.overflow).toBe('')
  })
  it('liberar dos veces el mismo bloqueo no afecta a los demás', () => {
    const { el, bloquear } = nuevo()
    const a = bloquear()
    const b = bloquear()
    a()
    a()
    expect(el.style.overflow).toBe('hidden')
    b()
    expect(el.style.overflow).toBe('')
  })
})
