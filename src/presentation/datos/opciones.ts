import type { CampoDef, Opcion } from '@/domain/modulos'
import { ordenarOpciones } from '@/presentation/ui/seleccion'
import type { Registro } from '@/infrastructure/firestore/repositorio'

export type CatalogosPorId = Record<string, Opcion[]>

export function itemsDeCatalogo(datos: Record<string, unknown> | undefined): Opcion[] {
  const items = (datos?.items ?? []) as { valor: string; etiqueta: string }[]
  return items.map(({ valor, etiqueta }) => ({ valor, etiqueta }))
}

// 'mostrar' resuelve nombres de cualquier colaborador; 'elegir' ofrece solo activos (y el ya seleccionado)
export type UsoOpciones = 'mostrar' | 'elegir'

function etiquetaColaborador(r: Registro, uso: UsoOpciones): string {
  const nombre = String(r.nombre ?? r.id)
  return uso === 'elegir' && r.activo === false ? `${nombre} (inactivo)` : nombre
}

export function resolverOpciones(
  campo: CampoDef, catalogos: CatalogosPorId, colaboradores: Registro[],
  uso: UsoOpciones = 'mostrar', valorActual: string | null = null,
): Opcion[] {
  if (campo.opciones) return ordenarOpciones(campo.opciones)
  if (campo.origen?.tipo === 'catalogo') return ordenarOpciones(catalogos[campo.origen.id] ?? [])
  if (campo.origen?.tipo === 'colaboradores') {
    return ordenarOpciones(colaboradores
      .filter((r) => uso === 'mostrar' || r.activo !== false || r.id === valorActual)
      .map((r) => ({ valor: r.id, etiqueta: etiquetaColaborador(r, uso) })))
  }
  return []
}
