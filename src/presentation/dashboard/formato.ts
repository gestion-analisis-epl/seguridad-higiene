export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const num = (v: number | null, d = 2) => (v === null ? '-' : v.toFixed(d))

export const miles = (v: number) => v.toLocaleString('es-MX')

export function anioDeTexto(texto: string): number | null {
  const n = Number(texto)
  return texto !== '' && Number.isInteger(n) && n > 1999 ? n : null
}
