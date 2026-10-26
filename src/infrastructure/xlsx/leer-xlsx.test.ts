import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { leerXlsx } from './leer-xlsx'

// Zip mínimo con un archivo por entrada, comprimido o guardado tal cual
function crearZip(archivos: Record<string, string>, comprimir = true): Uint8Array {
  const partes: Buffer[] = []
  const central: Buffer[] = []
  let desplazamiento = 0
  for (const [nombre, texto] of Object.entries(archivos)) {
    const nombreB = Buffer.from(nombre)
    const datos = Buffer.from(texto)
    const guardado = comprimir ? deflateRawSync(datos) : datos
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(comprimir ? 8 : 0, 8)
    local.writeUInt32LE(guardado.length, 18)
    local.writeUInt32LE(datos.length, 22)
    local.writeUInt16LE(nombreB.length, 26)
    const entrada = Buffer.alloc(46)
    entrada.writeUInt32LE(0x02014b50, 0)
    entrada.writeUInt16LE(comprimir ? 8 : 0, 10)
    entrada.writeUInt32LE(guardado.length, 20)
    entrada.writeUInt32LE(datos.length, 24)
    entrada.writeUInt16LE(nombreB.length, 28)
    entrada.writeUInt32LE(desplazamiento, 42)
    partes.push(local, nombreB, guardado)
    central.push(entrada, nombreB)
    desplazamiento += 30 + nombreB.length + guardado.length
  }
  const directorio = Buffer.concat(central)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(central.length / 2, 10)
  fin.writeUInt32LE(directorio.length, 12)
  fin.writeUInt32LE(desplazamiento, 16)
  return new Uint8Array(Buffer.concat([...partes, directorio, fin]))
}

const LIBRO = `<workbook><sheets>
  <sheet name="MKTQRO AGS" sheetId="1" r:id="rId1"/>
  <sheet name="Oculta" sheetId="2" state="hidden" r:id="rId2"/>
  <sheet name="Datos &amp; más" sheetId="3" r:id="rId3"/>
</sheets></workbook>`
const RELS = `<Relationships>
  <Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="x" Target="/xl/worksheets/sheet3.xml"/>
</Relationships>`
const COMPARTIDAS = '<sst><si><t>Jefe de cuadrilla</t></si><si><r><t>Opera</t></r><r><t>ciones</t></r></si></sst>'
const HOJA1 = `<worksheet><sheetData>
  <row r="2"><c r="B2" t="s"><v>0</v></c><c r="D2"><v>1</v></c></row>
  <row r="4"><c r="C4" t="s"><v>1</v></c><c r="E4" t="inlineStr"><is><t>x &lt; y</t></is></c></row>
</sheetData></worksheet>`
const HOJA3 = '<worksheet><sheetData><row r="1"><c r="A1"><v>7</v></c></row></sheetData></worksheet>'

describe('leerXlsx', () => {
  const archivos = {
    'xl/workbook.xml': LIBRO, 'xl/_rels/workbook.xml.rels': RELS, 'xl/sharedStrings.xml': COMPARTIDAS,
    'xl/worksheets/sheet1.xml': HOJA1, 'xl/worksheets/sheet2.xml': HOJA1, 'xl/worksheets/sheet3.xml': HOJA3,
  }
  it('devuelve las hojas visibles con sus celdas en la posición que les toca', async () => {
    const hojas = await leerXlsx(crearZip(archivos))
    expect(hojas.map((h) => h.nombre)).toEqual(['MKTQRO AGS', 'Datos & más'])
    expect(hojas[0].filas[1]).toEqual(['', 'Jefe de cuadrilla', '', '1'])
    expect(hojas[0].filas[3]).toEqual(['', '', 'Operaciones', '', 'x < y'])
    expect(hojas[0].filas[0]).toEqual([])
    expect(hojas[1].filas[0]).toEqual(['7'])
  })
  it('lee también archivos guardados sin comprimir', async () => {
    expect((await leerXlsx(crearZip(archivos, false)))[0].filas[1][1]).toBe('Jefe de cuadrilla')
  })
  it('rechaza lo que no es un xlsx', async () => {
    await expect(leerXlsx(new TextEncoder().encode('hola'))).rejects.toThrow('Excel válido')
    await expect(leerXlsx(crearZip({ 'otra.txt': 'x' }))).rejects.toThrow('Excel válido')
  })
})

describe('leerXlsx con colores', () => {
  const LIBRO_C = '<workbook><sheets><sheet name="H" sheetId="1" r:id="rId1"/></sheets></workbook>'
  const RELS_C = '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>'
  const ESTILOS = `<styleSheet><fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF92D050"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="ffff0000"/></patternFill></fill>
  </fills>
  <cellStyleXfs count="1"><xf fillId="2"/></cellStyleXfs>
  <cellXfs count="3"><xf fillId="0"/><xf fillId="2" applyFill="1"/><xf fillId="3"/></cellXfs></styleSheet>`
  const HOJA_C = `<worksheet><sheetData><row r="2">
    <c r="B2" s="1" t="inlineStr"><is><t>SI</t></is></c>
    <c r="C2" s="2" t="inlineStr"><is><t>NO</t></is></c>
    <c r="D2" s="0" t="inlineStr"><is><t>x</t></is></c></row></sheetData></worksheet>`
  const base = { 'xl/workbook.xml': LIBRO_C, 'xl/_rels/workbook.xml.rels': RELS_C, 'xl/worksheets/sheet1.xml': HOJA_C }

  it('devuelve el relleno RGB de cada celda en una matriz paralela a filas', async () => {
    const [hoja] = await leerXlsx(crearZip({ ...base, 'xl/styles.xml': ESTILOS }))
    expect(hoja.filas).toEqual([[], ['', 'SI', 'NO', 'x']])
    expect(hoja.colores).toEqual([[], ['', 'FF92D050', 'FFFF0000', '']])
  })
  it('sin estilos con relleno no agrega colores', async () => {
    const [hoja] = await leerXlsx(crearZip(base))
    expect(hoja.colores).toBeUndefined()
  })
})
