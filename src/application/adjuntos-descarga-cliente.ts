export type TipoErrorDescarga = 'permiso' | 'no-encontrado' | 'generico'

export class ErrorDescarga extends Error {
  constructor(readonly tipo: TipoErrorDescarga) {
    super(tipo)
  }
}

export interface PuertosPeticion {
  token: () => Promise<string>
  fetch: (ruta: string, init?: RequestInit) => Promise<Response>
}

const MENSAJES: Record<TipoErrorDescarga, string> = {
  permiso: 'No tienes permiso para descargar este archivo',
  'no-encontrado': 'El archivo ya no existe',
  generico: 'No se pudo descargar el archivo. Intenta de nuevo',
}

export const mensajeDescarga = (e: unknown): string => MENSAJES[e instanceof ErrorDescarga ? e.tipo : 'generico']

async function intentar(adjuntoId: string, p: PuertosPeticion): Promise<string> {
  let r: Response
  try {
    r = await p.fetch(`/api/adjuntos/${encodeURIComponent(adjuntoId)}`, {
      headers: { Authorization: `Bearer ${await p.token()}` },
      cache: 'no-store',
    })
  } catch {
    throw new ErrorDescarga('generico')
  }
  if (r.status === 401 || r.status === 403) throw new ErrorDescarga('permiso')
  if (r.status === 404) throw new ErrorDescarga('no-encontrado')
  if (!r.ok) throw new ErrorDescarga('generico')
  const url = ((await r.json().catch(() => null)) as { url?: unknown } | null)?.url
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) throw new ErrorDescarga('generico')
  return url
}

// Un reintento solo ante fallo de red o 5xx; 401/403/404 son definitivos.
export async function pedirUrlDescarga(adjuntoId: string, p: PuertosPeticion): Promise<string> {
  try {
    return await intentar(adjuntoId, p)
  } catch (e) {
    if (e instanceof ErrorDescarga && e.tipo !== 'generico') throw e
    return intentar(adjuntoId, p)
  }
}
