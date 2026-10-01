import { describe, expect, it } from 'vitest'
import type { Alerta, Pendiente, ResumenCiudad } from '@/application/dashboard'
import { fechaCalendario } from '@/domain/fechas'
import { atributosAlerta, columnasAlertas, columnasPendientes, columnasPorCiudad, porcentaje } from './columnas-operativo'

const etiqueta = (v: string) => (v === 'ciudad-a' ? 'Ciudad A' : v)

describe('columnas operativas', () => {
  const alerta: Alerta = {
    origen: 'vehiculo_extintor', ciudad: 'ciudad-a', referencia: 'ABC-1',
    vencimiento: fechaCalendario(2026, 9, 20), dias: -10, estado: 'vencido',
  }
  it('alertas: estado con texto, origen legible y ciudad por etiqueta', () => {
    const v = (id: string) => columnasAlertas(etiqueta).find((c) => c.id === id)!.valor(alerta)
    expect(v('estado')).toBe('Vencido')
    expect(v('origen')).toBe('vehiculo extintor')
    expect(v('ciudad')).toBe('Ciudad A')
    expect(v('dias')).toBe(-10)
    expect(atributosAlerta(alerta)).toEqual({ 'data-estado': 'vencido' })
  })
  it('pendientes: estado de capacitación y guion cuando no falta nada', () => {
    const p: Pendiente = {
      colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', area: 'Área X' },
      capacitacionPendiente: false, prendasFaltantes: [], eppFaltantes: ['casco', 'guantes'],
    }
    const v = (id: string) => columnasPendientes(etiqueta).find((c) => c.id === id)!.valor(p)
    expect(v('capacitacion')).toBe('Vigente')
    expect(v('uniforme')).toBe('-')
    expect(v('epp')).toBe('casco, guantes')
    expect(v('area')).toBe('Área X')
  })
  it('por ciudad: porcentajes enteros', () => {
    const r: ResumenCiudad = { ciudad: 'ciudad-a', activos: 3, pctCapacitacion: 2 / 3, pctUniforme: 1, pctEpp: 0 }
    const v = (id: string) => columnasPorCiudad(etiqueta).find((c) => c.id === id)!.valor(r)
    expect(v('cap')).toBe(67)
    expect(v('epp')).toBe(0)
    expect(v('ciudad')).toBe('Ciudad A')
    expect(porcentaje(0.5)).toBe(50)
  })
})
