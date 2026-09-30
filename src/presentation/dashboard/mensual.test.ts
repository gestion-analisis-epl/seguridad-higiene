import { describe, expect, it } from 'vitest'
import { serieMensual } from '@/application/dashboard'
import { CONFIG_INDICADORES_INICIAL as cfg } from '@/domain/indicadores'
import { filasMensuales } from './mensual'

describe('filasMensuales', () => {
  const serie = serieMensual(
    [{ ciudad: 'ciudad-a', periodo: '2026-06', tipo: 'laboral', dias_incapacidad: 3 }],
    [{ ciudad: 'ciudad-a', periodo: '2026-06', poblacion: 10 }],
    cfg, 2026,
  )

  it('arma una fila por mes con su nombre y el nivel del ILI', () => {
    const filas = filasMensuales(serie, cfg)
    expect(filas).toHaveLength(12)
    expect(filas[5]).toMatchObject({ mes: 'Jun', periodo: '2026-06', poblacion: 10, eventos: 1, laboral: 1, trayecto: 0, dias: 3 })
    expect(filas[5].nivel).not.toBe('sin_dato')
  })

  it('un mes sin población queda sin dato', () => {
    expect(filasMensuales(serie, cfg)[0]).toMatchObject({ mes: 'Ene', ili: null, nivel: 'sin_dato' })
  })
})
