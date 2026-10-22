import { describe, expect, it } from 'vitest'
import { MAX_REGLAS_IMPORTACION, validarImportacion, type ValoresCatalogo } from './reglas-importacion'

const catalogos: ValoresCatalogo = { lineas: ['mktqro'], ciudades: ['leon'], areas: ['operaciones'], tiposEpp: ['casco', 'guantes'] }
const regla = (o: Record<string, unknown> = {}) => ({
  linea_negocio: 'mktqro', puesto_etiqueta: 'jefe de cuadrilla', ciudad: 'leon', area: 'operaciones', tipos_epp: ['casco'], ...o,
})

describe('validarImportacion', () => {
  it('normaliza el puesto, calcula el identificador y quita EPP repetido', () => {
    const r = validarImportacion([regla({ tipos_epp: ['casco', 'casco', 'guantes'] })], catalogos)
    expect(r.errores).toEqual([])
    expect(r.reglas).toEqual([{
      id: 'mktqro__jefe-de-cuadrilla__leon__operaciones', linea_negocio: 'mktqro', puesto: 'jefe de cuadrilla',
      puesto_etiqueta: 'Jefe de Cuadrilla', ciudad: 'leon', area: 'operaciones', tipos_epp: ['casco', 'guantes'],
    }])
  })
  it('admite regla sin área', () => {
    expect(validarImportacion([regla({ area: null })], catalogos).reglas[0].id).toBe('mktqro__jefe-de-cuadrilla__leon')
  })
  it('rechaza valores que no están en los catálogos', () => {
    for (const mala of [{ linea_negocio: 'otra' }, { ciudad: 'x' }, { area: 'x' }, { tipos_epp: ['x'] }, { tipos_epp: [1] }, { tipos_epp: 'casco' }, { puesto_etiqueta: ' ' }]) {
      const r = validarImportacion([regla(mala)], catalogos)
      expect(r.reglas).toEqual([])
      expect(r.errores).toHaveLength(1)
    }
  })
  it('rechaza reglas repetidas, entradas vacías y lotes demasiado grandes', () => {
    expect(validarImportacion([regla(), regla({ puesto_etiqueta: 'Jefe de Cuadrilla' })], catalogos).errores).toHaveLength(1)
    expect(validarImportacion([], catalogos).errores).toHaveLength(1)
    expect(validarImportacion('x', catalogos).errores).toHaveLength(1)
    expect(validarImportacion(Array(MAX_REGLAS_IMPORTACION + 1).fill(regla()), catalogos).errores).toHaveLength(1)
  })
})
