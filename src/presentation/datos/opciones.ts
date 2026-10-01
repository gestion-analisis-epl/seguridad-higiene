import type { CampoDef, Opcion } from '@/domain/modulos'
import { ordenarOpciones } from '@/presentation/ui/seleccion'
import type { Registro } from '@/infrastructure/firestore/repositorio'

export type CatalogosPorId = Record<string, Opcion[]>

export function itemsDeCatalogo(datos: Record<string, unknown> | undefined): Opcion[] {
  const items = (datos?.items ?? []) as { valor: string; etiqueta: string }[]
  return items.map(({ valor, etiqueta }) => ({ valor, etiqueta }))
}

export function resolverOpciones(campo: CampoDef, catalogos: CatalogosPorId, colaboradores: Registro[]): Opcion[] {
  if (campo.opciones) return ordenarOpciones(campo.opciones)
  if (campo.origen?.tipo === 'catalogo') return ordenarOpciones(catalogos[campo.origen.id] ?? [])
  if (campo.origen?.tipo === 'colaboradores') {
    return ordenarOpciones(colaboradores
      .filter((r) => r.activo !== false)
      .map((r) => ({ valor: r.id, etiqueta: String(r.nombre ?? r.id) })))
  }
  return []
}
