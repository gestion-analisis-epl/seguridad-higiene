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

const BUCKET = 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
const FORMATO_BUCKET = /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/

// Perezosa: solo se llama al usar Storage, para que builds y pruebas sin bucket no fallen.
export function leerBucket(env: Record<string, string | undefined>): string {
  const bucket = env[BUCKET]?.trim() ?? ''
  if (!FORMATO_BUCKET.test(bucket)) throw new Error(`Falta ${BUCKET}`)
  return bucket
}
