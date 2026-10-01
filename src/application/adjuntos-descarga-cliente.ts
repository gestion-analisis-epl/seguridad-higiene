export type TipoErrorDescarga = 'permiso' | 'no-encontrado' | 'generico'

export class ErrorDescarga extends Error {
  constructor(readonly tipo: TipoErrorDescarga) {
    super(tipo)
  }
}

export interface PuertosPeticion {
  obtenerUrl: (ruta: string) => Promise<string>
  esNoEncontrado: (e: unknown) => boolean
}

const MENSAJES: Record<TipoErrorDescarga, string> = {
  permiso: 'No tienes permiso para descargar este archivo',
  'no-encontrado': 'El archivo ya no existe',
  generico: 'No se pudo descargar el archivo. Intenta de nuevo',
}

export const mensajeDescarga = (e: unknown): string => MENSAJES[e instanceof ErrorDescarga ? e.tipo : 'generico']

const CODIGOS_PERMISO = ['storage/unauthorized', 'storage/unauthenticated']

function clasificar(e: unknown, p: PuertosPeticion): ErrorDescarga {
  if (p.esNoEncontrado(e)) return new ErrorDescarga('no-encontrado')
  const code = (e as { code?: unknown } | null)?.code
  return new ErrorDescarga(typeof code === 'string' && CODIGOS_PERMISO.includes(code) ? 'permiso' : 'generico')
}

async function intentar(ruta: string, p: PuertosPeticion): Promise<string> {
  let url: string
  try {
    url = await p.obtenerUrl(ruta)
  } catch (e) {
    throw clasificar(e, p)
  }
  if (!/^https:\/\//.test(url)) throw new ErrorDescarga('generico')
  return url
}

// Un reintento solo ante fallo genérico; permiso y no encontrado son definitivos.
export async function pedirUrlDescarga(ruta: string, p: PuertosPeticion): Promise<string> {
  try {
    return await intentar(ruta, p)
  } catch (e) {
    if (e instanceof ErrorDescarga && e.tipo !== 'generico') throw e
    return intentar(ruta, p)
  }
}
