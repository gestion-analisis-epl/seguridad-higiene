import { describe, expect, it } from 'vitest'
import { ErrorDescarga, mensajeDescarga, pedirUrlDescarga } from './adjuntos-descarga-cliente'

const conCodigo = (code: string) => Object.assign(new Error(code), { code })

function montar(resultados: Array<string | Error>) {
  const rutas: string[] = []
  const cola = [...resultados]
  const pedir = () => pedirUrlDescarga('adjuntos/c/accidentes/r/a', {
    obtenerUrl: async (ruta) => {
      rutas.push(ruta)
      const r = cola.shift()
      if (r === undefined) throw new Error('sin resultado')
      if (r instanceof Error) throw r
      return r
    },
    esNoEncontrado: (e) => (e as { code?: string }).code === 'storage/object-not-found',
  })
  return { pedir, rutas }
}

describe('pedirUrlDescarga', () => {
  it('pide la ruta y devuelve la url', async () => {
    const { pedir, rutas } = montar(['https://f.test/x'])
    expect(await pedir()).toBe('https://f.test/x')
    expect(rutas).toEqual(['adjuntos/c/accidentes/r/a'])
  })

  it('reintenta una vez ante fallo de red', async () => {
    const m = montar([new Error('red'), 'https://f.test/u'])
    expect(await m.pedir()).toBe('https://f.test/u')
    expect(m.rutas).toHaveLength(2)
  })

  it('falla genérico tras dos fallos', async () => {
    const m = montar([new Error('a'), new Error('b')])
    await expect(m.pedir()).rejects.toMatchObject({ tipo: 'generico' })
    expect(m.rutas).toHaveLength(2)
  })

  it('no reintenta permiso ni no encontrado y los clasifica', async () => {
    for (const [code, tipo] of [
      ['storage/unauthorized', 'permiso'], ['storage/unauthenticated', 'permiso'], ['storage/object-not-found', 'no-encontrado'],
    ] as const) {
      const m = montar([conCodigo(code), 'https://f.test/u'])
      await expect(m.pedir()).rejects.toMatchObject({ tipo })
      expect(m.rutas).toHaveLength(1)
    }
  })

  it('rechaza una url que no sea https', async () => {
    await expect(montar(['javascript:alert(1)', 'javascript:alert(1)']).pedir()).rejects.toBeInstanceOf(ErrorDescarga)
  })
})

describe('mensajeDescarga', () => {
  it('da mensajes amigables por tipo', () => {
    expect(mensajeDescarga(new ErrorDescarga('permiso'))).toBe('No tienes permiso para descargar este archivo')
    expect(mensajeDescarga(new ErrorDescarga('no-encontrado'))).toBe('El archivo ya no existe')
    expect(mensajeDescarga(new ErrorDescarga('generico'))).toBe('No se pudo descargar el archivo. Intenta de nuevo')
    expect(mensajeDescarga(new Error('x'))).toBe('No se pudo descargar el archivo. Intenta de nuevo')
  })
})
