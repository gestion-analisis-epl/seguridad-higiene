import { auth } from '@/infrastructure/firebase/cliente'

export async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const respuesta = await fetch(ruta, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(typeof cuerpo.error === 'string' ? cuerpo.error : 'La solicitud falló')
  return cuerpo as T
}

export const enviar = (cuerpo: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(cuerpo) })
