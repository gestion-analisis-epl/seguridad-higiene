import type { Opcion } from '@/domain/modulos'

export function etiquetaDe(opciones: Opcion[], valor: unknown): string {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? String(valor ?? '-')
}
