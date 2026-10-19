import { describe, expect, it } from 'vitest'
import type { Colaborador } from '@/domain/entidades'
import type { Alerta, Pendiente } from './dashboard'
import { faltantesPorArticulo, vencimientosPorOrigen } from './dashboard-graficas'

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
