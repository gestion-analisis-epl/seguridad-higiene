export interface Almacen {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
}

// Subir la version invalida lo guardado con formatos anteriores
export const PREFIJO_CLAVE = 'sh:v1:'

export const claveAlmacen = (clave: string) => `${PREFIJO_CLAVE}${clave}`

export function leerJson<T>(
  almacen: Almacen | null, clave: string, validar: (v: unknown) => v is T, valorPorDefecto: T,
): T {
  try {
    const texto = almacen?.getItem(claveAlmacen(clave))
    if (texto == null) return valorPorDefecto
    const valor: unknown = JSON.parse(texto)
    return validar(valor) ? valor : valorPorDefecto
  } catch {
    return valorPorDefecto
  }
}

export function escribirJson(almacen: Almacen | null, clave: string, valor: unknown): boolean {
  try {
    if (!almacen) return false
    almacen.setItem(claveAlmacen(clave), JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

export type TipoAlmacen = 'local' | 'sesion'

// El acceso al almacenamiento mismo puede lanzar (ventanas privadas, cookies bloqueadas)
export function almacenDe(tipo: TipoAlmacen): Almacen | null {
  try {
    if (typeof window === 'undefined') return null
    return tipo === 'sesion' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}
