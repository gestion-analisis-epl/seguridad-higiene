import type { ItemCatalogo } from './catalogos-iniciales'
import type { ModuloDef } from './modulos'
import { slug } from './slug'
import { limpiarTexto } from './texto'

export interface UsoCatalogo { total: number; porColeccion: Record<string, number> }
export interface UsoModulo { coleccion: string; campos: string[] }
export type RegistrosPorColeccion = Record<string, Array<Record<string, unknown>>>

// Compara etiquetas sin mayúsculas, acentos ni espacios repetidos
const clave = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

const ERR_VACIA = 'Escribe una etiqueta.'
const ERR_REPETIDA = 'Ya existe un valor con esa etiqueta en este catálogo.'

export function validarAlta(items: ItemCatalogo[], etiqueta: string) {
  const limpia = limpiarTexto(etiqueta)
  const valor = slug(limpia)
  const error = !valor ? ERR_VACIA
    : items.some((i) => i.valor === valor) ? 'Ya existe un valor interno igual a este.'
      : items.some((i) => clave(i.etiqueta) === clave(limpia)) ? ERR_REPETIDA : null
  return { valor, etiqueta: limpia, error }
}

export function validarEdicion(items: ItemCatalogo[], valor: string, etiqueta: string): string | null {
  if (!slug(etiqueta)) return ERR_VACIA
  return items.some((i) => i.valor !== valor && clave(i.etiqueta) === clave(etiqueta)) ? ERR_REPETIDA : null
}

export function aplicarEdicion(items: ItemCatalogo[], valor: string, etiqueta: string): ItemCatalogo[] {
  return items.map((i) => (i.valor === valor ? { valor: i.valor, etiqueta: limpiarTexto(etiqueta) } : i))
}

export function usosDeCatalogo(modulos: Record<string, ModuloDef>, catalogoId: string): UsoModulo[] {
  const usos = new Map<string, string[]>()
  for (const m of Object.values(modulos)) {
    const campos = m.campos.filter((c) => c.origen?.tipo === 'catalogo' && c.origen.id === catalogoId).map((c) => c.nombre)
    if (campos.length) usos.set(m.coleccion, [...(usos.get(m.coleccion) ?? []), ...campos])
  }
  return Array.from(usos, ([coleccion, campos]) => ({ coleccion, campos }))
}

export function contarUso(usos: UsoModulo[], registros: RegistrosPorColeccion, valor: string): UsoCatalogo {
  const porColeccion: Record<string, number> = {}
  let total = 0
  for (const u of usos) {
    const n = (registros[u.coleccion] ?? []).filter((r) => u.campos.some((c) => r[c] === valor)).length
    if (n > 0) { porColeccion[u.coleccion] = n; total += n }
  }
  return { total, porColeccion }
}

export function mensajeUsoEnUso(uso: UsoCatalogo): string {
  const detalle = Object.entries(uso.porColeccion).map(([c, n]) => `${c}: ${n}`).join(', ')
  return `En uso por ${uso.total} registros (${detalle}). Edita la etiqueta en lugar de eliminarlo.`
}

export function quitarItem(items: ItemCatalogo[], valor: string, uso: UsoCatalogo) {
  if (uso.total > 0) return { items, error: `No se puede eliminar: ${mensajeUsoEnUso(uso)}` }
  return { items: items.filter((i) => i.valor !== valor), error: null }
}
