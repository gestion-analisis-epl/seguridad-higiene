import { describe, expect, it } from 'vitest'
import {
  puestosDeEmpresa,
  aRegla, colaboradoresAbarcados, combinacionesSinRegla, idRegla, normalizarPuesto, resolverRegla,
  type ReglaDotacion,
} from './reglas-dotacion'

const regla = (o: Partial<ReglaDotacion> = {}): ReglaDotacion => ({
  id: 'x', linea_negocio: 'linea-x', puesto: 'guardia de seguridad', puesto_etiqueta: 'Guardia de Seguridad',
  ciudad: null, area: null, prendas: ['botas'], tipos_epp: ['casco'], ...o,
})
const persona = (o: Record<string, unknown> = {}) =>
  ({ linea_negocio: 'linea-x', puesto: 'GUARDIA DE SEGURIDAD ', ciudad: 'leon', ...o })

describe('normalizarPuesto', () => {
  it('ignora mayúsculas, acentos y espacios repetidos', () => {
    expect(normalizarPuesto(' GUARDIA  de Seguridád ')).toBe('guardia de seguridad')
  })
})

describe('idRegla', () => {
  it('une empresa, puesto y ciudad, o "todas" sin ciudad', () => {
    expect(idRegla('linea-x', 'Guardia de Seguridad', 'leon')).toBe('linea-x__guardia-de-seguridad__leon')
    expect(idRegla('linea-x', 'Guardia de Seguridad', null)).toBe('linea-x__guardia-de-seguridad__todas')
  })
  it('añade el área solo cuando la regla la trae, para conservar los identificadores existentes', () => {
    expect(idRegla('linea-x', 'Jefe de Cuadrilla', 'juarez', 'mantenimiento')).toBe('linea-x__jefe-de-cuadrilla__juarez__mantenimiento')
    expect(idRegla('linea-x', 'Jefe de Cuadrilla', null, 'mantenimiento')).toBe('linea-x__jefe-de-cuadrilla__todas__mantenimiento')
    expect(idRegla('linea-x', 'Jefe de Cuadrilla', 'juarez', null)).toBe('linea-x__jefe-de-cuadrilla__juarez')
  })
})

describe('aRegla', () => {
  it('normaliza el puesto y descarta lo que no es texto', () => {
    expect(aRegla({ id: 'a', linea_negocio: 'linea-x', puesto: 'GUARDIA ', puesto_etiqueta: '', ciudad: '', area: 'operaciones', prendas: ['botas', 3], tipos_epp: null }))
      .toEqual({ id: 'a', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'GUARDIA ', ciudad: null, area: 'operaciones', prendas: ['botas'], tipos_epp: [] })
  })
  it('sin área la deja en null', () => {
    expect(aRegla({ id: 'a', linea_negocio: 'linea-x', puesto: 'guardia' }).area).toBeNull()
  })
})

describe('resolverRegla', () => {
  const general = regla({ id: 'gen' })
  const leon = regla({ id: 'leon', ciudad: 'leon', prendas: ['chaleco'] })
  it('prefiere la regla de la ciudad sobre la general', () => {
    expect(resolverRegla([general, leon], persona())?.id).toBe('leon')
  })
  it('cae a la regla sin ciudad cuando la plaza no tiene la suya', () => {
    expect(resolverRegla([general, leon], persona({ ciudad: 'puebla' }))?.id).toBe('gen')
  })
  describe('con área', () => {
    const mant = regla({ id: 'mant', area: 'mantenimiento', ciudad: 'leon' })
    const oper = regla({ id: 'oper', area: 'operaciones', ciudad: 'leon' })
    it('elige la regla del área del colaborador', () => {
      expect(resolverRegla([mant, oper], persona({ area: 'mantenimiento' }))?.id).toBe('mant')
      expect(resolverRegla([mant, oper], persona({ area: 'operaciones' }))?.id).toBe('oper')
    })
    it('no aplica una regla de otra área ni a quien no trae área', () => {
      expect(resolverRegla([mant], persona({ area: 'operaciones' }))).toBeNull()
      expect(resolverRegla([mant], persona())).toBeNull()
    })
    it('cae de ciudad y área a ciudad, luego a área y por último a la general', () => {
      const ciudadArea = regla({ id: 'ca', ciudad: 'leon', area: 'mantenimiento' })
      const soloCiudad = regla({ id: 'c', ciudad: 'leon' })
      const soloArea = regla({ id: 'a', area: 'mantenimiento' })
      const p = persona({ area: 'mantenimiento' })
      expect(resolverRegla([general, soloArea, soloCiudad, ciudadArea], p)?.id).toBe('ca')
      expect(resolverRegla([general, soloArea, soloCiudad], p)?.id).toBe('c')
      expect(resolverRegla([general, soloArea], p)?.id).toBe('a')
      expect(resolverRegla([general], p)?.id).toBe('gen')
    })
  })
  it('devuelve null sin regla para la empresa o el puesto', () => {
    expect(resolverRegla([general], persona({ linea_negocio: 'linea-y' }))).toBeNull()
    expect(resolverRegla([general], persona({ puesto: 'Chofer' }))).toBeNull()
  })
  it('devuelve null si el colaborador no trae puesto o empresa', () => {
    expect(resolverRegla([general], persona({ puesto: '' }))).toBeNull()
    expect(resolverRegla([general], persona({ puesto: null }))).toBeNull()
    expect(resolverRegla([general], persona({ linea_negocio: '' }))).toBeNull()
  })
  it('una regla con listas vacías sí se resuelve', () => {
    const vacia = regla({ id: 'vacia', prendas: [], tipos_epp: [] })
    expect(resolverRegla([vacia], persona())).toBe(vacia)
  })
})

describe('combinacionesSinRegla', () => {
  const reglas = [regla({ id: 'a', ciudad: 'leon' })]
  const gente = [
    persona(), persona(), persona({ ciudad: 'puebla' }),
    persona({ activo: false, ciudad: 'toluca' }),
    persona({ puesto: '' }), persona({ linea_negocio: '' }),
    persona({ linea_negocio: 'linea-y', puesto: 'Chofer' }),
  ]
  it('agrupa por empresa, puesto y ciudad, omite inactivos y cuenta los que no traen datos', () => {
    const r = combinacionesSinRegla(gente, reglas)
    expect(r.sinDatos).toBe(2)
    expect(r.pendientes).toEqual([
      { linea_negocio: 'linea-x', puesto: 'guardia de seguridad', puesto_etiqueta: 'Guardia de Seguridad', ciudad: 'puebla', colaboradores: 1 },
      { linea_negocio: 'linea-y', puesto: 'chofer', puesto_etiqueta: 'Chofer', ciudad: 'leon', colaboradores: 1 },
    ])
  })
})

describe('colaboradoresAbarcados', () => {
  const gente = [
    persona(), persona(), persona({ ciudad: 'puebla' }), persona({ ciudad: 'puebla' }), persona({ ciudad: 'puebla' }),
    persona({ ciudad: 'puebla', activo: false }),
  ]
  it('una regla general no cuenta a quien ya tiene la de su ciudad', () => {
    const existentes = [regla({ id: 'esp', ciudad: 'leon' })]
    expect(colaboradoresAbarcados(regla({ id: 'gen' }), existentes, gente)).toBe(3)
  })
  it('al editar una regla existente cuenta como si ya estuviera guardada', () => {
    const esp = regla({ id: 'esp', ciudad: 'leon' })
    expect(colaboradoresAbarcados(esp, [esp], gente)).toBe(2)
  })
})

describe('colaboradoresAbarcados con área', () => {
  it('una regla de área solo cuenta a los colaboradores de esa área', () => {
    const gente = [persona({ area: 'mantenimiento' }), persona({ area: 'operaciones' }), persona()]
    expect(colaboradoresAbarcados(regla({ id: 'm', area: 'mantenimiento' }), [], gente)).toBe(1)
  })
})

describe('puestosDeEmpresa', () => {
  it('devuelve solo los puestos de la empresa, sin repetir y ordenados', () => {
    const c = (linea_negocio: string, puesto: string | null) => ({ linea_negocio, puesto, ciudad: 'x' })
    expect(puestosDeEmpresa([c('a', 'GUARDIA '), c('a', 'guardia'), c('b', 'Chofer'), c('a', 'Cajero'), c('a', null),
      { ...c('a', 'Baja'), activo: false }], 'a')).toEqual(['Cajero', 'Guardia'])
    expect(puestosDeEmpresa([c('a', 'Guardia')], '')).toEqual([])
  })
})
