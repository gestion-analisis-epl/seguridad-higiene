import { normalizarNombre, fechaDeHoja } from './colaboradores-hoja'
import { aTextoIso, deTextoIso, fechaCalendario } from './fechas'
import { slug } from './slug'
import { limpiarLibre, limpiarTexto } from './texto'

export type DestinoEntrega = 'uniforme' | 'epp' | 'equipo'

export interface FilaEntregaHoja {
  fila: number
  id_interno: string
  articulo: string
  talla: string
  cantidad: number
  monto: number | null
  observaciones: string
  fecha_registro: Date
  fecha_entrega: Date | null
  entregado: boolean
  llave: string
}

export interface FilaRechazada { fila: number; motivo: string }

const COLUMNAS = {
  id: 'id', articulo: 'uniforme&cantidad', monto: '$montomaterial', talla: 'talla', cantidad: 'cantidad',
  observaciones: 'observaciones', registro: 'fecharegistro', entrega: 'fechaentrega',
} as const
const OBLIGATORIAS: (keyof typeof COLUMNAS)[] = ['id', 'articulo', 'cantidad', 'registro']
const ID_VALIDO = /^[0-9A-Za-z_-]{1,64}$/
const EPOCA_SHEETS = Date.UTC(1899, 11, 30)
const MS_DIA = 86_400_000

const claveEncabezado = (t: unknown) => normalizarNombre(String(t ?? '')).replace(/\s+/g, '')

// Llave del mapeo: variantes de acentos, mayúsculas y espacios caen en la misma entrada
export const claveArticulo = (articulo: string): string => slug(articulo)

// Sheets entrega fechas como número de serie; también se acepta texto DD/MM/AAAA o AAAA-MM-DD
export function fechaDeCelda(v: unknown): Date | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    const d = new Date(EPOCA_SHEETS + Math.floor(v) * MS_DIA)
    return fechaCalendario(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  if (typeof v === 'string') {
    const iso = fechaDeHoja(v)
    return iso ? deTextoIso(iso) : null
  }
  return null
}

const numeroDe = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/[$,\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

const compactar = (iso: string) => iso.replace(/-/g, '')

export interface OpcionesParseo { cantidadMaxima?: number | null }

export function parsearEntregasHoja(
  valores: unknown[][], { cantidadMaxima = null }: OpcionesParseo = {},
): { filas: FilaEntregaHoja[]; rechazadas: FilaRechazada[] } {
  if (valores.length === 0) return { filas: [], rechazadas: [] }
  const columnas = valores[0].map(claveEncabezado)
  const indice = (c: keyof typeof COLUMNAS) => columnas.indexOf(claveEncabezado(COLUMNAS[c]))
  const faltan = OBLIGATORIAS.filter((c) => indice(c) < 0)
  if (faltan.length) throw new Error(`La hoja de entregas no tiene las columnas: ${faltan.map((c) => COLUMNAS[c]).join(', ')}`)

  const filas: FilaEntregaHoja[] = []
  const rechazadas: FilaRechazada[] = []
  const repeticiones = new Map<string, number>()
  valores.slice(1).forEach((celdas, i) => {
    const fila = i + 2
    if (!celdas.some((c) => String(c ?? '').trim())) return
    const celda = (c: keyof typeof COLUMNAS) => (indice(c) < 0 ? undefined : celdas[indice(c)])
    const rechazar = (motivo: string) => { rechazadas.push({ fila, motivo }) }

    const id = limpiarTexto(String(celda('id') ?? ''))
    const articulo = limpiarTexto(String(celda('articulo') ?? ''))
    const cantidad = numeroDe(celda('cantidad'))
    const registro = fechaDeCelda(celda('registro'))
    if (!ID_VALIDO.test(id)) return rechazar('Falta el id del colaborador')
    if (!articulo) return rechazar('Falta el artículo')
    if (cantidad === null) return rechazar('La cantidad no es un número')
    if (cantidad < 0) return rechazar('La cantidad es negativa')
    if (cantidadMaxima !== null && cantidad > cantidadMaxima) return rechazar(`La cantidad supera el máximo (${cantidadMaxima})`)
    if (!registro) return rechazar('Falta la fecha de registro')

    const base = `${id}_${claveArticulo(articulo) || 'articulo'}_${compactar(aTextoIso(registro))}`
    const orden = (repeticiones.get(base) ?? 0) + 1
    repeticiones.set(base, orden)
    const entrega = fechaDeCelda(celda('entrega'))
    const talla = limpiarTexto(String(celda('talla') ?? ''))
    filas.push({
      fila, id_interno: id, articulo, talla, cantidad, monto: numeroDe(celda('monto')),
      observaciones: limpiarLibre(String(celda('observaciones') ?? '')),
      fecha_registro: registro, fecha_entrega: entrega, entregado: cantidad > 0 && entrega !== null,
      llave: orden === 1 ? base : `${base}_${orden}`,
    })
  })
  return { filas, rechazadas }
}

export const DESTINOS_ENTREGA: DestinoEntrega[] = ['uniforme', 'epp', 'equipo']
export const ETIQUETA_DESTINO: Record<DestinoEntrega, string> = { uniforme: 'Uniforme', epp: 'EPP', equipo: 'Equipo de oficinas' }
export const CATALOGO_DE_DESTINO: Record<DestinoEntrega, string> = { uniforme: 'prendas', epp: 'tipos_epp', equipo: 'tipos_equipo' }
