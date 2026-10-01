import { useMemo } from 'react'
import { contarUso, usosDeCatalogo, type RegistrosPorColeccion, type UsoCatalogo } from '@/domain/catalogos-edicion'
import { MODULOS } from '@/domain/modulos-definiciones'
import { useColeccion } from '@/presentation/datos/useColeccion'

const IDS_CATALOGO = Array.from(new Set(Object.values(MODULOS).flatMap((m) =>
  m.campos.flatMap((c) => (c.origen?.tipo === 'catalogo' ? [c.origen.id] : [])))))
const MAX_USOS = Math.max(0, ...IDS_CATALOGO.map((id) => usosDeCatalogo(MODULOS, id).length))
const SLOTS = Array.from({ length: MAX_USOS }, (_, i) => i)

// Suscribe solo las colecciones que referencian el catálogo (ranuras fijas para respetar las reglas de hooks)
export function useUsoCatalogo(catalogoId: string) {
  const usos = useMemo(() => usosDeCatalogo(MODULOS, catalogoId), [catalogoId])
  const lecturas = SLOTS.map((i) => useColeccion(usos[i]?.coleccion ?? null)) // eslint-disable-line react-hooks/rules-of-hooks
  const registros = lecturas.map((l) => l.registros)

  const porColeccion = useMemo<RegistrosPorColeccion>(
    () => Object.fromEntries(usos.map((u, i) => [u.coleccion, registros[i] ?? []])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usos, ...registros],
  )
  const cargando = lecturas.some((l, i) => i < usos.length && l.cargando)
  const error = lecturas.find((l) => l.error)?.error ?? null
  const usoDe = (valor: string): UsoCatalogo => contarUso(usos, porColeccion, valor)
  return { cargando, error, usoDe }
}
