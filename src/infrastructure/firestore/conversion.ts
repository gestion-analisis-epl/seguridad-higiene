import { serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore'
import type { Valores } from '@/domain/modulos'

export function aFirestore(valores: Valores): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(valores)) {
    if (v === undefined) salida[k] = null
    else salida[k] = v instanceof Date ? Timestamp.fromDate(v) : v
  }
  return salida
}

export function deFirestore(data: DocumentData): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    salida[k] = v instanceof Timestamp ? v.toDate() : v
  }
  return salida
}

export function conAuditoria(
  datos: Record<string, unknown>, uid: string, esNuevo: boolean, marca: unknown = serverTimestamp(),
): Record<string, unknown> {
  const base = { ...datos, actualizado_por: uid, actualizado_en: marca }
  return esNuevo ? { ...base, creado_por: uid, creado_en: marca } : base
}
