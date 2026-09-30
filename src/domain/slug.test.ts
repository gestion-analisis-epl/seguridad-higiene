import { describe, expect, it } from 'vitest'
import { slug } from './slug'

describe('slug', () => {
  it.each([
    ['Ciudad A', 'ciudad-a'],
    ['Ciudad B-Área Uno', 'ciudad-b-area-uno'],
    ['Ñandú', 'nandu'],
    ['  CUAD-01 ', 'cuad-01'],
    ['Línea de vida de doble punto', 'linea-de-vida-de-doble-punto'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(slug(entrada)).toBe(esperado)
  })
})
