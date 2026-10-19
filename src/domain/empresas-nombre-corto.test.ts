import { describe, expect, it } from 'vitest'
import { aplicarNombresCortos } from './empresas-nombre-corto'

describe('aplicarNombresCortos', () => {
  it('asigna el nombre corto por etiqueta, con sufijos y sin acentos, e informa lo que no empareja', () => {
    const r = aplicarNombresCortos([
      { valor: 'sicmart-sa-de-cv', etiqueta: 'Sicmart Sa De Cv' },
      { valor: 'x', etiqueta: 'Especialistas Profesionales EPL SA de CV' },
      { valor: 'otra', etiqueta: 'Otra empresa' },
    ])
    expect(r.items.map((i) => i.nombre_corto)).toEqual(['Sicmart', 'EPL', undefined])
    expect(r.aplicados).toBe(2)
    expect(r.sinCoincidencia).toHaveLength(6)
    expect(r.sinCoincidencia).toContain('Lumina Pantallas Digitales')
  })
  it('es idempotente', () => {
    const una = aplicarNombresCortos([{ valor: 'the-best-marketing', etiqueta: 'The Best Marketing' }])
    expect(aplicarNombresCortos(una.items).aplicados).toBe(0)
  })
})
