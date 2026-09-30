import { formatearValor, type ModuloDef, type Opcion, type Valor } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'

const tiempo = (v: unknown) => (v instanceof Date ? v.getTime() : null)

function porFechaDesc(a: Registro, b: Registro): number {
  const x = tiempo(a.fecha)
  const y = tiempo(b.fecha)
  if (x === y) return 0
  if (x === null) return 1
  if (y === null) return -1
  return y - x
}

export function ordenarRegistros(def: ModuloDef, registros: Registro[], opciones: Record<string, Opcion[]>): Registro[] {
  if (def.columnas.includes('fecha')) return [...registros].sort(porFechaDesc)
  const campo = def.campos.find((c) => c.nombre === def.columnas[0])
  if (!campo) return [...registros]
  const etiqueta = (r: Registro) => formatearValor(campo, r[campo.nombre] as Valor, opciones[campo.nombre] ?? [])
  return [...registros].sort((a, b) => etiqueta(a).localeCompare(etiqueta(b), 'es'))
}
