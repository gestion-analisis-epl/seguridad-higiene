import { describe, expect, it } from 'vitest'
import {
  CONFIG_INDICADORES_INICIAL as cfg, calcularAnual, calcularHht, calcularMes,
  clasificarIli, configDesdeDoc,
} from './indicadores'

// Serie ficticia, simple de verificar a mano
const poblacion = [5, 5, 5, 5, 5, 5, 10, 10, 0, 0, 0, 0]
const eventos = [0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0]
const dias = [0, 0, 4, 0, 0, 0, 0, 6, 0, 0, 0, 0]
const meses = poblacion.map((p, i) => ({ poblacion: p, eventos: eventos[i], dias: dias[i] }))

describe('indicadores', () => {
  it('calcula HHT', () => {
    expect(calcularHht(5, cfg)).toBe(1200)
  })
  it('calcula el acumulado anual de la serie', () => {
    const r = calcularAnual(meses, cfg)
    expect(r.hht).toBe(12000)
    expect(r.indiceFrecuencia).toBeCloseTo(60, 6)
    expect(r.indiceSeveridad).toBeCloseTo(200, 6)
    expect(r.ili).toBeCloseTo(12, 6)
  })
  it('calcula un mes', () => {
    const r = calcularMes({ poblacion: 10, eventos: 1, dias: 3 }, cfg)
    expect(r.indiceFrecuencia).toBeCloseTo(8.333333333, 6)
    expect(r.indiceSeveridad).toBeCloseTo(25, 6)
    expect(r.ili).toBeCloseTo(0.2083333333, 6)
  })
  it('devuelve null sin HHT', () => {
    const r = calcularMes({ poblacion: 0, eventos: 0, dias: 0 }, cfg)
    expect(r.indiceFrecuencia).toBeNull()
    expect(r.ili).toBeNull()
  })
  it('consolida sumando antes de calcular', () => {
    const r = calcularAnual([
      { poblacion: 10, eventos: 1, dias: 5 },
      { poblacion: 30, eventos: 0, dias: 0 },
    ], cfg)
    expect(r.indiceFrecuencia).toBeCloseTo(25, 6)
    expect(r.indiceSeveridad).toBeCloseTo(125, 6)
    expect(r.ili).toBeCloseTo(3.125, 6)
  })
})

describe('semáforo del ILI', () => {
  it.each([
    [0.3, 'supera'], [0.4, 'supera'], [0.5, 'meta'], [0.7, 'meta'],
    [0.9, 'minimo'], [1, 'minimo'], [1.01, 'fuera_de_meta'], [null, 'sin_dato'],
  ])('%s -> %s', (valor, nivel) => {
    expect(clasificarIli(valor as number | null, cfg)).toBe(nivel)
  })
})

describe('configDesdeDoc', () => {
  it('usa los valores iniciales si no hay documento', () => {
    expect(configDesdeDoc(null)).toEqual(cfg)
  })
  it('lee campos snake_case y completa los que faltan', () => {
    const r = configDesdeDoc({ horas_por_persona_mes: 200, k_anual: 100 })
    expect(r.horasPorPersonaMes).toBe(200)
    expect(r.kAnual).toBe(100)
    expect(r.kMensual).toBe(20000)
  })
})
