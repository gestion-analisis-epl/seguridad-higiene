export interface OpcionSeleccion { valor: string; etiqueta: string }

export interface TextosResumen { todos: string; ninguno: string }

export const plegar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const todos = (opciones: OpcionSeleccion[]) => opciones.map((o) => o.valor)

export const alternar = (seleccion: string[], valor: string) =>
  seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]

export function esTodo(opciones: OpcionSeleccion[], seleccion: string[]): boolean {
  return opciones.length > 0 && opciones.every((o) => seleccion.includes(o.valor))
}

export function resumenSeleccion(
  opciones: OpcionSeleccion[], seleccion: string[], textos: TextosResumen,
): string {
  if (esTodo(opciones, seleccion)) return textos.todos
  const marcadas = opciones.filter((o) => seleccion.includes(o.valor))
  if (marcadas.length === 0) return textos.ninguno
  return marcadas.length === 1 ? marcadas[0].etiqueta : `${marcadas.length} seleccionadas`
}

export function filtrarOpciones(opciones: OpcionSeleccion[], texto: string): OpcionSeleccion[] {
  const q = plegar(texto.trim())
  return q ? opciones.filter((o) => plegar(o.etiqueta).includes(q)) : opciones
}
