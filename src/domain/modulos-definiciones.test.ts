import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import { admiteEliminar, MODULO_CONFIGURACION, MODULOS } from './modulos-definiciones'
import { validarRegistro } from './modulos'

const ctx = { ciudadDeColaborador: (id: string) => (id === 'c1' ? 'ciudad-a' : null) }
const hoy = new Date(2026, 8, 30)

describe('definiciones', () => {
  it('las columnas existen como campos', () => {
    for (const def of [...Object.values(MODULOS), MODULO_CONFIGURACION]) {
      const nombres = def.campos.map((c) => c.nombre)
      for (const col of def.columnas) expect(nombres, `${def.id}.${col}`).toContain(col)
    }
  })

  it('accidentes derivan ciudad y periodo', () => {
    const r = MODULOS.accidentes.derivar!(
      { colaborador_id: 'c1', fecha: fechaCalendario(2026, 8, 24), tipo: 'laboral', dias_incapacidad: 2 }, ctx, hoy)
    expect(r.ciudad).toBe('ciudad-a')
    expect(r.periodo).toBe('2026-08')
  })

  it('capacitaciones derivan ciudad y estado', () => {
    const vencida = MODULOS.capacitaciones.derivar!({
      colaborador_id: 'c1', fecha: fechaCalendario(2025, 5, 4), vencimiento: fechaCalendario(2026, 5, 4),
    }, ctx, hoy)
    expect(vencida.ciudad).toBe('ciudad-a')
    expect(vencida.estado).toBe('vencido')
    expect(MODULOS.capacitaciones.derivar!({ colaborador_id: 'c1', fecha: null }, ctx, hoy).estado).toBe('pendiente')
  })

  it('población mensual usa ID fijo ciudad_periodo y valida el formato', () => {
    const v = { ciudad: 'ciudad-a', periodo: '2026-08', poblacion: 20 }
    expect(MODULOS.indicadores_mensuales.idFijo!(v)).toBe('ciudad-a_2026-08')
    expect(validarRegistro(MODULOS.indicadores_mensuales, { ...v, periodo: '2026-8' }).periodo).toBeDefined()
  })

  it('la configuración usa ID fijo', () => {
    expect(MODULO_CONFIGURACION.idFijo!({})).toBe('indicadores')
  })

  it('colaboradores nace activo', () => {
    expect(MODULOS.colaboradores.inicial).toEqual({ activo: true })
  })

  it('capacitaciones nace cumplida', () => {
    expect(MODULOS.capacitaciones.inicial).toEqual({ cumple: true })
  })

  it('se puede eliminar en todos los módulos de lista salvo colaboradores y configuración', () => {
    expect(admiteEliminar(MODULOS.colaboradores)).toBe(false)
    expect(admiteEliminar(MODULO_CONFIGURACION)).toBe(false)
    expect(admiteEliminar(MODULOS.accidentes)).toBe(true)
    expect(admiteEliminar(MODULOS.indicadores_mensuales)).toBe(true)
  })
})
