import type { CampoDef, Opcion } from '@/domain/modulos'
import { ordenarOpciones } from '@/presentation/ui/seleccion'
import type { Registro } from '@/infrastructure/firestore/repositorio'

export type CatalogosPorId = Record<string, Opcion[]>

// completo=true devuelve la etiqueta tal cual (administración); si no, se muestra el nombre corto cuando lo hay
export function itemsDeCatalogo(datos: Record<string, unknown> | undefined, completo = false): Opcion[] {
  const items = (datos?.items ?? []) as Opcion[]
  // Un valor repetido en Firestore rompería las keys de las columnas y listas
  const vistos = new Set<string>()
  return items.filter((i) => !vistos.has(i.valor) && vistos.add(i.valor)).map(({ valor, etiqueta, region, riesgo, nombre_corto }) => ({
    valor, etiqueta: completo ? etiqueta : nombre_corto || etiqueta,
    ...(region ? { region } : {}), ...(riesgo ? { riesgo } : {}), ...(nombre_corto ? { nombre_corto } : {}),
  }))
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
