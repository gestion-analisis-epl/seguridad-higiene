export interface ConfigIndicadores {
  horasPorPersonaMes: number
  kMensual: number
  kAnual: number
  umbralSupera: number
  umbralMeta: number
  umbralMinimo: number
  referenciaInterpretacion: number
}

export const CONFIG_INDICADORES_INICIAL: ConfigIndicadores = {
  horasPorPersonaMes: 240,
  kMensual: 20000,
  kAnual: 240000,
  umbralSupera: 0.4,
  umbralMeta: 0.7,
  umbralMinimo: 1,
  referenciaInterpretacion: 0.2,
}

const CAMPOS_DOC: Record<keyof ConfigIndicadores, string> = {
  horasPorPersonaMes: 'horas_por_persona_mes',
  kMensual: 'k_mensual',
  kAnual: 'k_anual',
  umbralSupera: 'umbral_supera',
  umbralMeta: 'umbral_meta',
  umbralMinimo: 'umbral_minimo',
  referenciaInterpretacion: 'referencia_interpretacion',
}

export function configDesdeDoc(doc: Record<string, unknown> | null): ConfigIndicadores {
  const cfg = { ...CONFIG_INDICADORES_INICIAL }
  if (!doc) return cfg
  for (const clave of Object.keys(CAMPOS_DOC) as (keyof ConfigIndicadores)[]) {
    const valor = doc[CAMPOS_DOC[clave]]
    if (typeof valor === 'number' && Number.isFinite(valor)) cfg[clave] = valor
  }
  return cfg
}

export interface MesBase { poblacion: number; eventos: number; dias: number }

export interface Indices {
  hht: number
  eventos: number
  dias: number
  indiceFrecuencia: number | null
  indiceSeveridad: number | null
  ili: number | null
}

export function calcularHht(poblacion: number, cfg: ConfigIndicadores): number {
  return poblacion * cfg.horasPorPersonaMes
}

function indice(numerador: number, hht: number, k: number): number | null {
  return hht > 0 ? (numerador / hht) * k : null
}

export function calcularIndices(meses: MesBase[], cfg: ConfigIndicadores, k: number): Indices {
  const hht = meses.reduce((s, m) => s + calcularHht(m.poblacion, cfg), 0)
  const eventos = meses.reduce((s, m) => s + m.eventos, 0)
  const dias = meses.reduce((s, m) => s + m.dias, 0)
  const indiceFrecuencia = indice(eventos, hht, k)
  const indiceSeveridad = indice(dias, hht, k)
  const ili = indiceFrecuencia !== null && indiceSeveridad !== null
    ? (indiceFrecuencia * indiceSeveridad) / 1000
    : null
  return { hht, eventos, dias, indiceFrecuencia, indiceSeveridad, ili }
}

export const calcularMes = (mes: MesBase, cfg: ConfigIndicadores): Indices =>
  calcularIndices([mes], cfg, cfg.kMensual)

export const calcularAnual = (meses: MesBase[], cfg: ConfigIndicadores): Indices =>
  calcularIndices(meses, cfg, cfg.kAnual)

export type NivelIli = 'supera' | 'meta' | 'minimo' | 'fuera_de_meta' | 'sin_dato'

export function clasificarIli(ili: number | null, cfg: ConfigIndicadores): NivelIli {
  if (ili === null) return 'sin_dato'
  if (ili <= cfg.umbralSupera) return 'supera'
  if (ili <= cfg.umbralMeta) return 'meta'
  if (ili <= cfg.umbralMinimo) return 'minimo'
  return 'fuera_de_meta'
}
