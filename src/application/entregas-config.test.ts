import { describe, expect, it } from 'vitest'
import { CONFIG_EPP, CONFIG_UNIFORME } from './entregas-config'

describe('resumen y detalle de una entrega', () => {
  const r = { id: 'e1', talla: 'M', cantidad: 2 }

  it('uniforme: talla y cantidad si se entregó', () => {
    expect(CONFIG_UNIFORME.resumen({ ...r, entregado: true })).toBe('M, 2')
    expect(CONFIG_UNIFORME.detalle(r)).toBe('Talla M, cantidad 2')
  })
  it('uniforme: una entrega no entregada se dice como tal', () => {
    expect(CONFIG_UNIFORME.resumen({ ...r, entregado: false })).toBe('No entregado')
    expect(CONFIG_UNIFORME.detalle({ ...r, entregado: false })).toBe('No entregado')
  })
  it('EPP: entregado o no', () => {
    expect(CONFIG_EPP.resumen({ id: 'e1', entregado: true })).toBe('Entregado')
    expect(CONFIG_EPP.resumen({ id: 'e1', entregado: false })).toBe('No entregado')
  })
})
