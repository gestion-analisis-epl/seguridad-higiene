import { describe, expect, it } from 'vitest'
import { crearSubidor, type ItemSubida, type PuertoAlmacenamiento, type PuertoMetadatos } from './adjuntos-subida'
import { MAX_BYTES } from '@/domain/adjuntos'

const destino = { colaborador_id: 'c1', modulo: 'accidentes' as const, registro_id: 'r1' }
const pdf = (nombre = 'a.pdf', tamano = 10) => {
  const f = new File(['x'], nombre, { type: 'application/pdf' })
  Object.defineProperty(f, 'size', { value: tamano })
  return f
}
const tick = () => new Promise((r) => setTimeout(r, 0))

interface Subida { ruta: string; archivo: File; alProgreso: (f: number) => void; senal: AbortSignal; ok: () => void; falla: (e?: Error) => void }

function montar(opciones: { existentes?: number; crearFalla?: boolean } = {}) {
  const subidas: Subida[] = []
  const borradas: string[] = []
  const creados: Omit<import('@/domain/adjuntos').Adjunto, 'id'>[] = []
  const almacenamiento: PuertoAlmacenamiento = {
    subir: (ruta, archivo, alProgreso, senal) =>
      new Promise<void>((ok, falla) => {
        subidas.push({ ruta, archivo, alProgreso, senal, ok, falla: (e) => falla(e ?? new Error('fallo')) })
        senal.addEventListener('abort', () => falla(new Error('abortado')))
      }),
    borrar: async (ruta) => { borradas.push(ruta) },
  }
  const metadatos: PuertoMetadatos = {
    crear: async (a) => {
      if (opciones.crearFalla) throw new Error('reglas')
      creados.push(a)
      return `id${creados.length}`
    },
    borrar: async () => {},
  }
  let items: ItemSubida[] = []
  const subidor = crearSubidor({
    almacenamiento, metadatos, destino,
    existentes: () => opciones.existentes ?? 0,
    alCambiar: (i) => { items = i },
  })
  return { subidor, subidas, borradas, creados, items: () => items }
}

describe('crearSubidor', () => {
  it('valida antes de subir y marca error sin llamar al puerto', () => {
    const m = montar()
    m.subidor.agregar([new File(['x'], 'a.exe', { type: 'application/pdf' }), pdf('grande.pdf', MAX_BYTES + 1)])
    expect(m.subidas).toHaveLength(0)
    expect(m.items().map((i) => i.estado)).toEqual(['error', 'error'])
    expect(m.items()[0].motivo).toBeTruthy()
  })

  it('nunca más de 3 subidas simultáneas', async () => {
    const m = montar()
    m.subidor.agregar(Array.from({ length: 5 }, (_, i) => pdf(`a${i}.pdf`)))
    await tick()
    expect(m.subidas).toHaveLength(3)
    m.subidas[0].ok()
    await tick()
    expect(m.subidas).toHaveLength(4)
    expect(m.items().filter((i) => i.estado === 'subiendo')).toHaveLength(3)
  })

  it('un fallo no detiene a los demás y reintentar repite solo ese archivo', async () => {
    const m = montar()
    m.subidor.agregar([pdf('a.pdf'), pdf('b.pdf')])
    await tick()
    m.subidas[0].falla()
    m.subidas[1].ok()
    await tick()
    expect(m.items().map((i) => i.estado)).toEqual(['error', 'listo'])
    expect(m.items()[0].motivo).toBe('No se pudo subir el archivo')
    m.subidor.reintentar(m.items()[0].clave)
    await tick()
    expect(m.subidas).toHaveLength(3)
    expect(m.subidas[2].archivo.name).toBe('a.pdf')
    m.subidas[2].ok()
    await tick()
    expect(m.items().map((i) => i.estado)).toEqual(['listo', 'listo'])
    expect(m.creados).toHaveLength(2)
  })

  it('propaga el progreso y crea metadatos al terminar', async () => {
    const m = montar()
    m.subidor.agregar([pdf()])
    await tick()
    m.subidas[0].alProgreso(0.5)
    expect(m.items()[0].progreso).toBe(0.5)
    m.subidas[0].ok()
    await tick()
    expect(m.items()[0]).toMatchObject({ estado: 'listo', progreso: 1 })
    expect(m.creados[0]).toMatchObject({ ...destino, nombre: 'a.pdf', tipo: 'application/pdf', tamano: 10 })
    expect(m.creados[0].archivo_id).toMatch(/^[0-9a-f]{32}$/)
    expect(m.subidas[0].ruta).toBe(`adjuntos/c1/accidentes/r1/${m.creados[0].archivo_id}`)
  })

  it('si falla crear metadatos borra el archivo y marca error', async () => {
    const m = montar({ crearFalla: true })
    m.subidor.agregar([pdf()])
    await tick()
    m.subidas[0].ok()
    await tick()
    expect(m.borradas).toEqual([m.subidas[0].ruta])
    expect(m.items()[0].estado).toBe('error')
  })

  it('cancelar aborta la señal y no crea metadatos', async () => {
    const m = montar()
    m.subidor.agregar([pdf()])
    await tick()
    m.subidor.cancelar(m.items()[0].clave)
    await tick()
    expect(m.subidas[0].senal.aborted).toBe(true)
    expect(m.items()[0].estado).toBe('cancelado')
    expect(m.creados).toHaveLength(0)
  })

  it('cancelarTodo cancela pendientes y en curso', async () => {
    const m = montar()
    m.subidor.agregar(Array.from({ length: 5 }, (_, i) => pdf(`a${i}.pdf`)))
    await tick()
    m.subidor.cancelarTodo()
    await tick()
    expect(m.items().every((i) => i.estado === 'cancelado')).toBe(true)
    expect(m.subidas).toHaveLength(3)
    expect(m.subidas.every((s) => s.senal.aborted)).toBe(true)
    expect(m.creados).toHaveLength(0)
  })

  it('el tope por registro cuenta existentes, listos y en curso', async () => {
    const m = montar({ existentes: 8 })
    m.subidor.agregar([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')])
    await tick()
    expect(m.items().map((i) => i.estado)).toEqual(['subiendo', 'subiendo', 'error'])
    m.subidas[0].ok()
    await tick()
    m.subidor.agregar([pdf('d.pdf')])
    expect(m.items()[3].estado).toBe('error')
  })
})
