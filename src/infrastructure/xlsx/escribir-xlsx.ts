export interface ColumnaExcel { encabezado: string; ancho: number }
export type CeldaExcel = string | number | Date | null
export interface HojaExcel { nombre: string; columnas: ColumnaExcel[]; filas: CeldaExcel[][] }

const MAX_TEXTO = 32_767
const EPOCA_EXCEL = Date.UTC(1899, 11, 30)
const MS_DIA = 86_400_000
const FECHA_DOS = 0x0021
const ESPACIO_NOMBRES = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const RELACIONES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Serie de Excel del día calendario, sin la hora
export const serieExcel = (fecha: Date): number => Math.floor((fecha.getTime() - EPOCA_EXCEL) / MS_DIA)

export function nombreHoja(texto: string): string {
  return texto.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Hoja1'
}

const escapar = (t: string): string => t
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function letra(indice: number): string {
  let s = ''
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

const texto = (ref: string, valor: string, estilo = ''): string =>
  `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escapar(valor.slice(0, MAX_TEXTO))}</t></is></c>`

function celda(valor: CeldaExcel, ref: string): string {
  if (valor === null || valor === '') return ''
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? '' : `<c r="${ref}" s="2"><v>${serieExcel(valor)}</v></c>`
  if (typeof valor === 'number') return Number.isFinite(valor) ? `<c r="${ref}"><v>${valor}</v></c>` : ''
  return texto(ref, valor)
}

// Encabezado en negrita y fijo, autofiltro sobre todo el rango y anchos por columna
export function xmlDeHoja({ columnas, filas }: HojaExcel): string {
  const encabezado = `<row r="1">${columnas.map((c, i) => texto(`${letra(i)}1`, c.encabezado, ' s="1"')).join('')}</row>`
  const cuerpo = filas.map((fila, r) => `<row r="${r + 2}">${fila.map((v, i) => celda(v, `${letra(i)}${r + 2}`)).join('')}</row>`).join('')
  const anchos = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho}" customWidth="1"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ESPACIO_NOMBRES}">`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${anchos}</cols><sheetData>${encabezado}${cuerpo}</sheetData><autoFilter ref="A1:${letra(columnas.length - 1)}${filas.length + 1}"/></worksheet>`
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ESPACIO_NOMBRES}">`
  + '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

const TIPOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'

const RELACIONES_RAIZ = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + `<Relationship Id="rId1" Type="${RELACIONES}/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const RELACIONES_LIBRO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + `<Relationship Id="rId1" Type="${RELACIONES}/worksheet" Target="worksheets/sheet1.xml"/>`
  + `<Relationship Id="rId2" Type="${RELACIONES}/styles" Target="styles.xml"/></Relationships>`

const unir = (partes: Uint8Array[]): Uint8Array => {
  const salida = new Uint8Array(partes.reduce((s, p) => s + p.length, 0))
  let pos = 0
  for (const p of partes) { salida.set(p, pos); pos += p.length }
  return salida
}

// Zip sin comprimir: basta para un xlsx y evita depender de CompressionStream
function crearZip(archivos: [string, string][]): Uint8Array {
  const codificar = new TextEncoder()
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let desplazamiento = 0
  for (const [nombre, contenido] of archivos) {
    const n = codificar.encode(nombre)
    const d = codificar.encode(contenido)
    const crc = crc32(d)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)
    local.setUint16(12, FECHA_DOS, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, d.length, true)
    local.setUint32(22, d.length, true)
    local.setUint16(26, n.length, true)
    const entrada = new DataView(new ArrayBuffer(46))
    entrada.setUint32(0, 0x02014b50, true)
    entrada.setUint16(4, 20, true)
    entrada.setUint16(6, 20, true)
    entrada.setUint16(8, 0x0800, true)
    entrada.setUint16(14, FECHA_DOS, true)
    entrada.setUint32(16, crc, true)
    entrada.setUint32(20, d.length, true)
    entrada.setUint32(24, d.length, true)
    entrada.setUint16(28, n.length, true)
    entrada.setUint32(42, desplazamiento, true)
    partes.push(new Uint8Array(local.buffer), n, d)
    central.push(new Uint8Array(entrada.buffer), n)
    desplazamiento += 30 + n.length + d.length
  }
  const directorio = unir(central)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, directorio.length, true)
  fin.setUint32(16, desplazamiento, true)
  return unir([...partes, directorio, new Uint8Array(fin.buffer)])
}

export function escribirXlsx(hoja: HojaExcel): Uint8Array {
  if (hoja.columnas.length === 0) throw new Error('El archivo necesita al menos una columna')
  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ESPACIO_NOMBRES}" xmlns:r="${RELACIONES}">`
    + `<sheets><sheet name="${escapar(nombreHoja(hoja.nombre))}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  return crearZip([
    ['[Content_Types].xml', TIPOS],
    ['_rels/.rels', RELACIONES_RAIZ],
    ['xl/workbook.xml', libro],
    ['xl/_rels/workbook.xml.rels', RELACIONES_LIBRO],
    ['xl/styles.xml', ESTILOS],
    ['xl/worksheets/sheet1.xml', xmlDeHoja(hoja)],
  ])
}
