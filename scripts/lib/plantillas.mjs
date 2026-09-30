const VAR_BASE = 'NEXT_PUBLIC_FIRESTORE_DATABASE'
const VAR_DOMINIO = 'NEXT_PUBLIC_DOMINIO_PERMITIDO'
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
 * Sustituye {{BASE_DATOS}} y {{DOMINIO_REGEX}}; los valores se leen con los nombres de variable de la app.
 * @param {string} texto
 * @param {Record<string, string | undefined>} env
 */
export function renderizarPlantilla(texto, env) {
  const base = env[VAR_BASE]?.trim() ?? ''
  const dominio = env[VAR_DOMINIO]?.trim() ?? ''
  const invalidas = variablesInvalidas(base, dominio)
  if (invalidas.length) throw new Error(`Configuración faltante o inválida: ${invalidas.join(', ')}`)
  const valores = { BASE_DATOS: JSON.stringify(base).slice(1, -1), DOMINIO_REGEX: regexDeDominio(dominio) }
  const desconocidos = [...new Set((texto.match(/\{\{[^{}]*\}\}/g) ?? []).filter((m) => !(m === '{{BASE_DATOS}}' || m === '{{DOMINIO_REGEX}}')))]
  if (desconocidos.length) throw new Error(`Marcadores desconocidos en la plantilla: ${desconocidos.join(', ')}`)
  const salida = texto.replace(/\{\{(BASE_DATOS|DOMINIO_REGEX)\}\}/g, (_, nombre) => valores[nombre])
  if (salida.includes('{{')) throw new Error('La plantilla renderizada conserva marcadores sin resolver')
  return salida
}
