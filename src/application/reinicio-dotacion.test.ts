import { describe, expect, it } from 'vitest'
import { normalizarAlcances, planearReinicio, type EntradaReinicio } from './reinicio-dotacion'

const entrada: EntradaReinicio = {
  catalogos: {
    prendas: { items: [{ valor: 'botas', etiqueta: 'Botas' }, { valor: 'gorra', etiqueta: 'Gorra' }] },
    tipos_epp: { items: [{ valor: 'casco', etiqueta: 'Casco' }] },
    tipos_equipo: { items: [{ valor: 'extintor', etiqueta: 'Extintor' }] },
  },
  colecciones: {
    entregas_uniforme: [{ id: 'u1', data: { prenda: 'botas' } }, { id: 'u2', data: {} }],
    entregas_epp: [{ id: 'e1', data: { tipo: 'casco' } }],
  },
  articulos: [
    { id: 'a-botas', data: { destino: 'uniforme' } },
    { id: 'a-casco', data: { destino: 'epp' } },
    { id: 'a-extintor', data: { destino: 'equipo' } },
  ],
}

describe('normalizarAlcances', () => {
  it('acepta alcances válidos sin repetir', () => {
    expect(normalizarAlcances(['epp', 'uniformes', 'epp'])).toEqual(['epp', 'uniformes'])
  })
  it('rechaza listas vacías, valores desconocidos o que no son lista', () => {
    expect(normalizarAlcances([])).toBeNull()
    expect(normalizarAlcances(['epp', 'colaboradores'])).toBeNull()
    expect(normalizarAlcances('epp')).toBeNull()
  })
})

describe('planearReinicio', () => {
  it('solo uniformes: vacía prendas y borra sus entregas y artículos, sin tocar EPP ni equipo', () => {
    const plan = planearReinicio(['uniformes'], entrada)
    expect(plan.vaciar).toEqual(['prendas'])
    expect(plan.borrar).toEqual([
      { coleccion: 'entregas_uniforme', ids: ['u1', 'u2'] },
      { coleccion: 'articulos_hoja', ids: ['a-botas'] },
    ])
    expect(Object.keys(plan.respaldo.catalogos)).toEqual(['prendas'])
    expect(Object.keys(plan.respaldo.colecciones).sort()).toEqual(['articulos_hoja', 'entregas_uniforme'])
    expect(plan.conteos).toEqual([{ alcance: 'uniformes', etiqueta: 'Uniformes', entradas: 2, entregas: 2, articulos: 1 }])
  })

  it('equipo no tiene entregas: solo vacía el catálogo y borra sus artículos', () => {
    const plan = planearReinicio(['equipo'], entrada)
    expect(plan.vaciar).toEqual(['tipos_equipo'])
    expect(plan.borrar).toEqual([{ coleccion: 'articulos_hoja', ids: ['a-extintor'] }])
    expect(plan.conteos[0]).toMatchObject({ alcance: 'equipo', entradas: 1, entregas: 0, articulos: 1 })
  })

  it('varios alcances suman sus colecciones y respaldan el contenido completo', () => {
    const plan = planearReinicio(['epp', 'uniformes'], entrada)
    expect(plan.vaciar).toEqual(['tipos_epp', 'prendas'])
    expect(plan.borrar.map((b) => b.coleccion)).toEqual(['entregas_epp', 'entregas_uniforme', 'articulos_hoja'])
    expect(plan.borrar.find((b) => b.coleccion === 'articulos_hoja')?.ids).toEqual(['a-botas', 'a-casco'])
    expect(plan.respaldo.colecciones.entregas_epp).toEqual(entrada.colecciones.entregas_epp)
    expect(plan.respaldo.catalogos.prendas).toEqual(entrada.catalogos.prendas)
  })

  it('un catálogo que no existe se respalda como null', () => {
    const plan = planearReinicio(['epp'], { ...entrada, catalogos: {} })
    expect(plan.respaldo.catalogos.tipos_epp).toBeNull()
    expect(plan.conteos[0].entradas).toBe(0)
  })
})
