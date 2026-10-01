import { describe, expect, it } from 'vitest'
import type { FilaComparativo } from '@/application/dashboard'
import { atributosNivel, columnasComparativo, columnasMensual } from './columnas-analitico'
import type { FilaMensual } from './mensual'

const etiqueta = (v: string) => (v === 'ciudad-a' ? 'Ciudad A' : v)

describe('columnas analíticas', () => {
  const fila: FilaComparativo = {
    ciudad: 'ciudad-a', nivel: 'meta',
    indices: { hht: 2400, eventos: 1, dias: 3, indiceFrecuencia: 4.5, indiceSeveridad: 1.2, ili: 0.0054 },
  }
  it('comparativo: ciudad por etiqueta, ILI numérico y nivel con texto', () => {
    const v = (id: string) => columnasComparativo(etiqueta).find((c) => c.id === id)!.valor(fila)
    expect(v('ciudad')).toBe('Ciudad A')
    expect(v('ili')).toBe(0.0054)
    expect(v('nivel')).toBe('Meta')
    expect(atributosNivel(fila)).toEqual({ 'data-nivel': 'meta' })
  })
  it('mensual: conserva el orden de columnas y expone el mes como texto', () => {
    expect(columnasMensual.map((c) => c.id)).toEqual(['mes', 'poblacion', 'hht', 'eventos', 'dias', 'trayecto', 'if', 'is', 'ili', 'nivel'])
    const f = { mes: 'Ene', ili: null, nivel: 'sin_dato' } as unknown as FilaMensual
    expect(columnasMensual[0].valor(f)).toBe('Ene')
    expect(columnasMensual[8].valor(f)).toBeNull()
  })
})
