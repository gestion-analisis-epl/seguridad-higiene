'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { clienteHoja } from '@/infrastructure/api/colaboradores'

interface Estado { filas: ColaboradorHoja[]; cargando: boolean; error: string | null; desactualizado: boolean }

export function useColaboradoresHoja() {
  const [estado, setEstado] = useState<Estado>({ filas: [], cargando: true, error: null, desactualizado: false })
  const montado = useRef(true)

  const cargar = useCallback((forzar: boolean) => {
    setEstado((p) => ({ ...p, cargando: true, error: null }))
    clienteHoja.obtener(forzar)
      .then((r) => { if (montado.current) setEstado({ filas: r.colaboradores, cargando: false, error: null, desactualizado: r.desactualizado }) })
      .catch((e: unknown) => {
        if (montado.current) setEstado((p) => ({ ...p, cargando: false, error: e instanceof Error ? e.message : 'No se pudo cargar la lista' }))
      })
  }, [])

  useEffect(() => {
    montado.current = true
    cargar(false)
    return () => { montado.current = false }
  }, [cargar])

  return { ...estado, actualizar: () => cargar(true) }
}
