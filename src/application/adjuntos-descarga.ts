import { rutaAdjunto, type Adjunto, type ModuloAdjunto } from '@/domain/adjuntos'

export class ErrorConfiguracion extends Error {}

export interface UsuarioDescarga { rol?: unknown; activo?: unknown }
export interface IdentidadToken { uid: string; email: string; emailVerificado: boolean }

export interface PuertosDescarga {
  verificarToken(token: string): Promise<IdentidadToken | null>
  leerUsuario(uid: string): Promise<UsuarioDescarga | null>
  leerAdjunto(id: string): Promise<unknown | null>
  firmarUrl(p: { ruta: string; tipo: string; disposicion: string }): Promise<string>
}

export type RespuestaDescarga =
  | { estado: 200; cuerpo: { url: string } }
  | { estado: 401 | 403 | 404 | 500 | 503; cuerpo: { error: string } }

// Mismos roles y condiciones que firestore.rules.template (puedeLeer).
const ROLES_LECTURA = ['admin', 'capturista', 'consulta']
const ID_DOCUMENTO = /^[A-Za-z0-9]{1,128}$/
const SEGMENTO = /^[A-Za-z0-9_-]{1,128}$/
const ARCHIVO_ID = /^[0-9a-f]{32}$/
const MODULOS: readonly string[] = ['accidentes', 'capacitaciones']

export function autorizarDescarga(p: {
  email: string; emailVerificado: boolean; dominioPermitido: string; usuario: UsuarioDescarga | null
}): { ok: true } | { ok: false; motivo: 'dominio' | 'rol' } {
  const dominio = p.email.includes('@') ? p.email.slice(p.email.lastIndexOf('@') + 1).toLowerCase() : ''
  if (!p.emailVerificado || !p.dominioPermitido || dominio !== p.dominioPermitido.toLowerCase()) return { ok: false, motivo: 'dominio' }
  const u = p.usuario
  if (!u || u.activo !== true || typeof u.rol !== 'string' || !ROLES_LECTURA.includes(u.rol)) return { ok: false, motivo: 'rol' }
  return { ok: true }
}

// Neutraliza comillas, barras y no ASCII en filename y envía el nombre real en filename* (RFC 5987).
export function contentDisposition(nombre: string): string {
  const ascii = nombre.replace(/[^\x20-\x7e]|["\\]/g, '_')
  const utf8 = encodeURIComponent(nombre).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

function leerDocumento(d: unknown): Adjunto | null {
  if (!d || typeof d !== 'object') return null
  const { colaborador_id, modulo, registro_id, archivo_id, nombre, tipo } = d as Record<string, unknown>
  if (typeof colaborador_id !== 'string' || !SEGMENTO.test(colaborador_id)) return null
  if (typeof registro_id !== 'string' || !SEGMENTO.test(registro_id)) return null
  if (typeof modulo !== 'string' || !MODULOS.includes(modulo)) return null
  if (typeof archivo_id !== 'string' || !ARCHIVO_ID.test(archivo_id)) return null
  if (typeof nombre !== 'string' || !nombre || typeof tipo !== 'string' || !tipo) return null
  return { id: '', colaborador_id, modulo: modulo as ModuloAdjunto, registro_id, archivo_id, nombre, tipo, tamano: 0 }
}

const NO_DISPONIBLE = 'La descarga de archivos no está disponible. Contacta al administrador.'
const fallo = (estado: 401 | 403 | 404 | 500 | 503, error: string): RespuestaDescarga => ({ estado, cuerpo: { error } })

export async function resolverDescarga(
  puertos: PuertosDescarga,
  p: { token: string | null; adjuntoId: string; dominioPermitido: string },
): Promise<RespuestaDescarga> {
  if (!p.token) return fallo(401, 'Sesión no válida')
  let identidad: IdentidadToken | null = null
  try {
    identidad = await puertos.verificarToken(p.token)
  } catch (e) {
    if (e instanceof ErrorConfiguracion) return fallo(503, NO_DISPONIBLE)
  }
  if (!identidad) return fallo(401, 'Sesión no válida')
  try {
    const usuario = await puertos.leerUsuario(identidad.uid)
    const permiso = autorizarDescarga({
      email: identidad.email, emailVerificado: identidad.emailVerificado, dominioPermitido: p.dominioPermitido, usuario,
    })
    if (!permiso.ok) return fallo(403, 'No tienes permiso para descargar este archivo')
    if (!ID_DOCUMENTO.test(p.adjuntoId)) return fallo(404, 'Archivo no encontrado')
    const doc = leerDocumento(await puertos.leerAdjunto(p.adjuntoId))
    if (!doc) return fallo(404, 'Archivo no encontrado')
    const url = await puertos.firmarUrl({ ruta: rutaAdjunto(doc), tipo: doc.tipo, disposicion: contentDisposition(doc.nombre) })
    return { estado: 200, cuerpo: { url } }
  } catch (e) {
    if (e instanceof ErrorConfiguracion) return fallo(503, NO_DISPONIBLE)
    return fallo(500, 'No se pudo preparar la descarga. Intenta de nuevo.')
  }
}
