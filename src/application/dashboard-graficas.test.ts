import { describe, expect, it } from 'vitest'
import type { Colaborador } from '@/domain/entidades'
import type { Alerta, Evaluacion, Pendiente } from './dashboard'
import { faltantesPorArticulo, pendientesDeFaltante, poblacionDeIndicador, vencimientosPorOrigen } from './dashboard-graficas'

const pendiente = (o: Partial<Pendiente>): Pendiente => ({
  colaborador: { id: 'x' } as Colaborador, capacitacionPendiente: false, sinRegla: false, prendasFaltantes: [], eppFaltantes: [], ...o,
})

describe('faltantesPorArticulo', () => {
  it('cuenta personas por artículo y ordena de mayor a menor', () => {
    const r = faltantesPorArticulo([
      pendiente({ prendasFaltantes: ['gorro', 'botas'], eppFaltantes: ['casco'] }),
      pendiente({ prendasFaltantes: ['gorro'], capacitacionPendiente: true }),
      pendiente({ capacitacionPendiente: true }),
    ])
    expect(r[0]).toEqual({ articulo: 'Capacitación vigente', tipo: 'capacitacion', personas: 2 })
    expect(r.find((f) => f.articulo === 'gorro')?.personas).toBe(2)
    expect(r.map((f) => f.personas)).toEqual([2, 2, 1, 1])
  })

  it('respeta el límite y devuelve vacío sin pendientes', () => {
    expect(faltantesPorArticulo([])).toEqual([])
    const muchos = pendiente({ prendasFaltantes: ['a', 'b', 'c'] })
    expect(faltantesPorArticulo([muchos], 2)).toHaveLength(2)
  })
})

describe('pendientesDeFaltante', () => {
  const a = pendiente({ prendasFaltantes: ['gorro'], capacitacionPendiente: true })
  const b = pendiente({ eppFaltantes: ['gorro'] })
  it('devuelve solo a quienes les falta ese artículo del mismo tipo', () => {
    expect(pendientesDeFaltante([a, b], { articulo: 'gorro', tipo: 'uniforme', personas: 1 })).toEqual([a])
    expect(pendientesDeFaltante([a, b], { articulo: 'gorro', tipo: 'epp', personas: 1 })).toEqual([b])
    expect(pendientesDeFaltante([a, b], { articulo: 'Capacitación vigente', tipo: 'capacitacion', personas: 1 })).toEqual([a])
  })
})

describe('vencimientosPorOrigen', () => {
  const alerta = (origen: Alerta['origen'], estado: Alerta['estado']): Alerta => ({
    origen, estado, ciudad: 'x', referencia: 'r', vencimiento: new Date(), dias: 0,
  })

  it('agrupa por origen separando vencidos de por vencer', () => {
    const r = vencimientosPorOrigen([alerta('epp', 'vencido'), alerta('epp', 'por_vencer'), alerta('epp', 'por_vencer'), alerta('extintor', 'vencido')])
    expect(r).toEqual([
      { origen: 'epp', vencidos: 1, porVencer: 2 },
      { origen: 'extintor', vencidos: 1, porVencer: 0 },
    ])
  })
})

describe('poblacionDeIndicador', () => {
  const ev = (o: Partial<Evaluacion>): Evaluacion => ({ ...pendiente({}), pideUniforme: false, pideEpp: false, ...o })
  const a = ev({ pideUniforme: true }), b = ev({ pideEpp: true }), c = ev({})
  it('mide capacitación sobre todos y uniforme y EPP solo sobre quienes los piden', () => {
    expect(poblacionDeIndicador([a, b, c], 'capacitacion')).toEqual([a, b, c])
    expect(poblacionDeIndicador([a, b, c], 'uniforme')).toEqual([a])
    expect(poblacionDeIndicador([a, b, c], 'epp')).toEqual([b])
  })
})
