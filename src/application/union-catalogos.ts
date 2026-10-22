import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import { usosDeCatalogo } from '@/domain/catalogos-edicion'
import { MODULOS } from '@/domain/modulos-definiciones'

export interface DocFs { id: string; data: Record<string, unknown> }

// bloquea: registros que apuntan a la entrada pero no se reasignan solos (su id o su forma dependen del valor)
export interface Referencia {
  coleccion: string
  campo: string
  lista?: boolean
  bloquea?: string
  donde?: (data: Record<string, unknown>) => boolean
}

export interface Encontrados { referencia: Referencia; docs: DocFs[] }
export interface CambioUnion { coleccion: string; id: string; campos: Record<string, string> }

export interface PlanUnion {
  items: ItemCatalogo[]
  cambios: CambioUnion[]
  bloqueos: string[]
}

export const CATALOGO_NO_UNIBLE = 'ciudades'
const DESTINO_ARTICULO: Record<string, string> = { prendas: 'uniforme', tipos_epp: 'epp', tipos_equipo: 'equipo' }

export function referenciasDeCatalogo(catalogo: string): Referencia[] {
  const modulos = usosDeCatalogo(MODULOS, catalogo).flatMap((u) => u.campos.map((campo) => ({ coleccion: u.coleccion, campo })))
  const extra: Referencia[] = []
  if (catalogo === 'lineas_negocio') extra.push({ coleccion: 'reglas_dotacion', campo: 'linea_negocio', bloquea: 'reglas de dotación' })
  if (catalogo === 'areas') extra.push({ coleccion: 'reglas_dotacion', campo: 'area', bloquea: 'reglas de dotación' })
  if (catalogo === 'prendas' || catalogo === 'tipos_epp') extra.push({ coleccion: 'reglas_dotacion', campo: catalogo, lista: true, bloquea: 'reglas de dotación' })
  const destino = DESTINO_ARTICULO[catalogo]
  if (destino) extra.push({ coleccion: 'articulos_hoja', campo: 'valor', bloquea: 'artículos de la hoja', donde: (d) => d.destino === destino })
  return [...modulos, ...extra]
}

export function planearUnion(
  catalogo: string, origen: string, destino: string, items: ItemCatalogo[], encontrados: Encontrados[],
): PlanUnion | { error: string } {
  if (catalogo === CATALOGO_NO_UNIBLE) return { error: 'Las ciudades también se guardan derivadas en otros registros y no se pueden unir aquí' }
  if (origen === destino) return { error: 'Elige dos entradas distintas' }
  const o = items.find((i) => i.valor === origen)
  const d = items.find((i) => i.valor === destino)
  if (!o || !d) return { error: 'La entrada ya no existe en el catálogo' }

  const bloqueos: string[] = []
  const porDoc = new Map<string, CambioUnion>()
  for (const { referencia: r, docs } of encontrados) {
    const validos = r.donde ? docs.filter((x) => r.donde!(x.data)) : docs
    if (validos.length === 0) continue
    if (r.bloquea) { bloqueos.push(`${validos.length} ${r.bloquea}`); continue }
    for (const x of validos) {
      const clave = `${r.coleccion}/${x.id}`
      const cambio = porDoc.get(clave) ?? { coleccion: r.coleccion, id: x.id, campos: {} }
      cambio.campos[r.campo] = destino
      porDoc.set(clave, cambio)
    }
  }
  const completado: ItemCatalogo = { ...d }
  for (const k of ['region', 'riesgo', 'nombre_corto'] as const) if (!completado[k] && o[k]) completado[k] = o[k]
  return {
    items: items.filter((i) => i.valor !== origen).map((i) => (i.valor === destino ? completado : i)),
    cambios: Array.from(porDoc.values()),
    bloqueos,
  }
}
