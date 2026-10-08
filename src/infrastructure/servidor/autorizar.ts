import { decidirAcceso } from '@/domain/acceso-api'
import type { Accion, UsuarioDoc } from '@/domain/permisos'
import { adminAuth, adminDb, configuracionServidor } from './admin'

export interface Llamante { uid: string }

// Devuelve el llamante autorizado o la respuesta de rechazo lista para regresar
export async function autorizar(req: Request, accion: Accion): Promise<Llamante | Response> {
  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  const claims = token ? await adminAuth().verifyIdToken(token).catch(() => null) : null
  const usuario = claims
    ? ((await adminDb().doc(`usuarios/${claims.uid}`).get()).data() as UsuarioDoc | undefined) ?? null
    : null
  const rechazo = decidirAcceso(claims, usuario, configuracionServidor().dominioPermitido, accion)
  return rechazo ? Response.json({ error: rechazo.mensaje }, { status: rechazo.estado }) : { uid: claims!.uid }
}

export async function leerCuerpo(req: Request): Promise<Record<string, unknown>> {
  const cuerpo: unknown = await req.json().catch(() => null)
  return cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {}
}
