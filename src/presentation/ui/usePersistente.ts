'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EVENTO_CLAVE_EXTERNA, almacenDe, escribirJson, leerJson, type TipoAlmacen } from './persistencia'

type Actualizador<T> = T | ((anterior: T) => T)

// Con clave null el estado vive solo en memoria; tipo 'sesion' dura mientras la pestaña
export function usePersistente<T>(
  clave: string | null, porDefecto: T, validar: (v: unknown) => v is T,
  tipo: TipoAlmacen = 'local',
): [T, (valor: Actualizador<T>) => void] {
  const [valor, setValorEstado] = useState<T>(porDefecto)
  const ultimo = useRef<T>(porDefecto)
  const hidratado = useRef(false)

  // El primer render usa el valor por defecto igual que el servidor; el guardado se lee aqui
  useEffect(() => {
    if (clave === null) return
    const guardado = leerJson(almacenDe(tipo), clave, validar, porDefecto)
    ultimo.current = guardado
    hidratado.current = true
    setValorEstado(guardado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, tipo])

  // Relee cuando otra parte de la app escribe esta clave con la pagina ya abierta
  useEffect(() => {
    if (clave === null) return
    const alAvisar = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== clave) return
      const guardado = leerJson(almacenDe(tipo), clave, validar, porDefecto)
      ultimo.current = guardado
      setValorEstado(guardado)
    }
    window.addEventListener(EVENTO_CLAVE_EXTERNA, alAvisar)
    return () => window.removeEventListener(EVENTO_CLAVE_EXTERNA, alAvisar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, tipo])

  const setValor = useCallback((nuevo: Actualizador<T>) => {
    const siguiente = typeof nuevo === 'function' ? (nuevo as (a: T) => T)(ultimo.current) : nuevo
    ultimo.current = siguiente
    setValorEstado(siguiente)
    if (clave !== null && hidratado.current) escribirJson(almacenDe(tipo), clave, siguiente)
  }, [clave, tipo])

  return [valor, setValor]
}
