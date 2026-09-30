'use client'

import { useEffect, useState } from 'react'
import { suscribir, type Registro } from '@/infrastructure/firestore/repositorio'

export function useColeccion(coleccion: string | null) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(coleccion !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coleccion) return
    setCargando(true)
    return suscribir(
      coleccion,
      (r) => { setRegistros(r); setCargando(false) },
      (e) => { setError(e.message); setCargando(false) },
    )
  }, [coleccion])

  return { registros, cargando, error }
}
