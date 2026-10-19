import type { DestinoEntrega } from '@/domain/entregas-hoja'

export type AlcanceReinicio = 'uniformes' | 'epp' | 'equipo'

interface Definicion { etiqueta: string; catalogo: string; coleccion: string | null; destino: DestinoEntrega }

// Cada alcance borra su catálogo, sus entregas (si las tiene) y los artículos de la hoja que apuntan a él
export const ALCANCES: Record<AlcanceReinicio, Definicion> = {
  uniformes: { etiqueta: 'Uniformes', catalogo: 'prendas', coleccion: 'entregas_uniforme', destino: 'uniforme' },
  epp: { etiqueta: 'EPP', catalogo: 'tipos_epp', coleccion: 'entregas_epp', destino: 'epp' },
  equipo: { etiqueta: 'Tipos de equipo', catalogo: 'tipos_equipo', coleccion: null, destino: 'equipo' },
}

export const FRASE_CONFIRMACION = 'REINICIAR'

export interface DocumentoRespaldo { id: string; data: Record<string, unknown> }

export interface EntradaReinicio {
  catalogos: Record<string, Record<string, unknown> | undefined>
  colecciones: Record<string, DocumentoRespaldo[]>
  articulos: DocumentoRespaldo[]
}

export interface ConteoReinicio { alcance: AlcanceReinicio; etiqueta: string; entradas: number; entregas: number; articulos: number }

export interface RespaldoReinicio {
  alcances: AlcanceReinicio[]
  catalogos: Record<string, unknown>
  colecciones: Record<string, DocumentoRespaldo[]>
}

export interface PlanReinicio {
  respaldo: RespaldoReinicio
  vaciar: string[]
  borrar: { coleccion: string; ids: string[] }[]
  conteos: ConteoReinicio[]
}

// Lista sin repetir de alcances válidos; null si está vacía o trae algo desconocido
export function normalizarAlcances(valor: unknown): AlcanceReinicio[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null
  if (!valor.every((v) => typeof v === 'string' && v in ALCANCES)) return null
  return Array.from(new Set(valor as AlcanceReinicio[]))
}

export function planearReinicio(alcances: AlcanceReinicio[], entrada: EntradaReinicio): PlanReinicio {
  const defs = alcances.map((alcance) => ({ alcance, ...ALCANCES[alcance] }))
  const destinos = new Set<string>(defs.map((d) => d.destino))
  const articulos = entrada.articulos.filter((a) => destinos.has(String(a.data.destino)))
  const entregas = Object.fromEntries(
    defs.flatMap((d) => (d.coleccion ? [[d.coleccion, entrada.colecciones[d.coleccion] ?? []] as const] : [])),
  )
  const items = (catalogo: string) => (entrada.catalogos[catalogo]?.items as unknown[] | undefined) ?? []
  return {
    respaldo: {
      alcances,
      catalogos: Object.fromEntries(defs.map((d) => [d.catalogo, entrada.catalogos[d.catalogo] ?? null])),
      colecciones: { ...entregas, articulos_hoja: articulos },
    },
    vaciar: defs.map((d) => d.catalogo),
    borrar: [
      ...Object.entries(entregas).map(([coleccion, docs]) => ({ coleccion, ids: docs.map((x) => x.id) })),
      { coleccion: 'articulos_hoja', ids: articulos.map((a) => a.id) },
    ],
    conteos: defs.map((d) => ({
      alcance: d.alcance,
      etiqueta: d.etiqueta,
      entradas: items(d.catalogo).length,
      entregas: d.coleccion ? entregas[d.coleccion].length : 0,
      articulos: articulos.filter((a) => a.data.destino === d.destino).length,
    })),
  }
}
