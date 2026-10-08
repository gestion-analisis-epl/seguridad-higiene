import { esCorreoPermitido, puede, type Accion, type UsuarioDoc } from './permisos'

export interface Rechazo { estado: 401 | 403; mensaje: string }
export interface Claims { email?: string; email_verified?: boolean }

export function decidirAcceso(
  claims: Claims | null, usuario: UsuarioDoc | null, dominio: string, accion: Accion,
): Rechazo | null {
  if (!claims) return { estado: 401, mensaje: 'Sesión inválida' }
  if (claims.email_verified !== true || !esCorreoPermitido(claims.email, dominio)) {
    return { estado: 403, mensaje: 'Cuenta no permitida' }
  }
  return puede(usuario, accion) ? null : { estado: 403, mensaje: 'Sin permiso para esta acción' }
}
