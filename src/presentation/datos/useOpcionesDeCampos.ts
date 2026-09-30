'use client'

import { useMemo } from 'react'
import type { CampoDef, Opcion } from '@/domain/modulos'
import { itemsDeCatalogo, resolverOpciones, type CatalogosPorId } from './opciones'
import { useColeccion } from './useColeccion'

// Un listener por fuente, sin importar cuantos campos o filas haya
export function useOpcionesDeCampos(campos: CampoDef[]): Record<string, Opcion[]> {
  const usaCatalogos = campos.some((c) => !c.opciones && c.origen?.tipo === 'catalogo')
  const usaColaboradores = campos.some((c) => !c.opciones && c.origen?.tipo === 'colaboradores')
  const { registros: catalogosDocs } = useColeccion(usaCatalogos ? 'catalogos' : null)
  const { registros: colaboradores } = useColeccion(usaColaboradores ? 'colaboradores' : null)

  return useMemo(() => {
    const catalogos: CatalogosPorId = Object.fromEntries(catalogosDocs.map((d) => [d.id, itemsDeCatalogo(d)]))
    return Object.fromEntries(campos.map((c) => [c.nombre, resolverOpciones(c, catalogos, colaboradores)]))
  }, [campos, catalogosDocs, colaboradores])
}
