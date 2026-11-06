import type { Colaborador, DatosOperativos } from '@/domain/entidades'
import { formatearFecha } from '@/domain/fechas'
import { DOTACION_VACIA, type Dotacion } from '@/domain/reglas-dotacion'
import { aOracion, aTitulo } from '@/domain/texto'
import { evaluacionColaboradores, normasFaltantes, type Evaluacion } from './dashboard'

export interface Pendientes { evaluacion: Evaluacion; normas: string[]; exigeCapacitacion: boolean }
export interface FichaColaborador { colaborador: Colaborador; pendientes: Pendientes | null }

// Pendientes con las mismas reglas del dashboard; sin evaluación para quien está de baja
export function fichaDeColaborador(d: DatosOperativos, id: string, hoy: Date, dotacion: Dotacion = DOTACION_VACIA): FichaColaborador | null {
  const colaborador = d.colaboradores.find((c) => c.id === id)
  if (!colaborador) return null
  const [evaluacion] = evaluacionColaboradores({ ...d, colaboradores: [colaborador] }, hoy, dotacion)
  if (!evaluacion) return { colaborador, pendientes: null }
  return {
    colaborador,
    pendientes: {
      evaluacion, normas: normasFaltantes(colaborador, d.capacitaciones, hoy),
      exigeCapacitacion: (colaborador.normas_obligatorias ?? []).length > 0,
    },
  }
}

export const registrosDelColaborador = <T extends Record<string, unknown>>(registros: T[], id: string): T[] =>
  registros.filter((r) => r.colaborador_id === id)

export interface DatoGeneral { etiqueta: string; valor: string }
type Etiquetar = (valor: string) => string
export interface EtiquetasGenerales { ciudad: Etiquetar; area: Etiquetar; cuadrilla: Etiquetar; linea_negocio: Etiquetar }

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const fecha = (v: unknown) => (v instanceof Date ? formatearFecha(v) : '')

// Formato oración en todo; solo los nombres de personas llevan mayúscula en cada palabra y la empresa abreviada va en mayúsculas
export function datosGenerales(r: Record<string, unknown>, etiquetas: EtiquetasGenerales): DatoGeneral[] {
  const oracion = (v: unknown) => aOracion(texto(v))
  const catalogo = (v: unknown, etiquetar: Etiquetar) => (texto(v) ? aOracion(etiquetar(texto(v))) : '')
  const persona = (v: unknown) => aTitulo(texto(v))
  const filas: [string, string][] = [
    ['Número de colaborador', texto(r.numero_colaborador)],
    ['ID interno', texto(r.id_interno)],
    ['Puesto', oracion(r.puesto)],
    ['Empresa', oracion(r.empresa)],
    ['Empresa abreviada', texto(r.linea_negocio) ? etiquetas.linea_negocio(texto(r.linea_negocio)).toUpperCase() : ''],
    ['Ciudad', catalogo(r.ciudad, etiquetas.ciudad)],
    ['Plaza', oracion(r.plaza)],
    ['Zona', oracion(r.zona)],
    ['Área', catalogo(r.area, etiquetas.area)],
    ['Cuadrilla', catalogo(r.cuadrilla, etiquetas.cuadrilla)],
    ['Jefe', persona(r.jefe)],
    ['Gerente', persona(r.gerente)],
    ['Fecha de ingreso', fecha(r.fecha_ingreso)],
  ]
  if (r.fecha_baja instanceof Date) filas.push(['Fecha de baja', fecha(r.fecha_baja)], ['Motivo de baja', oracion(r.motivo_baja)])
  return filas.map(([etiqueta, valor]) => ({ etiqueta, valor: valor || '-' }))
}
