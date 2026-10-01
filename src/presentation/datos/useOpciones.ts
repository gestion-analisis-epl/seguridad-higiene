'use client'

import type { CampoDef, Opcion } from '@/domain/modulos'
import { useCatalogo } from './useCatalogo'
import { useColeccion } from './useColeccion'
import { resolverOpciones } from './opciones'

// Para elegir en formularios: solo colaboradores activos, mas el ya seleccionado aunque este inactivo
export function useOpciones(campo: CampoDef, valorActual: string | null = null): Opcion[] {
  const idCatalogo = campo.origen?.tipo === 'catalogo' ? campo.origen.id : null
  const catalogo = useCatalogo(idCatalogo)
  const { registros } = useColeccion(campo.origen?.tipo === 'colaboradores' ? 'colaboradores' : null)
  return resolverOpciones(campo, idCatalogo ? { [idCatalogo]: catalogo } : {}, registros, 'elegir', valorActual)
}
