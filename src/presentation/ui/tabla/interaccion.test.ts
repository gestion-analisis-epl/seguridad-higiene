import { describe, expect, it } from 'vitest'
import { esControlInteractivo, type ElementoLike } from './interaccion'

const SELECTOR_ESPERADO = ['a', 'button', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]']

function el(coincide: boolean): ElementoLike {
  return { closest: (selector: string) => (coincide && SELECTOR_ESPERADO.every((s) => selector.includes(s)) ? ({} as ElementoLike) : null) }
}

describe('esControlInteractivo', () => {
  it('detecta un descendiente de control interactivo', () => {
    expect(esControlInteractivo(el(true))).toBe(true)
  })
  it('un elemento sin ancestro interactivo no lo es', () => {
    expect(esControlInteractivo(el(false))).toBe(false)
  })
  it('null u objetos sin closest no lo son', () => {
    expect(esControlInteractivo(null)).toBe(false)
    expect(esControlInteractivo({} as unknown as ElementoLike)).toBe(false)
  })
})
