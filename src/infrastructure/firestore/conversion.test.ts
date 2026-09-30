import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { aFirestore, conAuditoria, deFirestore } from './conversion'

describe('conversión', () => {
  it('convierte Date a Timestamp y de vuelta', () => {
    const fecha = new Date('2026-08-31T12:00:00.000Z')
    const escrito = aFirestore({ fecha, nombre: 'a', vacio: undefined as never })
    expect(escrito.fecha).toBeInstanceOf(Timestamp)
    expect(escrito.vacio).toBeNull()
    expect((deFirestore(escrito).fecha as Date).toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })
  it('agrega auditoría de alta o de edición', () => {
    const marca = { marca: true }
    expect(conAuditoria({ a: 1 }, 'u1', true, marca)).toEqual({
      a: 1, creado_por: 'u1', creado_en: marca, actualizado_por: 'u1', actualizado_en: marca,
    })
    expect(conAuditoria({ a: 1 }, 'u1', false, marca)).toEqual({
      a: 1, actualizado_por: 'u1', actualizado_en: marca,
    })
  })
})
