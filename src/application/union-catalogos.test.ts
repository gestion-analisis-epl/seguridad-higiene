import { describe, expect, it } from 'vitest'
import { planearUnion, referenciasDeCatalogo } from './union-catalogos'

const items = [
  { valor: 'mktqro', etiqueta: 'MKTQRO', nombre_corto: 'MKT' },
  { valor: 'marketing', etiqueta: 'Marketing', region: 'cabeza' },
]
const ref = (campo: string, extra = {}) => ({ coleccion: 'colaboradores', campo, ...extra })

describe('planearUnion', () => {
  it('reasigna los registros, quita el origen y completa datos faltantes del destino', () => {
    const plan = planearUnion('lineas_negocio', 'mktqro', 'marketing', items, [
      { referencia: ref('linea_negocio'), docs: [{ id: 'a', data: {} }, { id: 'b', data: {} }] },
    ])
    expect(plan).toEqual({
      items: [{ valor: 'marketing', etiqueta: 'Marketing', region: 'cabeza', nombre_corto: 'MKT' }],
      cambios: [
        { coleccion: 'colaboradores', id: 'a', campos: { linea_negocio: 'marketing' } },
        { coleccion: 'colaboradores', id: 'b', campos: { linea_negocio: 'marketing' } },
      ],
      bloqueos: [],
    })
  })
  it('junta varios campos del mismo documento', () => {
    const plan = planearUnion('x', 'mktqro', 'marketing', items, [
      { referencia: ref('c1'), docs: [{ id: 'a', data: {} }] }, { referencia: ref('c2'), docs: [{ id: 'a', data: {} }] },
    ])
    expect('error' in plan ? [] : plan.cambios).toEqual([{ coleccion: 'colaboradores', id: 'a', campos: { c1: 'marketing', c2: 'marketing' } }])
  })
  it('informa los registros que bloquean y respeta el filtro donde', () => {
    const plan = planearUnion('prendas', 'mktqro', 'marketing', items, [
      {
        referencia: ref('valor', { bloquea: 'artículos', donde: (d: Record<string, unknown>) => d.destino === 'uniforme' }),
        docs: [{ id: 'a', data: { destino: 'uniforme' } }, { id: 'b', data: { destino: 'epp' } }],
      },
    ])
    expect('error' in plan ? [] : plan.bloqueos).toEqual(['1 artículos'])
  })
  it('rechaza ciudades, entradas iguales o inexistentes', () => {
    expect(planearUnion('ciudades', 'mktqro', 'marketing', items, [])).toHaveProperty('error')
    expect(planearUnion('x', 'mktqro', 'mktqro', items, [])).toHaveProperty('error')
    expect(planearUnion('x', 'nada', 'marketing', items, [])).toHaveProperty('error')
  })
})

describe('referenciasDeCatalogo', () => {
  it('incluye los campos de los módulos y bloquea las reglas de dotación', () => {
    const r = referenciasDeCatalogo('lineas_negocio')
    expect(r).toContainEqual({ coleccion: 'colaboradores', campo: 'linea_negocio' })
    expect(r.some((x) => x.coleccion === 'reglas_dotacion' && x.bloquea)).toBe(true)
  })
})
