// Se guardan las ciudades ocultas: las nuevas quedan incluidas y las ausentes del catálogo se ignoran al mostrar y se conservan al guardar.
export const CLAVE_CIUDADES_OCULTAS = 'dashboard:ciudades-ocultas'

export const ocultasValidas = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export const seleccionDesdeOcultas = (todas: string[], ocultas: string[]): string[] =>
  todas.filter((c) => !ocultas.includes(c))

// Las previas fuera del catálogo se conservan: aún puede no haber cargado o la ciudad volver
export function ocultasDesdeSeleccion(todas: string[], seleccion: string[], previas: string[] = []): string[] {
  if (todas.length === 0) return previas
  return [...todas.filter((c) => !seleccion.includes(c)), ...previas.filter((c) => !todas.includes(c))]
}
