import { normalizarNombre } from './colaboradores-hoja'
import type { HojaLeida } from './dotacion-excel'

export interface FilaNormasExcel {
  hoja: string
  fila: number
  nombre: string
  // Encabezado de cada norma del archivo; true si es obligatoria (X)
  normas: Record<string, boolean>
}

export interface ResultadoNormasExcel {
  filas: FilaNormasExcel[]
  normas: string[]
  rechazadas: { hoja: string; fila: number; motivo: string }[]
}

export const MAX_FILAS_NORMAS = 5000

const COLUMNAS_DATOS = new Set(['colaborador', 'nombre', 'personal', 'empresa', 'ciudad', 'area', 'puesto', 'linea de negocio', 'departamento'])
const NO_APLICA = new Set(['', 'n/a', 'na', '-'])

// La fila de encabezado trae "Colaborador" y después una columna por norma
export function parsearNormasObligatoriasExcel(hojas: HojaLeida[]): ResultadoNormasExcel {
  const filas: FilaNormasExcel[] = []
  const rechazadas: ResultadoNormasExcel['rechazadas'] = []
  const normas: string[] = []
  for (const hoja of hojas) {
    const h = hoja.filas.findIndex((f) => f.some((c) => ['colaborador', 'nombre'].includes(normalizarNombre(c ?? ''))))
    if (h < 0) continue
    const encabezado = hoja.filas[h].map((c) => (c ?? '').trim())
    const columnaNombre = encabezado.findIndex((c) => ['colaborador', 'nombre'].includes(normalizarNombre(c)))
    const columnasNorma = encabezado.map((c, i) => ({ c, i })).filter(({ c }) => c !== '' && !COLUMNAS_DATOS.has(normalizarNombre(c)))
    for (const { c } of columnasNorma) if (!normas.includes(c)) normas.push(c)
    for (let r = h + 1; r < hoja.filas.length; r++) {
      const fila = hoja.filas[r]
      const nombre = (fila[columnaNombre] ?? '').trim()
      if (!nombre) continue
      const marcas: Record<string, boolean> = {}
      let invalida = ''
      for (const { c, i } of columnasNorma) {
        const v = (fila[i] ?? '').trim()
        if (v.toUpperCase() === 'X') marcas[c] = true
        else if (NO_APLICA.has(v.toLowerCase())) marcas[c] = false
        else invalida = `"${v}" en ${c}; usa X o N/A`
      }
      if (invalida) rechazadas.push({ hoja: hoja.nombre, fila: r + 1, motivo: invalida })
      else filas.push({ hoja: hoja.nombre, fila: r + 1, nombre, normas: marcas })
    }
  }
  return { filas, normas, rechazadas }
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 200

// Valida lo que llega del navegador antes de tocar Firestore
export function validarFilasNormas(entrada: unknown): { filas: FilaNormasExcel[] } | { error: string } {
  if (!Array.isArray(entrada) || entrada.length === 0) return { error: 'No hay filas para importar' }
  if (entrada.length > MAX_FILAS_NORMAS) return { error: `Demasiadas filas (máximo ${MAX_FILAS_NORMAS})` }
  const filas: FilaNormasExcel[] = []
  for (const x of entrada) {
    const r = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
    const n = (r?.normas && typeof r.normas === 'object' && !Array.isArray(r.normas) ? r.normas : null) as Record<string, unknown> | null
    if (!r || !n || !esTexto(r.hoja) || !esTexto(r.nombre) || !Number.isInteger(r.fila)
      || Object.keys(n).length > 50 || Object.entries(n).some(([k, v]) => !esTexto(k) || typeof v !== 'boolean')) {
      return { error: 'Hay filas con formato inválido' }
    }
    filas.push({ hoja: r.hoja, fila: r.fila as number, nombre: r.nombre.trim(), normas: n as Record<string, boolean> })
  }
  return { filas }
}
