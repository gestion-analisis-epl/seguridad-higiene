import type { ItemCatalogo } from './catalogos-iniciales'
import { slug } from './slug'

export const CATALOGO_EMPRESAS = 'lineas_negocio'

export const NOMBRES_CORTOS_EMPRESA: { nombre: string; corto: string }[] = [
  { nombre: 'Corporativo Publicitario Mao', corto: 'MAO' },
  { nombre: 'Especialistas Profesionales', corto: 'EPL' },
  { nombre: 'Lumina Pantallas Digitales', corto: 'LUMINA' },
  { nombre: 'Marketing en Publicidad de Queretaro', corto: 'MKTQRO' },
  { nombre: 'Montaje, Supervision y Construccion', corto: 'MSC' },
  { nombre: 'Servicios de Anuncios Publicitarios', corto: 'SAP' },
  { nombre: 'Sicmart SA de CV', corto: 'Sicmart' },
  { nombre: 'The Best Marketing', corto: 'BEST' },
]

export interface ResultadoNombresCortos { items: ItemCatalogo[]; aplicados: number; sinCoincidencia: string[] }

// Empareja por la etiqueta o el valor interno, sin acentos ni signos; admite sufijos como "SA de CV"
export function aplicarNombresCortos(items: ItemCatalogo[]): ResultadoNombresCortos {
  const usados = new Set<string>()
  const sinCoincidencia: string[] = []
  let aplicados = 0
  const resultado = items.map((i) => ({ ...i }))
  for (const { nombre, corto } of NOMBRES_CORTOS_EMPRESA) {
    const base = slug(nombre)
    const destino = resultado.find((i) => !usados.has(i.valor)
      && (i.valor === base || slug(i.etiqueta) === base || slug(i.etiqueta).startsWith(`${base}-`)))
    if (!destino) { sinCoincidencia.push(nombre); continue }
    usados.add(destino.valor)
    if (destino.nombre_corto !== corto) { destino.nombre_corto = corto; aplicados++ }
  }
  return { items: resultado, aplicados, sinCoincidencia }
}
