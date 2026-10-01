'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { almacenLocal, escribirJson, leerJson } from './persistencia'

type Actualizador<T> = T | ((anterior: T) => T)

// Con clave null el estado vive solo en memoria
export function usePersistente<T>(
  clave: string | null, porDefecto: T, validar: (v: unknown) => v is T,
): [T, (valor: Actualizador<T>) => void] {
  const [valor, setValorEstado] = useState<T>(porDefecto)
  const ultimo = useRef<T>(porDefecto)
  const hidratado = useRef(false)

  // El primer render usa el valor por defecto igual que el servidor; el guardado se lee aqui
  useEffect(() => {
    if (clave === null) return
    const guardado = leerJson(almacenLocal(), clave, validar, porDefecto)
    ultimo.current = guardado
    hidratado.current = true
    setValorEstado(guardado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const setValor = useCallback((nuevo: Actualizador<T>) => {
    const siguiente = typeof nuevo === 'function' ? (nuevo as (a: T) => T)(ultimo.current) : nuevo
    ultimo.current = siguiente
    setValorEstado(siguiente)
    if (clave !== null && hidratado.current) escribirJson(almacenLocal(), clave, siguiente)
  }, [clave])

  return [valor, setValor]
}
