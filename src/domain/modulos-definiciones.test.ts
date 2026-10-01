import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import { admiteEliminar, MODULO_CONFIGURACION, MODULOS } from './modulos-definiciones'
import { campoVisible, limpiarOcultos, validarRegistro } from './modulos'

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

  it('botiquín de oficina: la lista solo aplica a botiquín y deriva el vencimiento', () => {
    const def = MODULOS.oficinas_equipo
    const items = [{ nombre: 'Gasas', cantidad: 2, caducidad: fechaCalendario(2027, 1, 5) }, { nombre: 'Venda', cantidad: 1, caducidad: fechaCalendario(2026, 12, 1) }]
    const v = { ciudad: 'ciudad-a', tipo: 'botiquin', items, vencimiento: fechaCalendario(2030, 1, 1) }
    expect(limpiarOcultos(def.campos, { ...v, tipo: 'extintor' }).items).toBeNull()
    expect(def.derivar!(v, ctx, hoy).vencimiento).toEqual(fechaCalendario(2026, 12, 1))
    expect(def.derivar!({ ...v, items: [] }, ctx, hoy).vencimiento).toEqual(fechaCalendario(2030, 1, 1))
    expect(validarRegistro(def, { ...v, items: [{ nombre: '' }] })['items.0.nombre']).toBe('Obligatorio')
    const oculto = (n: string, valores: Record<string, unknown>) =>
      !campoVisible(def.campos.find((c) => c.nombre === n)!, valores as never)
    expect(oculto('vencimiento', v)).toBe(true)
    expect(oculto('vencimiento', { ...v, items: [] })).toBe(false)
    expect(oculto('items', { ...v, tipo: 'extintor' })).toBe(true)
  })

  it('botiquín de vehículo deriva la caducidad y conserva la manual sin ítems', () => {
    const def = MODULOS.vehiculos
    const base = { ciudad: 'ciudad-a', placa: 'ABC-1', botiquin_caducidad: fechaCalendario(2030, 1, 1) }
    const items = [{ nombre: 'Gasas', cantidad: 1, caducidad: fechaCalendario(2027, 3, 3) }, { nombre: 'Venda', cantidad: 1, caducidad: null }]
    expect(def.derivar!({ ...base, botiquin_items: items }, ctx, hoy).botiquin_caducidad).toEqual(fechaCalendario(2027, 3, 3))
    expect(def.derivar!(base, ctx, hoy).botiquin_caducidad).toEqual(fechaCalendario(2030, 1, 1))
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

  it('solo accidentes y capacitaciones admiten adjuntos', () => {
    const con = Object.values(MODULOS).filter((m) => m.adjuntos).map((m) => `${m.id}:${m.adjuntos}`)
    expect(con.sort()).toEqual(['accidentes:accidentes', 'capacitaciones:capacitaciones'])
  })
})
