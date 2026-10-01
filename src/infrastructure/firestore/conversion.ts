import { serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore'
import type { Valores } from '@/domain/modulos'

const esObjetoPlano = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype

// Recorre arreglos y objetos planos anidados convirtiendo cada hoja.
function mapear(v: unknown, hoja: (x: unknown) => unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => mapear(x, hoja))
  if (esObjetoPlano(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapear(x, hoja)]))
  return hoja(v)
}

const hojaAFirestore = (v: unknown) => (v === undefined ? null : v instanceof Date ? Timestamp.fromDate(v) : v)
const hojaDeFirestore = (v: unknown) => (v instanceof Timestamp ? v.toDate() : v)

export function aFirestore(valores: Valores): Record<string, unknown> {
  return mapear(valores, hojaAFirestore) as Record<string, unknown>
}

export function deFirestore(data: DocumentData): Record<string, unknown> {
  return mapear(data, hojaDeFirestore) as Record<string, unknown>
}

export function conAuditoria(
  datos: Record<string, unknown>, uid: string, esNuevo: boolean, marca: unknown = serverTimestamp(),
): Record<string, unknown> {
  const base = { ...datos, actualizado_por: uid, actualizado_en: marca }
  return esNuevo ? { ...base, creado_por: uid, creado_en: marca } : base
}
