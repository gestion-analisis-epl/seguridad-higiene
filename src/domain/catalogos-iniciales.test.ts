import { describe, expect, it } from 'vitest'
import { CATALOGOS_INICIALES, PRENDAS, TIPOS_EPP, unirItems } from './catalogos-iniciales'

describe('catálogos iniciales', () => {
  it('los catálogos de la empresa empiezan vacíos', () => {
    for (const id of ['ciudades', 'areas', 'lineas_negocio', 'normas', 'cuadrillas']) {
      expect(CATALOGOS_INICIALES[id]).toEqual([])
    }
  })
  it('incluye los catálogos genéricos', () => {
    expect(CATALOGOS_INICIALES.tipos_accidente.map((i) => i.valor)).toEqual(['trayecto', 'laboral'])
    expect(CATALOGOS_INICIALES.tipos_equipo.map((i) => i.valor)).toEqual(['extintor', 'botiquin', 'senaletica'])
  })
  it('deriva prendas y EPP de las constantes', () => {
    expect(CATALOGOS_INICIALES.prendas.map((i) => i.valor)).toEqual([...PRENDAS])
    expect(CATALOGOS_INICIALES.tipos_epp.map((i) => i.valor)).toEqual([...TIPOS_EPP])
  })
  it('une sin duplicar y conserva lo existente', () => {
    const r = unirItems(
      [{ valor: 'a', etiqueta: 'Alfa editada' }],
      [{ valor: 'a', etiqueta: 'Alfa' }, { valor: 'b', etiqueta: 'Beta' }],
    )
    expect(r).toEqual([{ valor: 'a', etiqueta: 'Alfa editada' }, { valor: 'b', etiqueta: 'Beta' }])
  })
})
