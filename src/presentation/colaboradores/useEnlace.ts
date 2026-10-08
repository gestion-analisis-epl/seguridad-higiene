'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ColaboradorHoja, FilaEnlace } from '@/domain/colaboradores-hoja'
import { cargarEnlace, desvincular, vincular } from '@/infrastructure/api/colaboradores'

const mensaje = (e: unknown, defecto: string) => (e instanceof Error ? e.message : defecto)

export function useEnlace() {
  const [filas, setFilas] = useState<FilaEnlace[]>([])
  const [hoja, setHoja] = useState<ColaboradorHoja[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async (forzar = false) => {
    setCargando(true)
    setError(null)
    try {
      const r = await cargarEnlace(forzar)
      setFilas(r.filas)
      setHoja(r.hoja)
    } catch (e) {
      setError(mensaje(e, 'No se pudo cargar el enlace'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  // Devuelve el error de la operación para que la tabla lo muestre junto a la fila
  const vincularFila = useCallback(async (uid: string, idInterno: string): Promise<string | null> => {
    try { await vincular(uid, idInterno); return null } catch (e) { return mensaje(e, 'No se pudo vincular') }
  }, [])
  const desvincularFila = useCallback(async (uid: string): Promise<string | null> => {
    try { await desvincular(uid); return null } catch (e) { return mensaje(e, 'No se pudo desvincular') }
  }, [])

  return { filas, hoja, cargando, error, recargar, vincular: vincularFila, desvincular: desvincularFila }
}
