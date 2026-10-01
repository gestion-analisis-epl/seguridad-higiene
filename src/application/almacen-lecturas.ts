export interface Lectura<T> { dato: T | undefined; cargando: boolean; error: string | null }

export type Abrir<T> = (clave: string, alDato: (dato: T) => void, alError: (e: Error) => void) => () => void

export interface AlmacenLecturas<T> {
  suscribir: (clave: string, escucha: () => void) => () => void
  leer: (clave: string) => Lectura<T>
  vaciar: () => void
}

export const LECTURA_CARGANDO: Lectura<never> = { dato: undefined, cargando: true, error: null }
export const LECTURA_VACIA: Lectura<never> = { dato: undefined, cargando: false, error: null }

export const claveColeccion = (coleccion: string) => `c:${coleccion}`
export const claveDoc = (coleccion: string, id: string) => `d:${coleccion}/${id}`

// Un listener por clave durante toda la sesion; la foto de cada clave solo cambia cuando cambia el dato
export function crearAlmacen<T>(abrir: Abrir<T>): AlmacenLecturas<T> {
  const lecturas = new Map<string, Lectura<T>>()
  const escuchas = new Map<string, Set<() => void>>()
  const entradas = new Map<string, { cancelar: () => void }>()

  const avisar = (clave: string) => { for (const e of Array.from(escuchas.get(clave) ?? [])) e() }

  function iniciar(clave: string) {
    const hubo = lecturas.has(clave)
    lecturas.set(clave, LECTURA_CARGANDO)
    const entrada = { cancelar: () => {} }
    entradas.set(clave, entrada)
    const alDato = (dato: T) => {
      if (entradas.get(clave) !== entrada) return
      lecturas.set(clave, { dato, cargando: false, error: null })
      avisar(clave)
    }
    // Con error se descarta la entrada: el proximo suscriptor abre un listener nuevo
    const alError = (e: Error) => {
      if (entradas.get(clave) !== entrada) return
      entradas.delete(clave)
      entrada.cancelar()
      lecturas.set(clave, { dato: undefined, cargando: false, error: e.message })
      avisar(clave)
    }
    const cancelar = abrir(clave, alDato, alError)
    if (entradas.get(clave) === entrada) entrada.cancelar = cancelar
    else cancelar()
    if (hubo) avisar(clave)
  }

  return {
    suscribir(clave, escucha) {
      let set = escuchas.get(clave)
      if (!set) { set = new Set(); escuchas.set(clave, set) }
      set.add(escucha)
      if (!entradas.has(clave)) iniciar(clave)
      const propio = set
      return () => { propio.delete(escucha) }
    },
    leer: (clave) => lecturas.get(clave) ?? LECTURA_CARGANDO,
    vaciar() {
      const pendientes = Array.from(escuchas.values()).flatMap((s) => Array.from(s))
      for (const e of Array.from(entradas.values())) e.cancelar()
      entradas.clear()
      lecturas.clear()
      escuchas.clear()
      for (const e of pendientes) e()
    },
  }
}
