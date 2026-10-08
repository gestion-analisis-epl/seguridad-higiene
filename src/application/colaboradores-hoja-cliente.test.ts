import { describe, expect, it, vi } from 'vitest'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { crearClienteHoja, type RespuestaHoja } from './colaboradores-hoja-cliente'

const fila = { id_interno: '1', nombre: 'ANA' } as ColaboradorHoja
const respuesta = (n = 1): RespuestaHoja => ({ colaboradores: [{ ...fila, id_interno: String(n) }], cargadoEn: 0, desactualizado: false })

function almacenFalso() {
  const datos = new Map<string, string>()
  return { datos, getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v), removeItem: (k: string) => void datos.delete(k) }
}

function preparar(pedir = vi.fn(async () => respuesta()), almacen: ReturnType<typeof almacenFalso> | null = almacenFalso()) {
  let t = 0
  const cliente = crearClienteHoja({ pedir, almacen, ahora: () => t }, { ttlMs: 1000, minForzarMs: 100 })
  return { cliente, pedir, almacen, avanzar: (ms: number) => { t += ms } }
}

describe('crearClienteHoja', () => {
  it('pide una sola vez aunque haya varias lecturas simultáneas', async () => {
    const { cliente, pedir } = preparar()
    await Promise.all([cliente.obtener(), cliente.obtener()])
    expect(pedir).toHaveBeenCalledTimes(1)
  })

  it('no vuelve a pedir dentro del TTL y recarga después', async () => {
    const { cliente, pedir, avanzar } = preparar()
    await cliente.obtener()
    avanzar(999)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(1)
    avanzar(2)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(2)
  })

  it('reutiliza lo guardado en la sesión al crear un cliente nuevo', async () => {
    const almacen = almacenFalso()
    await preparar(undefined, almacen).cliente.obtener()
    const otro = preparar(vi.fn(async () => respuesta(2)), almacen)
    expect((await otro.cliente.obtener()).colaboradores[0].id_interno).toBe('1')
    expect(otro.pedir).not.toHaveBeenCalled()
  })

  it('ignora un recargar forzado dentro del mínimo', async () => {
    const { cliente, pedir, avanzar } = preparar()
    await cliente.obtener()
    avanzar(50)
    await cliente.obtener(true)
    expect(pedir).toHaveBeenCalledTimes(1)
    avanzar(60)
    await cliente.obtener(true)
    expect(pedir).toHaveBeenCalledTimes(2)
  })

  it('con error devuelve la copia previa como desactualizada', async () => {
    const pedir = vi.fn().mockResolvedValueOnce(respuesta()).mockRejectedValueOnce(new Error('x'))
    const { cliente, avanzar } = preparar(pedir)
    await cliente.obtener()
    avanzar(2000)
    expect(await cliente.obtener()).toMatchObject({ desactualizado: true })
  })

  it('con error y sin copia propaga el error', async () => {
    const { cliente } = preparar(vi.fn().mockRejectedValue(new Error('sin red')))
    await expect(cliente.obtener()).rejects.toThrow('sin red')
  })

  it('funciona sin almacenamiento y descarta datos guardados corruptos', async () => {
    await expect(preparar(undefined, null).cliente.obtener()).resolves.toBeTruthy()
    const almacen = almacenFalso()
    almacen.datos.set('epl.sh.colaboradores-hoja.v1', '{no es json')
    await expect(preparar(undefined, almacen).cliente.obtener()).resolves.toBeTruthy()
  })

  it('vaciar borra la copia de la sesión', async () => {
    const { cliente, almacen, pedir } = preparar()
    await cliente.obtener()
    cliente.vaciar()
    expect(almacen!.datos.size).toBe(0)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(2)
  })
})
