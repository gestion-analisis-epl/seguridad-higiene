import { limpiarTexto } from './texto'

export type ModuloAdjunto = 'accidentes' | 'capacitaciones'

export interface Adjunto {
  id: string
  colaborador_id: string
  modulo: ModuloAdjunto
  registro_id: string
  archivo_id: string
  nombre: string
  tipo: string
  tamano: number
}

export const MAX_BYTES = 10 * 1024 * 1024
export const MAX_POR_REGISTRO = 10
export const CONCURRENCIA = 3
const MAX_NOMBRE = 120

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Extensión permitida -> MIME esperado; debe coincidir con las reglas de Storage y Firestore.
const TIPOS: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: DOCX,
  xls: 'application/vnd.ms-excel',
  xlsx: XLSX,
}

export const TIPOS_MIME: readonly string[] = Array.from(new Set(Object.values(TIPOS)))
export const EXTENSIONES: readonly string[] = Object.keys(TIPOS)

const extensionDe = (nombre: string) => /\.([A-Za-z0-9]+)$/.exec(nombre)?.[1].toLowerCase() ?? ''

export function validarArchivo(a: { nombre: string; tipo: string; tamano: number }, existentes: number): string | null {
  const esperado = TIPOS[extensionDe(a.nombre)]
  if (!esperado) return 'Tipo de archivo no permitido'
  if (a.tipo !== esperado) return 'El contenido no corresponde a la extensión del archivo'
  if (!(a.tamano > 0)) return 'El archivo está vacío'
  if (a.tamano > MAX_BYTES) return 'El archivo supera 10 MB'
  if (existentes >= MAX_POR_REGISTRO) return `Máximo ${MAX_POR_REGISTRO} archivos por registro`
  return null
}

export function rutaAdjunto(p: { colaborador_id: string; modulo: ModuloAdjunto; registro_id: string; archivo_id: string }): string {
  return `adjuntos/${p.colaborador_id}/${p.modulo}/${p.registro_id}/${p.archivo_id}`
}

export function nombreSeguro(nombre: string): string {
  const limpio = limpiarTexto(nombre).replace(/[\/]+/g, '_').replace(/^\.+/, '')
  if (!limpio) return 'archivo'
  const ext = /\.[A-Za-z0-9]{1,5}$/.exec(limpio)?.[0] ?? ''
  const base = limpio.slice(0, limpio.length - ext.length)
  return base.slice(0, MAX_NOMBRE - ext.length).trimEnd() + ext
}

export const nuevoArchivoId = (): string => crypto.randomUUID().replace(/-/g, '')
