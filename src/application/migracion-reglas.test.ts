import { describe, expect, it } from 'vitest'
import { planearMigracion } from './migracion-reglas'

const doc = (id: string, data: Record<string, unknown>) => ({
  id, data: { linea_negocio: 'linea-x', puesto: 'soldador', puesto_etiqueta: 'Soldador', ciudad: null, area: null, ...data },
})

describe('planearMigracion', () => {
  const plan = planearMigracion([
    doc('linea-x__soldador__leon', { ciudad: 'leon', prendas: ['botas', 'playera'], tipos_epp: ['casco', 'careta'] }),
    doc('linea-x__soldador__todas', { prendas: ['botas'], tipos_epp: ['casco', 'lentes'] }),
  ])
  it('la base conserva sus listas completas', () => {
    expect(plan.uniforme.find((r) => r.ciudad === null)).toMatchObject({ agrega: ['botas'], quita: [] })
    expect(plan.epp.find((r) => r.ciudad === null)).toMatchObject({ agrega: ['casco', 'lentes'], quita: [] })
  })
  it('las excepciones quedan como cambio frente a la base, sin importar el orden', () => {
    expect(plan.uniforme.find((r) => r.ciudad === 'leon')).toMatchObject({ agrega: ['playera'], quita: [] })
    expect(plan.epp.find((r) => r.ciudad === 'leon')).toMatchObject({ agrega: ['careta'], quita: ['lentes'] })
  })
  it('conserva el identificador anterior', () => {
    expect(plan.epp.map((r) => r.id).sort()).toEqual(['linea-x__soldador__leon', 'linea-x__soldador__todas'])
  })
  it('una regla con listas vacías sigue existiendo para que el puesto cuente como definido', () => {
    const vacia = planearMigracion([doc('linea-x__soldador__todas', { prendas: [], tipos_epp: ['casco'] })])
    expect(vacia.uniforme).toHaveLength(1)
    expect(vacia.uniforme[0]).toMatchObject({ agrega: [], quita: [] })
  })
  it('descarta documentos sin empresa o puesto', () => {
    expect(planearMigracion([doc('x', { linea_negocio: '' })])).toEqual({ uniforme: [], epp: [] })
  })
})
