// Se guardan las ciudades ocultas: las nuevas quedan incluidas y las retiradas se ignoran.
export const CLAVE_CIUDADES_OCULTAS = 'dashboard:ciudades-ocultas'

export const ocultasValidas = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export const seleccionDesdeOcultas = (todas: string[], ocultas: string[]): string[] =>
  todas.filter((c) => !ocultas.includes(c))

export const ocultasDesdeSeleccion = (todas: string[], seleccion: string[]): string[] =>
  todas.filter((c) => !seleccion.includes(c))
