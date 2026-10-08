import { describe, expect, it, vi } from 'vitest'
import { crearCacheConRespaldo } from './cache-con-respaldo'

function preparar(cargar = vi.fn(async () => 'dato')) {
  let t = 0
  const leer = crearCacheConRespaldo(cargar, { ttlMs: 1000, minForzarMs: 100, ahora: () => t })
  return { leer, cargar, avanzar: (ms: number) => { t += ms } }
}

describe('crearCacheConRespaldo', () => {
  it('sirve de la caché mientras no venza el TTL', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(999)
    expect((await leer()).desactualizado).toBe(false)
    expect(cargar).toHaveBeenCalledTimes(1)
  })

  it('recarga al vencer el TTL', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(1000)
    await leer()
    expect(cargar).toHaveBeenCalledTimes(2)
  })

  it('comparte una sola carga entre llamadas simultáneas', async () => {
    const { leer, cargar } = preparar()
    await Promise.all([leer(), leer(), leer()])
    expect(cargar).toHaveBeenCalledTimes(1)
  })

  it('sirve la última copia marcada como desactualizada si la recarga falla', async () => {
    const cargar = vi.fn().mockResolvedValueOnce('uno').mockRejectedValueOnce(new Error('x'))
    const { leer, avanzar } = preparar(cargar)
    await leer()
    avanzar(2000)
    expect(await leer()).toMatchObject({ dato: 'uno', desactualizado: true })
  })

  it('propaga el error si no hay copia previa', async () => {
    const { leer } = preparar(vi.fn().mockRejectedValue(new Error('x')))
    await expect(leer()).rejects.toThrow('x')
  })

  it('ignora una recarga forzada dentro del mínimo y la acepta después', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(50)
    await leer(true)
    expect(cargar).toHaveBeenCalledTimes(1)
    avanzar(60)
    await leer(true)
    expect(cargar).toHaveBeenCalledTimes(2)
  })
})
