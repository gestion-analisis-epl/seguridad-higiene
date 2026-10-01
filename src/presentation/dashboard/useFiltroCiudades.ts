'use client'

import { useCallback, useMemo } from 'react'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { ordenarOpciones } from '@/presentation/ui/seleccion'
import { usePersistente } from '@/presentation/ui/usePersistente'
import {
  CLAVE_CIUDADES_OCULTAS, ocultasDesdeSeleccion, ocultasValidas, seleccionDesdeOcultas,
} from './ciudades-filtro'

const SIN_OCULTAS: string[] = []

// ciudades es undefined (sin filtro) mientras el catálogo no tenga ciudades
export function useFiltroCiudades() {
  const catalogo = useCatalogo('ciudades')
  const [ocultas, setOcultas] = usePersistente<string[]>(CLAVE_CIUDADES_OCULTAS, SIN_OCULTAS, ocultasValidas)
  const opciones = useMemo(() => ordenarOpciones(catalogo), [catalogo])
  const todas = useMemo(() => catalogo.map((c) => c.valor), [catalogo])
  const seleccion = useMemo(() => seleccionDesdeOcultas(todas, ocultas), [todas, ocultas])
  const cambiar = useCallback(
    (nueva: string[]) => setOcultas((previas) => ocultasDesdeSeleccion(todas, nueva, previas)),
    [todas, setOcultas],
  )
  const etiqueta = useCallback(
    (valor: string) => catalogo.find((c) => c.valor === valor)?.etiqueta ?? valor,
    [catalogo],
  )
  return {
    opciones, seleccion, cambiar, etiqueta,
    ciudades: todas.length === 0 ? undefined : seleccion,
  }
}
