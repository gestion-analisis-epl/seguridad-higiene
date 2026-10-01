import { describe, expect, it } from 'vitest'
import { ErrorDescarga, mensajeDescarga, pedirUrlDescarga } from './adjuntos-descarga-cliente'

const json = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado })

function montar(respuestas: Array<Response | Error>) {
  const llamadas: Array<{ ruta: string; auth: string | null }> = []
  const cola = [...respuestas]
  const pedir = () => pedirUrlDescarga('abc', {
    token: async () => 'tok',
    fetch: async (ruta, init) => {
      llamadas.push({ ruta, auth: new Headers(init?.headers).get('Authorization') })
      const r = cola.shift()
      if (!r) throw new Error('sin respuesta')
      if (r instanceof Error) throw r
      return r
    },
  })
  return { pedir, llamadas }
}

describe('pedirUrlDescarga', () => {
  it('pide al mismo origen con el token y devuelve la url', async () => {
    const { pedir, llamadas } = montar([json(200, { url: 'https://f.test/x' })])
    expect(await pedir()).toBe('https://f.test/x')
    expect(llamadas).toEqual([{ ruta: '/api/adjuntos/abc', auth: 'Bearer tok' }])
  })

  it('reintenta una vez ante error de red o 5xx', async () => {
    const red = montar([new Error('red'), json(200, { url: 'https://f.test/u' })])
    expect(await red.pedir()).toBe('https://f.test/u')
    const s5 = montar([json(503, {}), json(200, { url: 'https://f.test/u' })])
    expect(await s5.pedir()).toBe('https://f.test/u')
    expect(s5.llamadas).toHaveLength(2)
  })

  it('falla genérico tras dos fallos', async () => {
    const m = montar([json(500, {}), json(500, {})])
    await expect(m.pedir()).rejects.toMatchObject({ tipo: 'generico' })
    expect(m.llamadas).toHaveLength(2)
  })

  it('no reintenta 401, 403 ni 404 y los clasifica', async () => {
    for (const [estado, tipo] of [[401, 'permiso'], [403, 'permiso'], [404, 'no-encontrado']] as const) {
      const m = montar([json(estado, {}), json(200, { url: 'https://f.test/u' })])
      await expect(m.pedir()).rejects.toMatchObject({ tipo })
      expect(m.llamadas).toHaveLength(1)
    }
  })

  it('rechaza una respuesta sin url válida', async () => {
    await expect(montar([json(200, {}), json(200, {})]).pedir()).rejects.toBeInstanceOf(ErrorDescarga)
    await expect(montar([json(200, { url: 'javascript:alert(1)' }), json(200, {})]).pedir()).rejects.toBeInstanceOf(ErrorDescarga)
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
