import type { ItemCatalogo } from './catalogos-iniciales'
import type { ModuloDef } from './modulos'
import { slug } from './slug'
import { limpiarTexto } from './texto'

export interface UsoCatalogo { total: number; porColeccion: Record<string, number> }
export interface UsoModulo { coleccion: string; campos: string[] }
export type RegistrosPorColeccion = Record<string, Array<Record<string, unknown>>>

const ERR_VACIA = 'Escribe una etiqueta.'

// Si el valor base ya existe se numera (casco, casco-2, ...) para permitir etiquetas repetidas
function valorLibre(items: ItemCatalogo[], base: string): string {
  const usados = new Set(items.map((i) => i.valor))
  let valor = base
  for (let n = 2; usados.has(valor); n++) valor = `${base}-${n}`
  return valor
}

export function validarAlta(items: ItemCatalogo[], etiqueta: string) {
  const limpia = limpiarTexto(etiqueta)
  const base = slug(limpia)
  return { valor: base ? valorLibre(items, base) : '', etiqueta: limpia, error: base ? null : ERR_VACIA }
}

export function validarEdicion(etiqueta: string): string | null {
  return slug(etiqueta) ? null : ERR_VACIA
}

export type DatosExtra = Pick<ItemCatalogo, 'region' | 'riesgo' | 'nombre_corto'>

// Solo se guardan los extras con contenido
export function limpiarExtra({ region, riesgo, nombre_corto }: DatosExtra): DatosExtra {
  const texto = riesgo?.trim()
  const corto = nombre_corto?.trim()
  return { ...(region ? { region } : {}), ...(texto ? { riesgo: texto } : {}), ...(corto ? { nombre_corto: corto } : {}) }
}

export function aplicarEdicion(items: ItemCatalogo[], valor: string, etiqueta: string, extra: DatosExtra = {}): ItemCatalogo[] {
  return items.map((i) => (i.valor === valor ? { ...i, etiqueta: limpiarTexto(etiqueta), ...limpiarExtra(extra) } : i))
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
