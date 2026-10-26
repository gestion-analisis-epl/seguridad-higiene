import { normalizarNombre } from './colaboradores-hoja'
import type { HojaLeida } from './dotacion-excel'
import { aTextoIso, deTextoIso, fechaCalendario } from './fechas'
import { slug } from './slug'

export interface FilaCapacitacionExcel {
  hoja: string
  fila: number
  nombre: string
  norma: string
  cumple: boolean
  fecha: string | null
  vencimiento: string | null
}

export interface ResultadoParseo { filas: FilaCapacitacionExcel[]; hojasSinFilas: string[] }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const ENCABEZADOS = new Set(['capacitacion', 'curso', 'norma', 'nombre', 'personal', 'fecha', 'vigencia', 'vencimiento', 'cumplimiento'])
// Error de captura conocido en el archivo de seguimiento
const ALIAS_NORMA: Record<string, string> = { 'nom-009-stps-2012': 'nom-009-stps-2011' }
const EPOCA_EXCEL = Date.UTC(1899, 11, 30)
const MS_DIA = 86_400_000

export const MAX_FILAS = 5000

export function claveNorma(texto: string): string {
  const s = slug(texto)
  return ALIAS_NORMA[s] ?? s
}

function fechaReal(anio: number, mes: number, dia: number): Date | null {
  const f = fechaCalendario(anio, mes, dia)
  return f.getUTCMonth() + 1 === mes && f.getUTCDate() === dia ? f : null
}

// Acepta serie de Excel (1954 a 2119), DD/MM/AAAA con punto final opcional e ISO
export function fechaDeCelda(texto: string): Date | null {
  const t = texto.trim().replace(/\.$/, '')
  if (/^\d+(\.\d+)?$/.test(t)) {
    const serie = Math.floor(Number(t))
    if (serie < 20_000 || serie > 80_000) return null
    const d = new Date(EPOCA_EXCEL + serie * MS_DIA)
    return fechaCalendario(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (dmy) return fechaReal(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  return iso ? fechaReal(Number(iso[1]), Number(iso[2]), Number(iso[3])) : null
}

function canales(rgb: string): number[] | null {
  const m = /^(?:FF)?([0-9A-F]{6})$/i.exec(rgb)
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null
}

export const esVerde = (rgb: string): boolean => {
  const c = canales(rgb)
  return !!c && c[1] > c[0] + 30 && c[1] > c[2] + 30
}

export const esRojo = (rgb: string): boolean => {
  const c = canales(rgb)
  return !!c && c[0] > c[1] + 60 && c[0] > c[2] + 60
}

const conRelleno = (rgb: string): boolean => !!rgb && !(canales(rgb)?.every((v) => v >= 240))

// Verde en SI cumple; cualquier otro relleno no; sin relleno decide la fecha
export function cumpleDe(colorSi: string, colorNo: string, fecha: Date | null): boolean {
  if (esVerde(colorSi)) return true
  if (conRelleno(colorSi) || conRelleno(colorNo)) return false
  return fecha !== null
}

const masUnAnio = (f: Date): Date => {
  const d = new Date(f)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d
}

interface Columnas { nombre: number; norma: number; fecha: number; vigencia: number }

// La fila de encabezado trae nombre, fecha de ingreso y curso; fecha y vigencia son -1 si faltan
function columnasDe(fila: string[]): Columnas | null {
  const t = fila.map((c) => normalizarNombre(c ?? ''))
  const nombre = t.findIndex((c) => c === 'nombre' || c === 'personal')
  const ingreso = t.indexOf('fecha de ingreso')
  if (nombre < 0 || ingreso < 0) return null
  const norma = t.findIndex((c, i) => i > ingreso && (c === 'curso' || c === 'norma'))
  if (norma < 0) return null
  const fecha = t.findIndex((c, i) => i > norma && c === 'fecha')
  const vigencia = fecha < 0 ? -1 : t.findIndex((c, i) => i > fecha && (c === 'vigencia' || c === 'vencimiento'))
  return { nombre, norma, fecha, vigencia }
}

const mesDe = (texto: string): number => {
  const t = normalizarNombre(texto)
  return MESES.findIndex((m) => t.startsWith(m)) + 1
}

const menor = (a: number[], b: number[]): boolean => {
  const i = a.findIndex((v, k) => v !== b[k])
  return i >= 0 && a[i] < b[i]
}

export function parsearCapacitacionesExcel(hojas: HojaLeida[]): ResultadoParseo {
  const ganadoras = new Map<string, { orden: number[]; hoja: number; fila: FilaCapacitacionExcel }>()
  const hojasSinFilas: string[] = []
  for (const [h, hoja] of hojas.entries()) {
    let columnas: Columnas | null = null
    let conEncabezado = false
    let mes = 0
    let bloque = 0
    let leidas = 0
    for (let r = 0; r < hoja.filas.length; r++) {
      const fila = hoja.filas[r]
      const titulo = mesDe(fila[0] ?? '')
      if (titulo > 0) { mes = titulo; bloque++; continue }
      const encabezado = columnasDe(fila)
      if (encabezado) { columnas = encabezado; conEncabezado = true; bloque++; continue }
      if (!columnas) continue
      const nombre = (fila[columnas.nombre] ?? '').trim()
      const norma = (fila[columnas.norma] ?? '').trim()
      if (!nombre || !norma || ENCABEZADOS.has(normalizarNombre(nombre)) || ENCABEZADOS.has(normalizarNombre(norma))) continue
      leidas++
      let si = -1
      for (let i = columnas.norma + 1; i < fila.length - 1; i++) {
        if ((fila[i] ?? '').trim().toUpperCase() === 'SI' && (fila[i + 1] ?? '').trim().toUpperCase() === 'NO') { si = i; break }
      }
      const colorSi = si >= 0 ? hoja.colores?.[r]?.[si] ?? '' : ''
      const colorNo = si >= 0 ? hoja.colores?.[r]?.[si + 1] ?? '' : ''
      const fecha = columnas.fecha >= 0 ? fechaDeCelda(fila[columnas.fecha] ?? '') : null
      const vigencia = columnas.vigencia >= 0 ? fechaDeCelda(fila[columnas.vigencia] ?? '') : null
      const vencimiento = vigencia ?? (fecha ? masUnAnio(fecha) : null)
      const registro: FilaCapacitacionExcel = {
        hoja: hoja.nombre, fila: r + 1, nombre, norma, cumple: cumpleDe(colorSi, colorNo, fecha),
        fecha: fecha ? aTextoIso(fecha) : null, vencimiento: vencimiento ? aTextoIso(vencimiento) : null,
      }
      const clave = `${normalizarNombre(nombre)}|${claveNorma(norma)}`
      const previa = ganadoras.get(clave)
      const orden = [mes, bloque, r]
      // En la misma hoja manda la posición; el mes solo desempata entre hojas distintas
      const pierde = previa && (previa.hoja === h ? menor(orden.slice(1), previa.orden.slice(1)) : menor(orden, previa.orden))
      if (!previa || !pierde) ganadoras.set(clave, { orden, hoja: h, fila: registro })
    }
    if (conEncabezado && leidas === 0) hojasSinFilas.push(hoja.nombre)
  }
  return { filas: Array.from(ganadoras.values(), (g) => g.fila), hojasSinFilas }
}

const esFechaIso = (v: unknown): boolean => v === null || (typeof v === 'string' && aTextoIso(deTextoIso(v)) === v)
const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 200

// Valida lo que llega del navegador antes de tocar Firestore
export function validarFilas(entrada: unknown): { filas: FilaCapacitacionExcel[] } | { error: string } {
  if (!Array.isArray(entrada) || entrada.length === 0) return { error: 'No hay filas para importar' }
  if (entrada.length > MAX_FILAS) return { error: `Demasiadas filas (máximo ${MAX_FILAS})` }
  const filas: FilaCapacitacionExcel[] = []
  for (const x of entrada) {
    const r = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
    if (!r || !esTexto(r.hoja) || !esTexto(r.nombre) || !esTexto(r.norma) || typeof r.cumple !== 'boolean'
      || !Number.isInteger(r.fila) || !esFechaIso(r.fecha) || !esFechaIso(r.vencimiento)) return { error: 'Hay filas con formato inválido' }
    filas.push({
      hoja: r.hoja, fila: r.fila as number, nombre: r.nombre.trim(), norma: r.norma.trim(), cumple: r.cumple,
      fecha: r.fecha as string | null, vencimiento: r.vencimiento as string | null,
    })
  }
  return { filas }
}
