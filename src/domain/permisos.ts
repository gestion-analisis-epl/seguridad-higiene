export type Rol = 'admin' | 'capturista' | 'consulta' | 'sin_rol'

export interface UsuarioDoc { email: string; rol: Rol; activo: boolean }

export function esCorreoPermitido(email: string | null | undefined, dominio: string): boolean {
  const d = dominio.trim().toLowerCase()
  return !!email && !!d && email.toLowerCase().endsWith(`@${d}`)
}

export type Accion = 'leer' | 'capturar' | 'administrar'

export function puede(usuario: UsuarioDoc | null, accion: Accion): boolean {
  if (!usuario || !usuario.activo) return false
  switch (usuario.rol) {
    case 'admin': return true
    case 'capturista': return accion !== 'administrar'
    case 'consulta': return accion === 'leer'
    default: return false
  }
}

export type EstadoAcceso =
  | 'sin_sesion' | 'dominio_no_permitido' | 'sin_registro' | 'pendiente' | 'inactivo' | 'autorizado'

export function resolverAcceso(email: string | null, usuario: UsuarioDoc | null, dominio: string): EstadoAcceso {
  if (!email) return 'sin_sesion'
  if (!esCorreoPermitido(email, dominio)) return 'dominio_no_permitido'
  if (!usuario) return 'sin_registro'
  if (usuario.rol === 'sin_rol') return 'pendiente'
  if (!usuario.activo) return 'inactivo'
  return 'autorizado'
}
