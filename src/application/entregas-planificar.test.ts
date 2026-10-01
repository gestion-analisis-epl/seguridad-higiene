import { describe, expect, it } from 'vitest'
import { fechaCalendario } from '@/domain/fechas'
import { CONFIG_EPP, CONFIG_UNIFORME } from './entregas-config'
import { planificarEntrega, valoresIniciales, type EntradaEntrega } from './entregas-planificar'

const f1 = fechaCalendario(2026, 3, 5)
const f2 = fechaCalendario(2026, 8, 20)
const base = { colaboradorId: 'c1', ciudad: 'ciudad-a', claves: ['botas', 'playera'], ultimas: {} }

const uniforme = (parcial: Partial<EntradaEntrega>): EntradaEntrega =>
  ({ ...base, config: CONFIG_UNIFORME, modo: 'nueva', fecha: f1, items: {}, ...parcial })
const epp = (parcial: Partial<EntradaEntrega>): EntradaEntrega =>
  ({ ...base, claves: ['casco', 'lentes'], config: CONFIG_EPP, modo: 'nueva', fecha: f1, items: {}, ...parcial })

describe('uniforme, nueva entrega', () => {
  it('crea un documento por prenda capturada con la forma del formulario anterior', () => {
    const r = planificarEntrega(uniforme({ items: { botas: { talla: '27', cantidad: 1 }, playera: { talla: 'M', cantidad: 2 } } }))
    expect(r.errores).toEqual({ items: {} })
    expect(r.operaciones).toEqual([
      { tipo: 'crear', coleccion: 'entregas_uniforme', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', prenda: 'botas', talla: '27', cantidad: 1, fecha: f1, periodo: '2026-03' } },
      { tipo: 'crear', coleccion: 'entregas_uniforme', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', prenda: 'playera', talla: 'M', cantidad: 2, fecha: f1, periodo: '2026-03' } },
    ])
  })
  it('ignora las prendas vacías', () => {
    const r = planificarEntrega(uniforme({ items: { botas: { talla: '27', cantidad: 1 }, playera: { talla: '', cantidad: null } } }))
    expect(r.operaciones).toHaveLength(1)
  })
  it('sin ninguna prenda capturada es un error general', () => {
    const r = planificarEntrega(uniforme({ items: { botas: {} } }))
    expect(r.errores.general).toBeTruthy()
    expect(r.operaciones).toEqual([])
  })
  it('una prenda a medias exige talla y cantidad', () => {
    const r = planificarEntrega(uniforme({ items: { botas: { talla: '27' }, playera: { cantidad: 2 } } }))
    expect(r.errores.items).toEqual({ botas: { cantidad: 'Obligatorio' }, playera: { talla: 'Obligatorio' } })
    expect(r.operaciones).toEqual([])
  })
  it('cantidad negativa es inválida', () => {
    const r = planificarEntrega(uniforme({ items: { botas: { talla: '27', cantidad: -1 } } }))
    expect(r.errores.items.botas.cantidad).toBe('Número inválido')
  })
  it('la fecha compartida es obligatoria con prendas capturadas y se reporta una sola vez', () => {
    const r = planificarEntrega(uniforme({ fecha: null, items: { botas: { talla: '27', cantidad: 1 }, playera: { talla: 'M', cantidad: 1 } } }))
    expect(r.errores.fecha).toBe('Obligatorio')
    expect(r.errores.items).toEqual({})
  })
  it('sin ciudad deriva null como la definición', () => {
    const r = planificarEntrega(uniforme({ ciudad: null, items: { botas: { talla: '27', cantidad: 0 } } }))
    expect(r.operaciones[0]).toMatchObject({ valores: { ciudad: null, cantidad: 0 } })
  })
})

describe('uniforme, corregir', () => {
  const ultimas = {
    botas: { id: 'r1', colaborador_id: 'c1', ciudad: 'ciudad-a', prenda: 'botas', talla: '27', cantidad: 1, fecha: f1, periodo: '2026-03' },
  }
  const igual = { talla: '27', cantidad: 1, fecha: f1 }
  it('actualiza solo el registro cambiado y recalcula el periodo', () => {
    const r = planificarEntrega(uniforme({ modo: 'corregir', ultimas, items: { botas: { ...igual, talla: '28', fecha: f2 } } }))
    expect(r.operaciones).toEqual([
      { tipo: 'actualizar', coleccion: 'entregas_uniforme', id: 'r1', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', prenda: 'botas', talla: '28', cantidad: 1, fecha: f2, periodo: '2026-08' } },
    ])
  })
  it('sin cambios es un error', () => {
    const r = planificarEntrega(uniforme({ modo: 'corregir', ultimas, items: { botas: igual } }))
    expect(r.errores.general).toBe('No hay cambios')
    expect(r.operaciones).toEqual([])
  })
  it('una prenda vaciada no cambia nada', () => {
    const r = planificarEntrega(uniforme({ modo: 'corregir', ultimas, items: { botas: { talla: '', cantidad: null, fecha: f1 } } }))
    expect(r.errores.general).toBe('No hay cambios')
  })
  it('una prenda sin registro capturada se crea con su propia fecha', () => {
    const r = planificarEntrega(uniforme({
      modo: 'corregir', ultimas, fecha: null,
      items: { botas: igual, playera: { talla: 'M', cantidad: 2, fecha: f2 } },
    }))
    expect(r.operaciones).toEqual([
      { tipo: 'crear', coleccion: 'entregas_uniforme', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', prenda: 'playera', talla: 'M', cantidad: 2, fecha: f2, periodo: '2026-08' } },
    ])
  })
  it('la fecha propia es obligatoria en una prenda editada', () => {
    const r = planificarEntrega(uniforme({ modo: 'corregir', ultimas, items: { botas: { ...igual, fecha: null } } }))
    expect(r.errores.items.botas.fecha).toBe('Obligatorio')
  })
})

describe('EPP, nueva entrega', () => {
  it('crea por cada EPP entregado con vencimiento opcional', () => {
    const r = planificarEntrega(epp({ items: { casco: { entregado: true, vencimiento: f2 }, lentes: { entregado: true } } }))
    expect(r.operaciones).toEqual([
      { tipo: 'crear', coleccion: 'entregas_epp', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', tipo: 'casco', entregado: true, fecha: f1, vencimiento: f2 } },
      { tipo: 'crear', coleccion: 'entregas_epp', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', tipo: 'lentes', entregado: true, fecha: f1, vencimiento: null } },
    ])
  })
  it('un EPP sin marcar no crea nada y sin ninguno es error', () => {
    const r = planificarEntrega(epp({ items: { casco: { entregado: false } } }))
    expect(r.errores.general).toBeTruthy()
  })
  it('un vencimiento sin marcar Entregado es error por artículo aunque haya otros capturados', () => {
    const r = planificarEntrega(epp({ items: { casco: { entregado: true }, lentes: { entregado: false, vencimiento: f2 } } }))
    expect(r.errores.items).toEqual({ lentes: { vencimiento: 'Marca Entregado para registrar el vencimiento' } })
    expect(r.operaciones).toEqual([])
  })
  it('un vencimiento sin marcar Entregado y sin otros artículos también es error', () => {
    const r = planificarEntrega(epp({ items: { casco: { vencimiento: f2 } } }))
    expect(r.errores.items.casco.vencimiento).toBe('Marca Entregado para registrar el vencimiento')
    expect(r.errores.general).toBeUndefined()
  })
  it('exige la fecha compartida', () => {
    const r = planificarEntrega(epp({ fecha: null, items: { casco: { entregado: true } } }))
    expect(r.errores.fecha).toBe('Obligatorio')
  })
})

describe('EPP, corregir', () => {
  const ultimas = {
    casco: { id: 'e1', colaborador_id: 'c1', ciudad: 'ciudad-a', tipo: 'casco', entregado: true, fecha: f1, vencimiento: null },
  }
  it('actualiza el vencimiento de la última entrega', () => {
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas, items: { casco: { entregado: true, fecha: f1, vencimiento: f2 } } }))
    expect(r.operaciones).toEqual([
      { tipo: 'actualizar', coleccion: 'entregas_epp', id: 'e1', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', tipo: 'casco', entregado: true, fecha: f1, vencimiento: f2 } },
    ])
  })
  it('desmarcar entregado es un cambio válido', () => {
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas, items: { casco: { entregado: false, fecha: f1, vencimiento: null } } }))
    expect(r.operaciones[0]).toMatchObject({ tipo: 'actualizar', id: 'e1', valores: { entregado: false } })
  })
  it('una entrega sin fecha puede corregirse sin pedirla', () => {
    const sinFecha = { casco: { ...ultimas.casco, fecha: null } }
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas: sinFecha, items: { casco: { entregado: true, fecha: null, vencimiento: f2 } } }))
    expect(r.errores.items).toEqual({})
    expect(r.operaciones).toHaveLength(1)
  })
  it('sin cambios es un error', () => {
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas, items: { casco: { entregado: true, fecha: f1, vencimiento: null } } }))
    expect(r.errores.general).toBe('No hay cambios')
  })
  it('un EPP sin registro con solo vencimiento sigue sin crearse al corregir', () => {
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas, items: { lentes: { entregado: false, vencimiento: f2 } } }))
    expect(r.operaciones).toEqual([])
    expect(r.errores.general).toBe('No hay cambios')
  })
  it('un EPP sin registro marcado se crea con su fecha', () => {
    const r = planificarEntrega(epp({ modo: 'corregir', ultimas, items: { lentes: { entregado: true, fecha: f2 } } }))
    expect(r.operaciones).toEqual([
      { tipo: 'crear', coleccion: 'entregas_epp', valores: {
        colaborador_id: 'c1', ciudad: 'ciudad-a', tipo: 'lentes', entregado: true, fecha: f2, vencimiento: null } },
    ])
  })
})

describe('valoresIniciales', () => {
  it('toma los campos del registro y nada más', () => {
    const r = { id: 'r1', colaborador_id: 'c1', prenda: 'botas', talla: '27', cantidad: 1, fecha: f1, periodo: 'x' }
    expect(valoresIniciales(CONFIG_UNIFORME, r)).toEqual({ talla: '27', cantidad: 1, fecha: f1 })
  })
  it('sin registro queda vacío', () => {
    expect(valoresIniciales(CONFIG_EPP, undefined)).toEqual({})
  })
})

describe('sanitizado de texto en entregas', () => {
  it('limpia la talla antes de guardar', () => {
    const r = planificarEntrega(uniforme({ items: { botas: { talla: '  27 \n ', cantidad: 1 } } }))
    expect(r.operaciones[0]).toMatchObject({ valores: { talla: '27' } })
  })
})
