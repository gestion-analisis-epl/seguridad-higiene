import { crearClienteHoja, type RespuestaHoja } from '@/application/colaboradores-hoja-cliente'
import type { ColaboradorHoja, FilaEnlace } from '@/domain/colaboradores-hoja'
import { auth } from '@/infrastructure/firebase/cliente'

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const respuesta = await fetch(ruta, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(typeof cuerpo.error === 'string' ? cuerpo.error : 'La solicitud falló')
  return cuerpo as T
}

const enviar = (cuerpo: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(cuerpo) })

function almacenSesion() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null }
}

export const clienteHoja = crearClienteHoja({
  pedir: (forzar) => llamar<RespuestaHoja>(`/api/colaboradores-hoja${forzar ? '?forzar=1' : ''}`),
  almacen: almacenSesion(),
})

export const asegurarColaborador = (idInterno: string) =>
  llamar<{ uid: string; creado: boolean }>('/api/colaboradores/asegurar', enviar({ id_interno: idInterno }))

export const cargarEnlace = (forzar = false) =>
  llamar<{ filas: FilaEnlace[]; hoja: ColaboradorHoja[] }>(`/api/colaboradores/enlace${forzar ? '?forzar=1' : ''}`)

export const vincular = (uid: string, idInterno: string, sobrescribir = false) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'vincular', uid, id_interno: idInterno, sobrescribir }))

export const desvincular = (uid: string) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'desvincular', uid }))
