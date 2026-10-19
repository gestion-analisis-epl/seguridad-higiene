import { REGIONES_ANATOMICAS } from './catalogos-iniciales'
import type { Opcion } from './modulos'

// titulo lleva el número de la región ("1) Cabeza"); opciones llevan la letra por orden de captura ("A) Casco")
export interface GrupoRegion { region: string; etiqueta: string; titulo: string; items: Opcion[]; opciones: Opcion[] }

export const SIN_REGION = 'sin-region'

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const letraSecuencial = (i: number): string => LETRAS[i % 26].repeat(Math.floor(i / 26) + 1)

const conLetra = (items: Opcion[]): Opcion[] => items.map((o, i) => ({ ...o, etiqueta: `${letraSecuencial(i)}) ${o.etiqueta}` }))

// Regiones en el orden de la norma; los ítems sin región van al final y las regiones vacías se omiten
export function agruparPorRegion(items: Opcion[]): GrupoRegion[] {
  const conocidas = new Set(REGIONES_ANATOMICAS.map((r) => r.valor))
  const grupo = (region: string, etiqueta: string, titulo: string, deRegion: Opcion[]): GrupoRegion =>
    ({ region, etiqueta, titulo, items: deRegion, opciones: conLetra(deRegion) })
  const grupos = REGIONES_ANATOMICAS.map((r, i) => grupo(r.valor, r.etiqueta, `${i + 1}) ${r.etiqueta}`, items.filter((x) => x.region === r.valor)))
  grupos.push(grupo(SIN_REGION, 'Sin región', 'Sin región', items.filter((x) => !x.region || !conocidas.has(x.region))))
  return grupos.filter((g) => g.items.length > 0)
}
