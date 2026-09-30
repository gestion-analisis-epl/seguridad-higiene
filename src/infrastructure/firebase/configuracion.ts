export interface Configuracion { baseDatos: string; dominioPermitido: string }

const BASE = 'NEXT_PUBLIC_FIRESTORE_DATABASE'
const DOMINIO = 'NEXT_PUBLIC_DOMINIO_PERMITIDO'
const FORMATO_DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

export function leerConfiguracion(env: Record<string, string | undefined>): Configuracion {
  const baseDatos = env[BASE]?.trim() ?? ''
  const dominioPermitido = env[DOMINIO]?.trim() ?? ''
  const invalidas = [
    ...(baseDatos && baseDatos.toLowerCase() !== '(default)' ? [] : [BASE]),
    ...(FORMATO_DOMINIO.test(dominioPermitido) ? [] : [DOMINIO]),
  ]
  if (invalidas.length) throw new Error(`Configuración faltante o inválida: ${invalidas.join(', ')}`)
  return { baseDatos, dominioPermitido }
}
