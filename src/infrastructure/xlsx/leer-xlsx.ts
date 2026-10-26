import type { HojaLeida } from '@/domain/dotacion-excel'

const utf8 = new TextDecoder('utf-8')

async function descomprimir(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

// Lee el directorio central del zip y devuelve el contenido de cada archivo
async function leerZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let fin = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) { fin = i; break }
  }
  if (fin < 0) throw new Error('El archivo no es un Excel válido (.xlsx)')
  const total = vista.getUint16(fin + 10, true)
  let pos = vista.getUint32(fin + 16, true)
  const archivos = new Map<string, Uint8Array>()
  for (let n = 0; n < total; n++) {
    if (vista.getUint32(pos, true) !== 0x02014b50) throw new Error('El archivo está dañado')
    const metodo = vista.getUint16(pos + 10, true)
    const tamano = vista.getUint32(pos + 20, true)
    const largoNombre = vista.getUint16(pos + 28, true)
    const largoExtra = vista.getUint16(pos + 30, true)
    const largoComentario = vista.getUint16(pos + 32, true)
    const local = vista.getUint32(pos + 42, true)
    const nombre = utf8.decode(bytes.subarray(pos + 46, pos + 46 + largoNombre))
    const inicio = local + 30 + vista.getUint16(local + 26, true) + vista.getUint16(local + 28, true)
    const datos = bytes.subarray(inicio, inicio + tamano)
    if (metodo === 0) archivos.set(nombre, datos)
    else if (metodo === 8) archivos.set(nombre, await descomprimir(datos))
    pos += 46 + largoNombre + largoExtra + largoComentario
  }
  return archivos
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decodificar = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENTIDADES[e] ?? m
})
const textoDe = (xml: string) => decodificar(Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) => m[1]).join(''))
const atributo = (etiqueta: string, nombre: string) => new RegExp(`\\s${nombre}="([^"]*)"`).exec(etiqueta)?.[1]

function columna(ref: string): number {
  return Array.from(/^[A-Z]+/.exec(ref)?.[0] ?? '').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

// Relleno RGB (AARRGGBB en mayúsculas) de cada estilo de celda; '' sin relleno sólido RGB
function leerRellenos(xml: string): string[] {
  const rellenos = Array.from((/<fills\b[^>]*>([\s\S]*?)<\/fills>/.exec(xml)?.[1] ?? '').matchAll(/<fill\b[^>]*>([\s\S]*?)<\/fill>/g),
    (m) => /<patternFill\b[^>]*patternType="solid"/.test(m[1]) ? (atributo(/<fgColor\b[^>]*>/.exec(m[1])?.[0] ?? '', 'rgb') ?? '').toUpperCase() : '')
  const estilos = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? ''
  return Array.from(estilos.matchAll(/<xf\b[^>]*>/g), (m) => rellenos[Number(atributo(m[0], 'fillId') ?? 0)] ?? '')
}

function leerHoja(xml: string, compartidas: string[], rellenos: string[]): { filas: string[][]; colores: string[][] } {
  const filas: string[][] = []
  const colores: string[][] = []
  for (const fila of Array.from(xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g))) {
    const numero = Number(atributo(fila[0], 'r')) - 1
    for (const celda of Array.from((fila[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g))) {
      const ref = atributo(celda[1], 'r')
      const cuerpo = celda[2] ?? ''
      if (!ref || !cuerpo) continue
      const tipo = atributo(celda[1], 't')
      const valor = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1]
      const texto = tipo === 'inlineStr' ? textoDe(cuerpo) : valor === undefined ? '' : tipo === 's' ? compartidas[Number(valor)] ?? '' : decodificar(valor)
      if (texto === '') continue
      const f = (filas[numero] ??= [])
      const k = (colores[numero] ??= [])
      const c = columna(ref)
      for (let i = f.length; i < c; i++) f[i] = ''
      for (let i = k.length; i < c; i++) k[i] = ''
      f[c] = texto
      k[c] = rellenos[Number(atributo(celda[1], 's') ?? -1)] ?? ''
    }
  }
  const largo = filas.length
  return {
    filas: Array.from({ length: largo }, (_, i) => filas[i] ?? []),
    colores: Array.from({ length: largo }, (_, i) => colores[i] ?? []),
  }
}

// Hojas visibles con su contenido como texto, en el orden del libro
export async function leerXlsx(contenido: ArrayBuffer | Uint8Array): Promise<HojaLeida[]> {
  const archivos = await leerZip(contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido))
  const texto = (ruta: string) => { const a = archivos.get(ruta); return a ? utf8.decode(a) : '' }
  const libro = texto('xl/workbook.xml')
  if (!libro) throw new Error('El archivo no es un Excel válido (.xlsx)')
  const destinos = new Map(Array.from(texto('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g),
    (m) => [atributo(m[0], 'Id') ?? '', atributo(m[0], 'Target') ?? ''] as const))
  const compartidas = Array.from(texto('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g), (m) => textoDe(m[1]))
  const rellenos = leerRellenos(texto('xl/styles.xml'))
  const hojas: HojaLeida[] = []
  for (const h of Array.from(libro.matchAll(/<sheet\b[^>]*>/g))) {
    if (atributo(h[0], 'state') && atributo(h[0], 'state') !== 'visible') continue
    const destino = destinos.get(atributo(h[0], 'r:id') ?? '')
    const ruta = destino ? `xl/${destino.replace(/^\/?(xl\/)?/, '')}` : ''
    if (!archivos.has(ruta)) continue
    const { filas, colores } = leerHoja(texto(ruta), compartidas, rellenos)
    hojas.push({ nombre: decodificar(atributo(h[0], 'name') ?? ''), filas, ...(colores.some((f) => f.some(Boolean)) ? { colores } : {}) })
  }
  return hojas
}
