const VAR_BASE = 'NEXT_PUBLIC_FIRESTORE_DATABASE'
const VAR_DOMINIO = 'NEXT_PUBLIC_DOMINIO_PERMITIDO'
const VAR_BUCKET = 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
const FORMATO_BUCKET = /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/
const VAR_ORIGEN = 'ORIGEN_APP'
const FORMATO_ORIGEN = /^(https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?|http:\/\/localhost(:\d+)?)$/
const FORMATO_DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

/** @param {string} dominio */
export const regexDeDominio = (dominio) => dominio.replace(/\./g, '[.]')

/** Mismas reglas que leerConfiguracion de la app; devuelve los nombres de variables inválidas. */
function variablesInvalidas(base, dominio) {
  return [
    ...(base && base.toLowerCase() !== '(default)' && !base.includes('{{') ? [] : [VAR_BASE]),
    ...(FORMATO_DOMINIO.test(dominio) ? [] : [VAR_DOMINIO]),
  ]
}

/**
 * Sustituye {{BASE_DATOS}}, {{DOMINIO_REGEX}} y {{ORIGEN_APP}} y {{BUCKET}} (estas dos solo se exigen si la plantilla las usa); los valores se leen con los nombres de variable de la app.
 * @param {string} texto
 * @param {Record<string, string | undefined>} env
 */
export function renderizarPlantilla(texto, env) {
  const base = env[VAR_BASE]?.trim() ?? ''
  const dominio = env[VAR_DOMINIO]?.trim() ?? ''
  const invalidas = variablesInvalidas(base, dominio)
  if (invalidas.length) throw new Error(`Configuración faltante o inválida: ${invalidas.join(', ')}`)
  const origen = env[VAR_ORIGEN]?.trim() ?? ''
  if (texto.includes('{{ORIGEN_APP}}') && !FORMATO_ORIGEN.test(origen)) throw new Error(`Configuración faltante o inválida: ${VAR_ORIGEN}`)
  const bucket = env[VAR_BUCKET]?.trim() ?? ''
  if (texto.includes('{{BUCKET}}') && !FORMATO_BUCKET.test(bucket)) throw new Error(`Configuración faltante o inválida: ${VAR_BUCKET}`)
  const valores = { BASE_DATOS: JSON.stringify(base).slice(1, -1), DOMINIO_REGEX: regexDeDominio(dominio), ORIGEN_APP: origen, BUCKET: bucket }
  const desconocidos = [...new Set((texto.match(/\{\{[^{}]*\}\}/g) ?? []).filter((m) => !['{{BASE_DATOS}}', '{{DOMINIO_REGEX}}', '{{ORIGEN_APP}}', '{{BUCKET}}'].includes(m)))]
  if (desconocidos.length) throw new Error(`Marcadores desconocidos en la plantilla: ${desconocidos.join(', ')}`)
  const salida = texto.replace(/\{\{(BASE_DATOS|DOMINIO_REGEX|ORIGEN_APP|BUCKET)\}\}/g, (_, nombre) => valores[nombre])
  if (salida.includes('{{')) throw new Error('La plantilla renderizada conserva marcadores sin resolver')
  return salida
}
