import { describe, expect, it } from 'vitest'
import { posicionarPanel } from './posicion'

const vista = { ancho: 360, alto: 640 }
const base = { ancho: 288, altoMax: 320, margen: 8, vista }

describe('posicionarPanel', () => {
  it('abre debajo alineado a la izquierda del ancla', () => {
    const p = posicionarPanel({ ...base, ancla: { left: 20, right: 120, top: 100, bottom: 140 } })
    expect(p).toMatchObject({ left: 20, ancho: 288, arriba: false, top: 144, maxHeight: 320 })
  })

  it('no se sale por la derecha en 360 px', () => {
    const p = posicionarPanel({ ...base, ancla: { left: 300, right: 350, top: 100, bottom: 140 } })
    expect(p.left + p.ancho).toBeLessThanOrEqual(360 - 8)
    expect(p.left).toBeGreaterThanOrEqual(8)
  })

  it('reduce el ancho si la pantalla es mas angosta que el panel', () => {
    const p = posicionarPanel({ ...base, vista: { ancho: 300, alto: 640 }, ancla: { left: 0, right: 40, top: 10, bottom: 50 } })
    expect(p.ancho).toBe(284)
    expect(p.left).toBe(8)
  })

  it('abre arriba si abajo no hay espacio y arriba si', () => {
    const p = posicionarPanel({ ...base, ancla: { left: 20, right: 120, top: 500, bottom: 540 } })
    expect(p.arriba).toBe(true)
    expect(p.bottom).toBe(640 - 500 + 4)
    expect(p.maxHeight).toBe(320)
  })

  it('limita la altura al espacio disponible', () => {
    const p = posicionarPanel({ ...base, vista: { ancho: 360, alto: 400 }, ancla: { left: 20, right: 120, top: 100, bottom: 140 } })
    expect(p.maxHeight).toBe(400 - 140 - 8 - 4)
  })
})
