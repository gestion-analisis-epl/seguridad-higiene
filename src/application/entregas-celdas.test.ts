import { describe, expect, it } from 'vitest'
import { fechaCalendario } from '@/domain/fechas'
import { CONFIG_EPP, CONFIG_UNIFORME } from './entregas-config'
import { estadoEpp, textoCelda } from './entregas-celdas'

const hoy = new Date(2026, 8, 30)
const epp = (p: Record<string, unknown>) => ({ id: 'e', entregado: true, fecha: fechaCalendario(2026, 1, 1), vencimiento: null, ...p })

describe('estadoEpp', () => {
  it('no entregado', () => {
    expect(estadoEpp(epp({ entregado: false }), hoy)).toEqual({ clave: 'no_entregado', texto: 'No entregado' })
  })
  it('sin vencimiento', () => {
    expect(estadoEpp(epp({}), hoy)).toEqual({ clave: 'sin_fecha', texto: 'Sin vencimiento' })
  })
  it('vigente, por vencer y vencido', () => {
    expect(estadoEpp(epp({ vencimiento: fechaCalendario(2027, 1, 1) }), hoy).texto).toBe('Vigente')
    expect(estadoEpp(epp({ vencimiento: fechaCalendario(2026, 10, 10) }), hoy).texto).toBe('Por vencer')
    expect(estadoEpp(epp({ vencimiento: fechaCalendario(2026, 9, 1) }), hoy).texto).toBe('Vencido')
  })
})

describe('textos', () => {
  const u = { id: 'u', talla: 'M', cantidad: 2, fecha: fechaCalendario(2026, 3, 5) }
  it('celda de uniforme con talla, cantidad y fecha', () => {
    expect(textoCelda(CONFIG_UNIFORME, u)).toBe('M, 2, 05/03/2026')
  })
  it('detalle de uniforme y de EPP', () => {
    expect(CONFIG_UNIFORME.detalle(u)).toBe('Talla M, cantidad 2')
    expect(CONFIG_EPP.detalle(epp({ vencimiento: fechaCalendario(2027, 1, 1) }))).toBe('Entregado, vence 01/01/2027')
    expect(CONFIG_EPP.detalle(epp({ entregado: false }))).toBe('No entregado')
  })
})
