import { describe, expect, it } from 'vitest'
import type { DatosOperativos } from '@/domain/entidades'
import { fechaCalendario } from '@/domain/fechas'
import { CONFIG_INDICADORES_INICIAL as cfg } from '@/domain/indicadores'
import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'
import {
  acumuladoAnual, alertasVencimiento, comparativoCiudades, pendientesPorColaborador,
  resumenGlobal, resumenPorCiudad, serieMensual,
} from './dashboard'
import { filtrarPorCiudad, filtrarPorCiudades } from './dashboard-filtro'

const hoy = new Date(2026, 8, 30)

const datos: DatosOperativos = {
  colaboradores: [
    { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', activo: true },
    { id: 'c2', nombre: 'Beto', ciudad: 'ciudad-a', linea_negocio: 'linea-x', activo: true },
    { id: 'c3', nombre: 'Cami', ciudad: 'ciudad-b', linea_negocio: 'linea-x', activo: false },
  ],
  capacitaciones: [
    { colaborador_id: 'c1', norma: 'norma-a', ciudad: 'ciudad-a', cumple: true, fecha: fechaCalendario(2026, 5, 4), vencimiento: fechaCalendario(2027, 5, 4) },
    { colaborador_id: 'c2', norma: 'norma-a', ciudad: 'ciudad-a', cumple: true, fecha: fechaCalendario(2025, 5, 4), vencimiento: fechaCalendario(2026, 9, 1) },
  ],
  entregasUniforme: PRENDAS.map((prenda) => ({ colaborador_id: 'c1', prenda })),
  entregasEpp: TIPOS_EPP.map((tipo) => ({ colaborador_id: 'c1', tipo, entregado: true, vencimiento: null })),
  equipoOficinas: [{ ciudad: 'ciudad-a', tipo: 'extintor', vencimiento: fechaCalendario(2026, 10, 15) }],
  vehiculos: [{ ciudad: 'ciudad-a', placa: 'ABC-1', extintor_vencimiento: fechaCalendario(2026, 9, 20), botiquin_caducidad: null }],
}

describe('resumenPorCiudad', () => {
  it('calcula activos y porcentajes solo con colaboradores activos', () => {
    const ciudadA = resumenPorCiudad(datos, hoy).find((r) => r.ciudad === 'ciudad-a')!
    expect(ciudadA.activos).toBe(2)
    expect(ciudadA.pctCapacitacion).toBeCloseTo(0.5)
    expect(ciudadA.pctUniforme).toBeCloseTo(0.5)
    expect(ciudadA.pctEpp).toBeCloseTo(0.5)
  })
  it('omite ciudades sin colaboradores activos', () => {
    expect(resumenPorCiudad(datos, hoy).some((r) => r.ciudad === 'ciudad-b')).toBe(false)
  })
})

describe('pendientesPorColaborador', () => {
  it('lista a quien tiene pendientes', () => {
    const p = pendientesPorColaborador(datos, hoy)
    expect(p).toHaveLength(1)
    expect(p[0].colaborador.id).toBe('c2')
    expect(p[0].capacitacionPendiente).toBe(true)
    expect(p[0].prendasFaltantes).toEqual([...PRENDAS])
    expect(p[0].eppFaltantes).toEqual([...TIPOS_EPP])
  })
})

describe('alertasVencimiento', () => {
  it('incluye vencidos y por vencer, ordenados por días', () => {
    const a = alertasVencimiento(datos, hoy)
    expect(a.map((x) => [x.origen, x.estado, x.dias])).toEqual([
      ['capacitacion', 'vencido', -29],
      ['vehiculo_extintor', 'vencido', -10],
      ['extintor', 'por_vencer', 15],
    ])
    expect(a[0].referencia).toBe('Beto')
    expect(a[1].referencia).toBe('ABC-1')
  })

  const botiquinOficina = (items?: { nombre: string; caducidad: Date | null }[]) =>
    ({ ciudad: 'ciudad-a', tipo: 'botiquin' as const, vencimiento: fechaCalendario(2026, 10, 10), items })

  it('botiquín con ítems: una alerta por ítem con caducidad en ventana o vencida', () => {
    const a = alertasVencimiento(soloPersonas({
      equipoOficinas: [botiquinOficina([
        { nombre: 'Gasas', caducidad: fechaCalendario(2026, 10, 5) },
        { nombre: 'Venda', caducidad: fechaCalendario(2026, 9, 1) },
        { nombre: 'Tijeras', caducidad: null },
        { nombre: 'Alcohol', caducidad: fechaCalendario(2028, 1, 1) },
      ])],
    }), hoy)
    expect(a.map((x) => [x.origen, x.referencia, x.estado])).toEqual([
      ['botiquin', 'Botiquín: Venda', 'vencido'],
      ['botiquin', 'Botiquín: Gasas', 'por_vencer'],
    ])
  })

  it('botiquín sin ítems conserva la alerta de la fecha única', () => {
    const a = alertasVencimiento(soloPersonas({ equipoOficinas: [botiquinOficina(), botiquinOficina([])] }), hoy)
    expect(a.map((x) => x.referencia)).toEqual(['Botiquín', 'Botiquín'])
  })

  it('vehículo con ítems alerta por ítem y sin ítems usa la fecha única', () => {
    const base = { ciudad: 'ciudad-a', placa: 'ABC-1', extintor_vencimiento: null }
    const a = alertasVencimiento(soloPersonas({
      vehiculos: [
        { ...base, botiquin_caducidad: fechaCalendario(2026, 10, 1), botiquin_items: [
          { nombre: 'Gasas', caducidad: fechaCalendario(2026, 10, 3) }, { nombre: 'Venda', caducidad: null },
        ] },
        { ...base, placa: 'XYZ-2', botiquin_caducidad: fechaCalendario(2026, 10, 4) },
      ],
    }), hoy)
    expect(a.map((x) => [x.origen, x.referencia])).toEqual([
      ['vehiculo_botiquin', 'ABC-1 - Botiquín: Gasas'],
      ['vehiculo_botiquin', 'XYZ-2'],
    ])
  })

  const cap = (colaborador_id: string, anio: number, vencimiento: Date | null) =>
    ({ colaborador_id, norma: 'norma-a', ciudad: 'ciudad-a', cumple: true, fecha: fechaCalendario(anio, 1, 1), vencimiento })
  const epp = (colaborador_id: string, vencimiento: Date | null) =>
    ({ colaborador_id, tipo: 'casco', entregado: true, vencimiento })
  const soloPersonas = (extra: Partial<DatosOperativos>): DatosOperativos =>
    ({ ...datos, equipoOficinas: [], vehiculos: [], capacitaciones: [], entregasEpp: [], ...extra })
  const vencida = fechaCalendario(2026, 9, 1)
  const vigente = fechaCalendario(2027, 9, 1)

  it('no alerta una capacitación vencida si hay una más reciente vigente de la misma norma', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2025, vencida), cap('c2', 2026, vigente)] })
    expect(alertasVencimiento(d, hoy)).toEqual([])
  })
  it('alerta una sola vez cuando la más reciente también está vencida', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2024, fechaCalendario(2025, 9, 1)), cap('c2', 2025, vencida)] })
    const a = alertasVencimiento(d, hoy)
    expect(a).toHaveLength(1)
    expect(a[0].dias).toBe(-29)
  })
  it('separa por norma: otra norma vencida sí alerta', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2026, vigente), { ...cap('c2', 2025, vencida), norma: 'norma-b' }] })
    expect(alertasVencimiento(d, hoy)).toHaveLength(1)
  })
  it('una renovación sin vencimiento cancela la alerta de la vencida', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2025, vencida), cap('c2', 2026, null)] })
    expect(alertasVencimiento(d, hoy)).toEqual([])
  })
  it('un registro sin vencimiento gana aunque sea más antiguo que uno fechado vencido', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2024, null), cap('c2', 2025, vencida)] })
    expect(alertasVencimiento(d, hoy)).toEqual([])
  })
  it('dos registros fechados idénticos y vencidos dan una sola alerta', () => {
    const d = soloPersonas({ capacitaciones: [cap('c2', 2025, vencida), cap('c2', 2025, vencida)] })
    expect(alertasVencimiento(d, hoy)).toHaveLength(1)
  })
  it('una capacitación que no cumple y sin vencimiento no suprime la alerta de la vencida que cumple', () => {
    const pendiente = { ...cap('c2', 2026, null), cumple: false }
    const d = soloPersonas({ capacitaciones: [cap('c2', 2025, vencida), pendiente] })
    expect(alertasVencimiento(d, hoy)).toHaveLength(1)
  })
  it('EPP: una entrega sin vencimiento cancela la alerta de la vencida', () => {
    expect(alertasVencimiento(soloPersonas({ entregasEpp: [epp('c2', vencida), epp('c2', null)] }), hoy)).toEqual([])
    expect(alertasVencimiento(soloPersonas({ entregasEpp: [epp('c2', null), epp('c2', vencida)] }), hoy)).toEqual([])
  })
  it('EPP: dos entregas idénticas vencidas dan una sola alerta', () => {
    expect(alertasVencimiento(soloPersonas({ entregasEpp: [epp('c2', vencida), epp('c2', vencida)] }), hoy)).toHaveLength(1)
  })
  it('EPP: la entrega más reciente del mismo tipo reemplaza a la vencida', () => {
    expect(alertasVencimiento(soloPersonas({ entregasEpp: [epp('c2', vencida), epp('c2', vigente)] }), hoy)).toEqual([])
    expect(alertasVencimiento(soloPersonas({ entregasEpp: [epp('c2', vencida)] }), hoy)).toHaveLength(1)
  })
  it('omite capacitaciones y EPP de colaboradores inactivos', () => {
    const d = soloPersonas({ capacitaciones: [cap('c3', 2025, vencida)], entregasEpp: [epp('c3', vencida)] })
    expect(alertasVencimiento(d, hoy)).toEqual([])
  })
})

describe('activo por omisión', () => {
  it('un colaborador sin campo activo cuenta como activo', () => {
    const d: DatosOperativos = {
      ...datos,
      colaboradores: [{ id: 'c9', nombre: 'Dani', ciudad: 'ciudad-a', linea_negocio: 'linea-x' }],
      capacitaciones: [], equipoOficinas: [], vehiculos: [],
      entregasEpp: [{ colaborador_id: 'c9', tipo: 'casco', entregado: true, vencimiento: fechaCalendario(2026, 9, 1) }],
    }
    expect(resumenPorCiudad(d, hoy)[0]).toMatchObject({ ciudad: 'ciudad-a', activos: 1 })
    expect(pendientesPorColaborador(d, hoy).map((p) => p.colaborador.id)).toEqual(['c9'])
    expect(alertasVencimiento(d, hoy)).toHaveLength(1)
  })
})

describe('serie e indicadores', () => {
  const accidentes = [
    { ciudad: 'ciudad-a', periodo: '2026-06', tipo: 'laboral' as const, dias_incapacidad: 3 },
    { ciudad: 'ciudad-a', periodo: '2026-08', tipo: 'trayecto' as const, dias_incapacidad: 2 },
    { ciudad: 'ciudad-b', periodo: '2026-08', tipo: 'laboral' as const, dias_incapacidad: 0 },
  ]
  const poblaciones = [
    { ciudad: 'ciudad-a', periodo: '2026-06', poblacion: 10 },
    { ciudad: 'ciudad-a', periodo: '2026-08', poblacion: 20 },
    { ciudad: 'ciudad-b', periodo: '2026-08', poblacion: 10 },
  ]

  it('arma 12 meses; eventos y dias solo cuentan laborales y trayecto es informativo', () => {
    const s = serieMensual(accidentes, poblaciones, cfg, 2026, ['ciudad-a'])
    expect(s).toHaveLength(12)
    expect(s[5]).toMatchObject({ periodo: '2026-06', laboral: 1, trayecto: 0, eventos: 1, dias: 3, poblacion: 10 })
    expect(s[7]).toMatchObject({ periodo: '2026-08', laboral: 0, trayecto: 1, eventos: 0, dias: 0 })
    expect(s[5].indiceFrecuencia).toBeCloseTo(8.333333333, 6)
    expect(s[0].ili).toBeNull()
  })
  it('un mes solo con trayecto da indices en cero, no nulos, si hay HHT', () => {
    const p = serieMensual(accidentes, poblaciones, cfg, 2026, ['ciudad-a'])[7]
    expect([p.indiceFrecuencia, p.indiceSeveridad, p.ili]).toEqual([0, 0, 0])
  })
  it('un mes con ambos tipos cuenta solo el laboral en eventos y dias', () => {
    const mixtos = [
      { ciudad: 'ciudad-a', periodo: '2026-03', tipo: 'trayecto' as const, dias_incapacidad: 5 },
      { ciudad: 'ciudad-a', periodo: '2026-03', tipo: 'laboral' as const, dias_incapacidad: 3 },
    ]
    const p = serieMensual(mixtos, [{ ciudad: 'ciudad-a', periodo: '2026-03', poblacion: 10 }], cfg, 2026)[2]
    expect(p).toMatchObject({ trayecto: 1, laboral: 1, eventos: 1, dias: 3 })
  })
  it('sin ciudad consolida todas', () => {
    const s = serieMensual(accidentes, poblaciones, cfg, 2026)
    expect(s[7]).toMatchObject({ eventos: 1, trayecto: 1, laboral: 1, poblacion: 30 })
  })
  it('acumulado anual suma HHT, eventos y dias laborales de los meses', () => {
    const r = acumuladoAnual(serieMensual(accidentes, poblaciones, cfg, 2026, ['ciudad-a']), cfg)
    expect(r.hht).toBe((10 + 20) * 240)
    expect(r.eventos).toBe(1)
    expect(r.dias).toBe(3)
  })
  it('compara ciudades ordenando por ILI descendente y dejando al final las que no tienen dato', () => {
    const r = comparativoCiudades(accidentes, poblaciones, cfg, 2026, ['ciudad-b', 'ciudad-a', 'ciudad-c'])
    expect(r.map((f) => f.ciudad)).toEqual(['ciudad-a', 'ciudad-b', 'ciudad-c'])
    expect(r[2].nivel).toBe('sin_dato')
  })
})

describe('filtrarPorCiudades', () => {
  it('undefined devuelve todo', () => {
    expect(filtrarPorCiudades(datos, undefined)).toBe(datos)
  })
  it('filtra colaboradores, capacitaciones, equipo y vehículos por ciudad', () => {
    const d = filtrarPorCiudades(datos, ['ciudad-b'])
    expect(d.colaboradores.map((c) => c.id)).toEqual(['c3'])
    expect(d.capacitaciones).toEqual([])
    expect(d.equipoOficinas).toEqual([])
    expect(d.vehiculos).toEqual([])
  })
  it('las entregas siguen a su colaborador', () => {
    const a = filtrarPorCiudades(datos, ['ciudad-a'])
    expect(a.entregasUniforme).toHaveLength(PRENDAS.length)
    expect(a.entregasEpp).toHaveLength(TIPOS_EPP.length)
    const b = filtrarPorCiudades(datos, ['ciudad-b'])
    expect(b.entregasUniforme).toEqual([])
    expect(b.entregasEpp).toEqual([])
  })
  it('una lista vacía no deja nada', () => {
    expect(filtrarPorCiudades(datos, []).colaboradores).toEqual([])
  })
  it('filtra listas con ciudad (accidentes y población)', () => {
    const lista = [{ ciudad: 'ciudad-a' }, { ciudad: 'ciudad-b' }]
    expect(filtrarPorCiudad(lista, ['ciudad-b'])).toEqual([{ ciudad: 'ciudad-b' }])
    expect(filtrarPorCiudad(lista, undefined)).toBe(lista)
  })
})

describe('resumenGlobal', () => {
  it('suma numeradores sobre activos y cuenta alertas', () => {
    const r = resumenGlobal(datos, hoy)
    expect(r.activos).toBe(2)
    expect(r.pctCapacitacion).toBeCloseTo(0.5)
    expect(r.pctUniforme).toBeCloseTo(0.5)
    expect(r.pctEpp).toBeCloseTo(0.5)
    expect(r.vencidos).toBe(2)
    expect(r.porVencer).toBe(1)
  })
  it('sin activos devuelve ceros', () => {
    expect(resumenGlobal(filtrarPorCiudades(datos, ['ciudad-b']), hoy))
      .toMatchObject({ activos: 0, pctCapacitacion: 0, pctUniforme: 0, pctEpp: 0 })
  })
})

describe('series con varias ciudades', () => {
  const acc = [
    { ciudad: 'ciudad-a', periodo: '2026-08', tipo: 'laboral' as const, dias_incapacidad: 1 },
    { ciudad: 'ciudad-b', periodo: '2026-08', tipo: 'laboral' as const, dias_incapacidad: 2 },
    { ciudad: 'ciudad-c', periodo: '2026-08', tipo: 'laboral' as const, dias_incapacidad: 4 },
  ]
  const pob = ['ciudad-a', 'ciudad-b', 'ciudad-c'].map((ciudad) => ({ ciudad, periodo: '2026-08', poblacion: 10 }))
  it('suma solo las ciudades indicadas', () => {
    const p = serieMensual(acc, pob, cfg, 2026, ['ciudad-a', 'ciudad-b'])[7]
    expect(p).toMatchObject({ eventos: 2, dias: 3, poblacion: 20 })
  })
  it('lista vacía no suma nada', () => {
    expect(serieMensual(acc, pob, cfg, 2026, [])[7]).toMatchObject({ eventos: 0, poblacion: 0 })
  })
})

describe('requisitos desde catálogos', () => {
  const requisitos = { prendas: ['gorra'], tiposEpp: ['mascarilla', 'guantes'] }
  const extra: DatosOperativos = {
    ...datos,
    entregasUniforme: [{ colaborador_id: 'c1', prenda: 'gorra' }, { colaborador_id: 'c2', prenda: 'botas' }],
    entregasEpp: [{ colaborador_id: 'c1', tipo: 'mascarilla', entregado: true, vencimiento: null }],
  }
  it('pendientes usa las listas recibidas', () => {
    const p = pendientesPorColaborador(extra, hoy, requisitos)
    expect(p.find((x) => x.colaborador.id === 'c1')?.prendasFaltantes).toEqual([])
    expect(p.find((x) => x.colaborador.id === 'c1')?.eppFaltantes).toEqual(['guantes'])
    expect(p.find((x) => x.colaborador.id === 'c2')?.prendasFaltantes).toEqual(['gorra'])
  })
  it('resumen global y por ciudad usan las listas recibidas', () => {
    expect(resumenGlobal(extra, hoy, requisitos).pctUniforme).toBeCloseTo(0.5)
    expect(resumenGlobal(extra, hoy, requisitos).pctEpp).toBe(0)
    expect(resumenPorCiudad(extra, hoy, requisitos)[0].pctUniforme).toBeCloseTo(0.5)
  })
  it('sin listas o con listas vacías usa las constantes', () => {
    expect(pendientesPorColaborador(datos, hoy, { prendas: [], tiposEpp: [] })).toEqual(pendientesPorColaborador(datos, hoy))
    expect(resumenGlobal(datos, hoy, undefined).pctUniforme).toBeCloseTo(0.5)
  })
})
