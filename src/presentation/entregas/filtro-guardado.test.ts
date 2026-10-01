import { describe, expect, it } from 'vitest'
import { claveFiltroEntregas, filtroEntregasEfectivo, filtroEntregasValido } from './filtro-guardado'

describe('filtro de entregas guardado', () => {
  it('usa una clave por catalogo', () => {
    expect(claveFiltroEntregas('prendas')).not.toBe(claveFiltroEntregas('tipos_epp'))
  })
  it('valida la forma', () => {
    expect(filtroEntregasValido({ ciudad: 'ciudad-a', texto: 'ana' })).toBe(true)
    expect(filtroEntregasValido({ ciudad: 1, texto: '' })).toBe(false)
    expect(filtroEntregasValido({ ciudad: '' })).toBe(false)
    expect([null, [], 'x'].some(filtroEntregasValido)).toBe(false)
  })
  it('ignora ciudades desconocidas y conserva las conocidas', () => {
    expect(filtroEntregasEfectivo({ ciudad: 'ciudad-x', texto: 'a' }, ['ciudad-a'])).toEqual({ ciudad: '', texto: 'a' })
    expect(filtroEntregasEfectivo({ ciudad: 'ciudad-a', texto: '' }, ['ciudad-a'])).toEqual({ ciudad: 'ciudad-a', texto: '' })
    expect(filtroEntregasEfectivo({ ciudad: 'ciudad-a', texto: '' }, [])).toEqual({ ciudad: '', texto: '' })
  })
})
