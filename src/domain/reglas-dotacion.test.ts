import { describe, expect, it } from 'vitest'
import {
  aDelta, aRegla, articulosEfectivos, colaboradoresAlcanzados, combinacionesSinRegla, diagnosticar, idRegla, indexarDotacion,
  normalizarPuesto, padreEfectivo, planearDeltas, puestosDeEmpresa, redundantesEliminables, resolverArticulos,
  type ReglaDotacion,
} from './reglas-dotacion'

const regla = (o: Partial<ReglaDotacion> = {}): ReglaDotacion => ({
  id: 'x', linea_negocio: 'linea-x', puesto: 'guardia de seguridad', puesto_etiqueta: 'Guardia de Seguridad',
  ciudad: null, area: null, agrega: ['botas'], quita: [], ...o,
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
  it('añade el área solo cuando la regla la trae', () => {
    expect(idRegla('linea-x', 'Jefe de Cuadrilla', 'juarez', 'mantenimiento')).toBe('linea-x__jefe-de-cuadrilla__juarez__mantenimiento')
    expect(idRegla('linea-x', 'Jefe de Cuadrilla', 'juarez', null)).toBe('linea-x__jefe-de-cuadrilla__juarez')
  })
})

describe('aRegla', () => {
  it('normaliza el puesto y descarta lo que no es texto', () => {
    expect(aRegla({ id: 'a', linea_negocio: 'linea-x', puesto: 'GUARDIA ', puesto_etiqueta: '', ciudad: '', area: 'operaciones', agrega: ['botas', 3], quita: null }))
      .toEqual({ id: 'a', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'GUARDIA ', ciudad: null, area: 'operaciones', agrega: ['botas'], quita: [] })
  })
})

describe('articulosEfectivos', () => {
  it('cada regla quita y agrega sobre lo que dejó la anterior', () => {
    const base = regla({ agrega: ['casco', 'lentes', 'guantes'] })
    const ciudad = regla({ ciudad: 'leon', agrega: ['careta'], quita: ['guantes'] })
    expect(articulosEfectivos([base, ciudad])).toEqual(['casco', 'lentes', 'careta'])
  })
  it('sin reglas no hay artículos', () => {
    expect(articulosEfectivos([])).toEqual([])
  })
})

describe('resolverArticulos', () => {
  const base = regla({ id: 'base', agrega: ['casco', 'lentes'] })
  const leon = regla({ id: 'leon', ciudad: 'leon', agrega: ['chaleco'], quita: ['lentes'] })
  it('la regla de la ciudad ajusta la base', () => {
    expect(resolverArticulos([base, leon], persona())).toEqual(['casco', 'chaleco'])
  })
  it('sin regla de su ciudad queda con la base', () => {
    expect(resolverArticulos([base, leon], persona({ ciudad: 'puebla' }))).toEqual(['casco', 'lentes'])
  })
  it('un cambio en la base llega a las excepciones', () => {
    const nueva = { ...base, agrega: ['casco', 'lentes', 'botas'] }
    expect(resolverArticulos([nueva, leon], persona())).toEqual(['casco', 'botas', 'chaleco'])
  })
  it('ciudad y área se aplican sobre la base en ese orden', () => {
    const area = regla({ id: 'a', area: 'mantenimiento', agrega: ['careta'] })
    const ciudadArea = regla({ id: 'ca', ciudad: 'leon', area: 'mantenimiento', quita: ['careta'], agrega: [] })
    const p = persona({ area: 'mantenimiento' })
    expect(resolverArticulos([base, area], p)).toEqual(['casco', 'lentes', 'careta'])
    expect(resolverArticulos([base, area, ciudadArea], p)).toEqual(['casco', 'lentes'])
  })
  it('una regla de área no aplica a otra área ni a quien no trae área', () => {
    const mant = regla({ id: 'm', area: 'mantenimiento' })
    expect(resolverArticulos([mant], persona({ area: 'operaciones' }))).toBeNull()
    expect(resolverArticulos([mant], persona())).toBeNull()
  })
  it('devuelve null sin regla para la empresa o el puesto, o sin esos datos', () => {
    expect(resolverArticulos([base], persona({ linea_negocio: 'linea-y' }))).toBeNull()
    expect(resolverArticulos([base], persona({ puesto: 'Chofer' }))).toBeNull()
    expect(resolverArticulos([base], persona({ puesto: null }))).toBeNull()
    expect(resolverArticulos([base], persona({ linea_negocio: '' }))).toBeNull()
  })
  it('una regla sin artículos sí se resuelve, con lista vacía', () => {
    expect(resolverArticulos([regla({ agrega: [] })], persona())).toEqual([])
  })
})

describe('indexarDotacion', () => {
  const dotacion = { uniforme: [regla({ agrega: ['botas'] })], epp: [regla({ agrega: ['casco'] }), regla({ id: 'l', ciudad: 'leon', agrega: ['careta'] })] }
  it('resuelve uniforme y EPP por separado', () => {
    expect(indexarDotacion(dotacion)(persona())).toEqual({ prendas: ['botas'], tipos_epp: ['casco', 'careta'] })
    expect(indexarDotacion(dotacion)(persona({ ciudad: 'puebla' }))).toEqual({ prendas: ['botas'], tipos_epp: ['casco'] })
  })
  it('con regla solo de un tipo el otro queda vacío; sin ninguna es null', () => {
    expect(indexarDotacion({ uniforme: [], epp: dotacion.epp })(persona())?.prendas).toEqual([])
    expect(indexarDotacion(dotacion)(persona({ puesto: 'Chofer' }))).toBeNull()
  })
})

describe('aDelta y padreEfectivo', () => {
  it('guarda solo la diferencia frente a lo heredado', () => {
    expect(aDelta(['casco', 'lentes'], ['casco', 'careta'])).toEqual({ agrega: ['careta'], quita: ['lentes'] })
    expect(aDelta([], ['casco'])).toEqual({ agrega: ['casco'], quita: [] })
  })
  it('lo heredado de ciudad y área incluye la base, el área y la ciudad', () => {
    const base = regla({ id: 'b', agrega: ['casco'] })
    const area = regla({ id: 'a', area: 'mant', agrega: ['careta'] })
    const ciudad = regla({ id: 'c', ciudad: 'leon', agrega: ['chaleco'] })
    const alcance = { linea_negocio: 'linea-x', puesto: 'guardia de seguridad', ciudad: 'leon', area: 'mant' }
    expect(padreEfectivo([base, area, ciudad], alcance)).toEqual(['casco', 'careta', 'chaleco'])
    expect(padreEfectivo([base, area, ciudad], { ...alcance, area: null })).toEqual(['casco'])
    expect(padreEfectivo([base], { ...alcance, ciudad: null, area: null })).toEqual([])
  })
})

describe('planearDeltas', () => {
  it('crea la base completa y las excepciones como cambio, sin importar el orden recibido', () => {
    const plan = planearDeltas([], [
      { linea_negocio: 'linea-x', puesto_etiqueta: 'Soldador', ciudad: 'leon', area: null, articulos: ['casco', 'careta'] },
      { linea_negocio: 'linea-x', puesto_etiqueta: 'Soldador', ciudad: null, area: null, articulos: ['casco', 'lentes'] },
    ])
    expect(plan.map((r) => [r.id, r.agrega, r.quita])).toEqual([
      ['linea-x__soldador__todas', ['casco', 'lentes'], []],
      ['linea-x__soldador__leon', ['careta'], ['lentes']],
    ])
  })
  it('toma en cuenta las reglas que ya existen', () => {
    const base = regla({ id: 'linea-x__soldador__todas', puesto: 'soldador', puesto_etiqueta: 'Soldador', agrega: ['casco'] })
    const plan = planearDeltas([base], [{ linea_negocio: 'linea-x', puesto_etiqueta: 'Soldador', ciudad: 'leon', area: null, articulos: ['casco'] }])
    expect(plan[0]).toMatchObject({ agrega: [], quita: [] })
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

describe('colaboradoresAlcanzados', () => {
  const gente = [
    persona(), persona(), persona({ ciudad: 'puebla' }), persona({ ciudad: 'puebla', activo: false }),
    persona({ area: 'mantenimiento' }),
  ]
  const alcance = { linea_negocio: 'linea-x', puesto: 'guardia de seguridad' }
  it('cuenta a los activos dentro de su ámbito', () => {
    expect(colaboradoresAlcanzados({ ...alcance, ciudad: null, area: null }, gente)).toBe(4)
    expect(colaboradoresAlcanzados({ ...alcance, ciudad: 'puebla', area: null }, gente)).toBe(1)
    expect(colaboradoresAlcanzados({ ...alcance, ciudad: null, area: 'mantenimiento' }, gente)).toBe(1)
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

describe('diagnosticar', () => {
  const gente = [persona(), persona({ area: 'mantenimiento' }), persona({ area: 'mantenimiento' }), persona({ ciudad: 'puebla' })]
  const base = regla({ id: 'base', agrega: ['casco', 'lentes'] })
  const codigos = (id: string, reglas: ReglaDotacion[]) => diagnosticar(reglas, gente).get(id)!.hallazgos.map((h) => h.codigo)

  it('una excepción que cambia algo sobrescribe a la base', () => {
    const leon = regla({ id: 'leon', ciudad: 'leon', agrega: ['careta'] })
    expect(codigos('leon', [base, leon])).toEqual(['sobrescribe'])
    expect(codigos('base', [base, leon])).toEqual([])
  })
  it('una excepción igual a la base es redundante', () => {
    const leon = regla({ id: 'leon', ciudad: 'leon', agrega: [], quita: [] })
    expect(codigos('leon', [base, leon])).toContain('redundante')
  })
  it('agregar lo que ya se hereda es redundante y lo señala', () => {
    const leon = regla({ id: 'leon', ciudad: 'leon', agrega: ['casco', 'careta'] })
    const d = diagnosticar([base, leon], gente).get('leon')!
    expect(d.hallazgos.find((h) => h.codigo === 'redundante')?.articulos).toEqual(['casco'])
  })
  it('quitar lo que la base exige se avisa', () => {
    const leon = regla({ id: 'leon', ciudad: 'leon', agrega: [], quita: ['lentes'] })
    const d = diagnosticar([base, leon], gente).get('leon')!
    expect(d.hallazgos.find((h) => h.codigo === 'quita')?.articulos).toEqual(['lentes'])
    expect(d.efectivos).toEqual(['casco'])
  })
  it('una regla sin colaboradores no tiene efecto', () => {
    const toluca = regla({ id: 'toluca', ciudad: 'toluca', agrega: ['careta'] })
    expect(codigos('toluca', [base, toluca])).toContain('sin_efecto')
  })
  it('ciudad y área que se contradicen con colaboradores en ambas es conflicto', () => {
    const ciudad = regla({ id: 'c', ciudad: 'leon', agrega: ['careta'] })
    const area = regla({ id: 'a', area: 'mantenimiento', quita: ['careta'], agrega: [] })
    expect(codigos('c', [base, ciudad, area])).toContain('conflicto')
    expect(codigos('a', [base, ciudad, area])).toContain('conflicto')
  })
  it('ciudad y área que no se contradicen no son conflicto', () => {
    const ciudad = regla({ id: 'c', ciudad: 'leon', agrega: ['careta'] })
    const area = regla({ id: 'a', area: 'mantenimiento', agrega: ['chaleco'] })
    expect(codigos('c', [base, ciudad, area])).not.toContain('conflicto')
  })
  it('sin colaboradores en la intersección no hay conflicto', () => {
    const ciudad = regla({ id: 'c', ciudad: 'puebla', agrega: ['careta'] })
    const area = regla({ id: 'a', area: 'mantenimiento', quita: ['careta'], agrega: [] })
    expect(codigos('c', [base, ciudad, area])).not.toContain('conflicto')
  })
})

describe('redundantesEliminables', () => {
  const gente = [persona(), persona({ area: 'mantenimiento' })]
  const base = regla({ id: 'base', agrega: ['casco'] })
  const ids = (reglas: ReglaDotacion[]) => redundantesEliminables(diagnosticar(reglas, gente)).map((r) => r.id)
  it('incluye las excepciones que no cambian nada y deja las que sí', () => {
    const igual = regla({ id: 'igual', ciudad: 'leon', agrega: [], quita: [] })
    const distinta = regla({ id: 'distinta', area: 'mantenimiento', agrega: ['careta'] })
    expect(ids([base, igual, distinta])).toEqual(['igual'])
  })
  it('no toca la base ni las que repiten solo una parte', () => {
    const parcial = regla({ id: 'parcial', ciudad: 'leon', agrega: ['casco', 'careta'] })
    expect(ids([base, parcial])).toEqual([])
  })
  it('excluye las que participan en un conflicto', () => {
    const ciudad = regla({ id: 'c', ciudad: 'leon', agrega: ['casco'], quita: [] })
    const area = regla({ id: 'a', area: 'mantenimiento', agrega: [], quita: ['casco'] })
    expect(ids([base, ciudad, area])).not.toContain('c')
  })
})
