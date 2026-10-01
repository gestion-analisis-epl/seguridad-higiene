export const CLAVE_ANIO = 'dashboard:anio'
const ANIO_MAXIMO = 2100

// Entero de 4 digitos en un rango plausible; null es "sin elegir"
export const anioGuardadoValido = (v: unknown): v is number | null =>
  v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 2000 && v <= ANIO_MAXIMO)
