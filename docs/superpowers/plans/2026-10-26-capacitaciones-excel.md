# Importar capacitaciones desde el Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla `/admin/capacitaciones-excel` que lee el Excel de seguimiento en el navegador, simula y aplica la actualización de capacitaciones en Firestore.

**Architecture:** `leerXlsx` se extiende para devolver el color de relleno de cada celda. Un parser puro convierte las hojas en filas normalizadas (bloque más reciente por persona y norma). Un módulo de aplicación puro, con almacén inyectable, resuelve colaboradores y crea o actualiza capacitaciones. Un endpoint protegido (`administrar`) recibe las filas ya parseadas, igual que la importación de reglas de EPP.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Firebase Admin, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-capacitaciones-excel-design.md`

## Global Constraints

- **No hacer `git commit` ni `git push` en ningún paso**: el usuario revisa y prueba primero. Donde la plantilla pediría commit, el paso se omite.
- Comentarios de código de **una sola línea**, solo si aportan; sin párrafos.
- Nombres, textos de interfaz y mensajes en español, como el resto del repo.
- Fechas viajan entre navegador y servidor como texto ISO `AAAA-MM-DD`; en el servidor se convierten con `deTextoIso` (mediodía UTC).
- Sin dependencias nuevas; el lector de xlsx sigue siendo `src/infrastructure/xlsx/leer-xlsx.ts`.
- Antes de tocar APIs de Next (rutas, páginas) seguir el patrón de `src/app/api/entregas/sincronizar/route.ts` y `src/app/(app)/admin/entregas-hoja/page.tsx`; `AGENTS.md` avisa que esta versión de Next difiere de lo conocido.
- Verificación al final de cada tarea: `npx vitest run <archivo>` y `npx tsc --noEmit` sin errores.
- Ejecución con subagentes: máximo 4 (tareas 1-2, tarea 3, tareas 4-5; la tarea 6 la hace quien coordina).

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/domain/dotacion-excel.ts` (modifica) | `HojaLeida` suma `colores?` |
| `src/infrastructure/xlsx/leer-xlsx.ts` (modifica) | Lee rellenos de `xl/styles.xml` y los devuelve por celda |
| `src/infrastructure/xlsx/leer-xlsx.test.ts` (modifica) | Pruebas de colores |
| `src/domain/capacitaciones-excel.ts` (crea) | Parser puro, fechas, colores, `claveNorma`, `validarFilas` |
| `src/domain/capacitaciones-excel.test.ts` (crea) | Pruebas del parser |
| `src/application/capacitaciones-sync.ts` (crea) | Sincronización pura con almacén |
| `src/application/capacitaciones-sync.test.ts` (crea) | Pruebas con almacén en memoria |
| `src/infrastructure/servidor/almacen-capacitaciones.ts` (crea) | Almacén sobre Firestore Admin |
| `src/app/api/capacitaciones/importar/route.ts` (crea) | Endpoint `POST` |
| `src/infrastructure/api/capacitaciones.ts` (crea) | Cliente del endpoint |
| `src/presentation/capacitaciones/ImportarCapacitaciones.tsx` (crea) | Pantalla: archivo, simular, aplicar, reporte |
| `src/app/(app)/admin/capacitaciones-excel/page.tsx` (crea) | Página con `RequireAcceso` |
| `src/presentation/navegacion/enlaces.ts` (modifica) | Enlace en Administración |

---

### Task 1: Colores de relleno en `leerXlsx`

**Files:**
- Modify: `src/domain/dotacion-excel.ts:9`
- Modify: `src/infrastructure/xlsx/leer-xlsx.ts`
- Test: `src/infrastructure/xlsx/leer-xlsx.test.ts`

**Interfaces:**
- Produces: `HojaLeida = { nombre: string; filas: string[][]; colores?: string[][] }`. `colores[fila][columna]` es el relleno `AARRGGBB` en mayúsculas de la celda, o `''`. Solo está presente si alguna celda con texto tiene relleno RGB; mismas dimensiones que `filas`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `src/infrastructure/xlsx/leer-xlsx.test.ts` (reutiliza `crearZip` del mismo archivo):

```ts
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
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/infrastructure/xlsx/leer-xlsx.test.ts`
Expected: FAIL en `devuelve el relleno RGB...` (`hoja.colores` es `undefined`).

- [ ] **Step 3: Implementar**

En `src/domain/dotacion-excel.ts` línea 9 reemplazar por:

```ts
export interface HojaLeida { nombre: string; filas: string[][]; colores?: string[][] }
```

En `src/infrastructure/xlsx/leer-xlsx.ts`, agregar antes de `function leerHoja`:

```ts
// Relleno RGB (AARRGGBB en mayúsculas) de cada estilo de celda; '' sin relleno sólido RGB
function leerRellenos(xml: string): string[] {
  const rellenos = Array.from((/<fills\b[^>]*>([\s\S]*?)<\/fills>/.exec(xml)?.[1] ?? '').matchAll(/<fill\b[^>]*>([\s\S]*?)<\/fill>/g),
    (m) => /<patternFill\b[^>]*patternType="solid"/.test(m[1]) ? (atributo(/<fgColor\b[^>]*>/.exec(m[1])?.[0] ?? '', 'rgb') ?? '').toUpperCase() : '')
  const estilos = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? ''
  return Array.from(estilos.matchAll(/<xf\b[^>]*>/g), (m) => rellenos[Number(atributo(m[0], 'fillId') ?? 0)] ?? '')
}
```

Reemplazar la función `leerHoja` completa por:

```ts
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
```

En `leerXlsx`, después de la línea `const compartidas = ...` agregar `const rellenos = leerRellenos(texto('xl/styles.xml'))` y reemplazar la línea `hojas.push(...)` por:

```ts
    const { filas, colores } = leerHoja(texto(ruta), compartidas, rellenos)
    hojas.push({ nombre: decodificar(atributo(h[0], 'name') ?? ''), filas, ...(colores.some((f) => f.some(Boolean)) ? { colores } : {}) })
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `npx vitest run src/infrastructure/xlsx/leer-xlsx.test.ts src/domain/dotacion-excel.test.ts`
Expected: PASS (las pruebas previas siguen igual: sin `styles.xml` no hay `colores`).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

---

### Task 2: Parser de capacitaciones

**Files:**
- Create: `src/domain/capacitaciones-excel.ts`
- Test: `src/domain/capacitaciones-excel.test.ts`

**Interfaces:**
- Consumes: `HojaLeida` (Task 1); `normalizarNombre` de `./colaboradores-hoja`; `aTextoIso`, `deTextoIso`, `fechaCalendario` de `./fechas`; `slug` de `./slug`.
- Produces:
  - `interface FilaCapacitacionExcel { hoja: string; fila: number; nombre: string; norma: string; cumple: boolean; fecha: string | null; vencimiento: string | null }` (`fila` 1-based como en Excel; fechas `AAAA-MM-DD`).
  - `interface ResultadoParseo { filas: FilaCapacitacionExcel[]; hojasSinFilas: string[] }`
  - `parsearCapacitacionesExcel(hojas: HojaLeida[]): ResultadoParseo`
  - `claveNorma(texto: string): string`, `fechaDeCelda(texto: string): Date | null`, `esVerde(rgb: string): boolean`, `esRojo(rgb: string): boolean`, `cumpleDe(colorSi: string, colorNo: string, fecha: Date | null): boolean`
  - `MAX_FILAS = 5000`, `validarFilas(entrada: unknown): { filas: FilaCapacitacionExcel[] } | { error: string }`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/domain/capacitaciones-excel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  claveNorma, cumpleDe, esRojo, esVerde, fechaDeCelda, parsearCapacitacionesExcel, validarFilas,
} from './capacitaciones-excel'
import type { HojaLeida } from './dotacion-excel'
import { aTextoIso } from './fechas'

const NORMA = 'NOM-009-STPS-2011'
const ENCABEZADO = ['#', 'Linea de negocio', '', 'Ciudad', '', 'Nombre', '', 'Fecha de ingreso', 'Cuadrilla', 'Curso', '', 'Cumplimiento', '', 'Fecha', 'Vigencia']
const fila = (nombre: string, norma: string, fecha = '', vigencia = ''): string[] =>
  ['1', 'MKTQRO', '', 'Queretaro', '', nombre, '', '46000', 'QRO001', norma, '', 'SI', 'NO', fecha, vigencia]
const color = (si = '', no = ''): string[] => ['', '', '', '', '', '', '', '', '', '', '', si, no, '', '']
const sinColor = color()

function hoja(nombre: string, filas: [string[], string[]?][]): HojaLeida {
  return { nombre, filas: filas.map(([f]) => f), colores: filas.map(([f, c]) => c ?? f.map(() => '')) }
}

describe('fechaDeCelda', () => {
  it('lee serie de Excel, DD/MM/AAAA con punto final e ISO', () => {
    expect(aTextoIso(fechaDeCelda('46094'))).toBe('2026-03-13')
    expect(aTextoIso(fechaDeCelda('46094.0'))).toBe('2026-03-13')
    expect(aTextoIso(fechaDeCelda('18/09/2026.'))).toBe('2026-09-18')
    expect(aTextoIso(fechaDeCelda('2026-03-13'))).toBe('2026-03-13')
  })
  it('rechaza texto, fechas imposibles y series fuera de rango', () => {
    for (const t of ['Pendiente', 'Programar', 'Vencido', '', '31/02/2026', '12']) expect(fechaDeCelda(t)).toBeNull()
  })
})

describe('colores y cumplimiento', () => {
  it('distingue verde y rojo', () => {
    expect(esVerde('FF92D050')).toBe(true)
    expect(esVerde('FFFF0000')).toBe(false)
    expect(esRojo('FFFF0000')).toBe(true)
    expect(esRojo('FFDEEAF6')).toBe(false)
    expect(esRojo('')).toBe(false)
  })
  const fecha = new Date(Date.UTC(2026, 2, 13, 12))
  it('verde cumple; rojo, azul u otro relleno no cumplen aunque haya fecha', () => {
    expect(cumpleDe('FF92D050', '', null)).toBe(true)
    expect(cumpleDe('', 'FFFF0000', fecha)).toBe(false)
    expect(cumpleDe('FFDEEAF6', 'FFDEEAF6', fecha)).toBe(false)
  })
  it('sin relleno (o blanco) cumple solo si hay fecha', () => {
    expect(cumpleDe('', '', fecha)).toBe(true)
    expect(cumpleDe('FFFFFFFF', '', fecha)).toBe(true)
    expect(cumpleDe('', '', null)).toBe(false)
  })
})

describe('claveNorma', () => {
  it('normaliza y trata la 2012 como la 2011', () => {
    expect(claveNorma(NORMA)).toBe('nom-009-stps-2011')
    expect(claveNorma('NOM-009-STPS-2012')).toBe('nom-009-stps-2011')
  })
})

describe('parsearCapacitacionesExcel', () => {
  it('toma el bloque más reciente por persona y norma', () => {
    const h = hoja('Queretaro Colaboradores', [
      [['AGOSTO']], [ENCABEZADO],
      [fila('Ana Perez', NORMA, 'Pendiente', 'Pendiente'), color('', 'FFFF0000')],
      [['SEPTIEMBRE']], [ENCABEZADO],
      [fila('Ana Perez', NORMA, '46094', '46459'), color('FF92D050', '')],
    ])
    expect(parsearCapacitacionesExcel([h]).filas).toEqual([{
      hoja: 'Queretaro Colaboradores', fila: 6, nombre: 'Ana Perez', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: '2027-03-13',
    }])
  })
  it('el orden de los meses manda sobre la posición en la hoja', () => {
    const h = hoja('H', [
      [['OCTUBRE']], [ENCABEZADO], [fila('Ana Perez', NORMA, '46094'), sinColor],
      [['AGOSTO']], [ENCABEZADO], [fila('Ana Perez', NORMA, 'Pendiente'), color('', 'FFFF0000')],
    ])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ fila: 3, cumple: true })
  })
  it('descarta encabezados repetidos y filas sin nombre', () => {
    const h = hoja('H', [
      [ENCABEZADO], [fila('Ana Perez', 'Capacitación')], [fila('Personal', 'Curso')], [fila('', NORMA, '46094')],
    ])
    expect(parsearCapacitacionesExcel([h])).toEqual({ filas: [], hojasSinFilas: ['H'] })
  })
  it('sin relleno y con fecha cumple; vigencia faltante suma un año; acepta 18/09/2026.', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Beto Ruiz', NORMA, '18/09/2026.'), sinColor]])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ cumple: true, fecha: '2026-09-18', vencimiento: '2027-09-18' })
  })
  it('Pendiente o Programar con relleno azul o sin relleno no cumple y no trae fechas', () => {
    const h = hoja('H', [
      [ENCABEZADO],
      [fila('Caro Diaz', NORMA, 'Pendiente', 'Pendiente'), color('FFDEEAF6', 'FFDEEAF6')],
      [fila('Dani Soto', NORMA, 'Programar'), sinColor],
    ])
    for (const f of parsearCapacitacionesExcel([h]).filas) expect(f).toMatchObject({ cumple: false, fecha: null, vencimiento: null })
  })
  it('rojo en NO gana aunque haya fecha', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Eli Mora', NORMA, '46094'), color('', 'FFFF0000')]])
    expect(parsearCapacitacionesExcel([h]).filas[0]).toMatchObject({ cumple: false, fecha: '2026-03-13', vencimiento: '2027-03-13' })
  })
  it('sin colores en la hoja decide la fecha', () => {
    const h: HojaLeida = { nombre: 'H', filas: [ENCABEZADO, fila('Fer Gil', NORMA, '46094'), fila('Gus Paz', NORMA, 'Pendiente')] }
    expect(parsearCapacitacionesExcel([h]).filas.map((f) => f.cumple)).toEqual([true, false])
  })
  it('encuentra SI/NO aunque el encabezado Cumplimiento esté desfasado', () => {
    const desfasado = [...ENCABEZADO]
    desfasado[11] = ''
    desfasado[12] = 'Cumplimiento'
    const h = hoja('H', [[desfasado], [fila('Hugo Lara', NORMA, '46094'), color('FF92D050', '')]])
    expect(parsearCapacitacionesExcel([h]).filas[0].cumple).toBe(true)
  })
  it('la 2012 y la 2011 de la misma persona son una sola capacitación', () => {
    const h = hoja('H', [[ENCABEZADO], [fila('Ivan Rey', 'NOM-009-STPS-2011', 'Pendiente'), sinColor], [fila('Ivan Rey', 'NOM-009-STPS-2012', '46094'), sinColor]])
    expect(parsearCapacitacionesExcel([h]).filas).toHaveLength(1)
  })
  it('ignora hojas sin encabezado y reporta las que tienen encabezado pero ninguna persona', () => {
    const oficina: HojaLeida = { nombre: 'Queretaro Oficina y vehiculos', filas: [['Oficina'], ['Extintor']] }
    const colima = hoja('Colima Colaboradores', [[ENCABEZADO], [fila('', NORMA, '46094')]])
    expect(parsearCapacitacionesExcel([oficina, colima])).toEqual({ filas: [], hojasSinFilas: ['Colima Colaboradores'] })
  })
})

describe('validarFilas', () => {
  const ok = { hoja: 'H', fila: 5, nombre: ' Ana ', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: null }
  it('acepta filas válidas y recorta textos', () => {
    expect(validarFilas([ok])).toEqual({ filas: [{ ...ok, nombre: 'Ana' }] })
  })
  it('rechaza lista vacía, demasiadas filas y formatos inválidos', () => {
    expect(validarFilas([])).toHaveProperty('error')
    expect(validarFilas('x')).toHaveProperty('error')
    expect(validarFilas(Array(5001).fill(ok))).toHaveProperty('error')
    for (const mala of [{ ...ok, cumple: 'si' }, { ...ok, fecha: '13/03/2026' }, { ...ok, fila: 1.5 }, { ...ok, nombre: '' }, { ...ok, vencimiento: undefined }, null]) {
      expect(validarFilas([mala])).toHaveProperty('error')
    }
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/domain/capacitaciones-excel.test.ts`
Expected: FAIL (el módulo `./capacitaciones-excel` no existe).

- [ ] **Step 3: Implementar el parser**

Crear `src/domain/capacitaciones-excel.ts`:

```ts
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

const menor = (a: number[], b: number[]): boolean => (a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2])

export function parsearCapacitacionesExcel(hojas: HojaLeida[]): ResultadoParseo {
  const ganadoras = new Map<string, { orden: number[]; fila: FilaCapacitacionExcel }>()
  const hojasSinFilas: string[] = []
  for (const hoja of hojas) {
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
      const orden = [mes, bloque, r]
      const previa = ganadoras.get(clave)
      if (!previa || !menor(orden, previa.orden)) ganadoras.set(clave, { orden, fila: registro })
    }
    if (conEncabezado && leidas === 0) hojasSinFilas.push(hoja.nombre)
  }
  return { filas: Array.from(ganadoras.values(), (g) => g.fila), hojasSinFilas }
}

const esFechaIso = (v: unknown): boolean => v === null || (typeof v === 'string' && deTextoIso(v) !== null)
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
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `npx vitest run src/domain/capacitaciones-excel.test.ts`
Expected: PASS. Si `fechaDeCelda('12')` no devuelve `null`, revisar el rango de series (debe ser 20 000 a 80 000).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

---

### Task 3: Sincronización pura

**Files:**
- Create: `src/application/capacitaciones-sync.ts`
- Test: `src/application/capacitaciones-sync.test.ts`

**Interfaces:**
- Consumes: `FilaCapacitacionExcel`, `claveNorma` (Task 2); `normalizarNombre`; `estadoCapacitacion`, `deTextoIso`, `aTextoIso` de `@/domain/fechas`.
- Produces:
  - `interface ColaboradorCapacitacion { id: string; nombre: string; activo: boolean; ciudad: string | null }`
  - `interface NormaCatalogo { valor: string; etiqueta: string }`
  - `interface CapacitacionExistente { id: string; colaborador_id: string; norma: string; cumple: boolean; fecha: Date | null; vencimiento: Date | null }`
  - `interface OperacionCapacitacion { id: string | null; nuevo: boolean; datos: Record<string, unknown> }` (`id: null` pide crear con identificador automático)
  - `interface AlmacenCapacitaciones { leerColaboradores(): Promise<ColaboradorCapacitacion[]>; leerNormas(): Promise<NormaCatalogo[]>; leerCapacitaciones(): Promise<CapacitacionExistente[]>; escribir(operaciones: OperacionCapacitacion[]): Promise<void> }`
  - `interface InformeCapacitaciones { simulacion: boolean; total: number; nuevas: number; actualizadas: number; sinCambios: number; noRetrocedidas: number; sinCoincidencia: string[]; ambiguas: string[]; rechazadas: { hoja: string; fila: number; motivo: string }[] }`
  - `sincronizarCapacitaciones(e: { almacen: AlmacenCapacitaciones; filas: FilaCapacitacionExcel[]; simular: boolean; hoy: Date }): Promise<InformeCapacitaciones>`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/application/capacitaciones-sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { deTextoIso } from '@/domain/fechas'
import {
  sincronizarCapacitaciones, type AlmacenCapacitaciones, type CapacitacionExistente, type ColaboradorCapacitacion,
} from './capacitaciones-sync'

const hoy = new Date(Date.UTC(2026, 9, 26, 12))
const NORMA = 'NOM-009-STPS-2011'

function almacen(colaboradores: ColaboradorCapacitacion[], existentes: CapacitacionExistente[] = []) {
  const guardadas = [...existentes]
  let escrituras = 0
  const a: AlmacenCapacitaciones = {
    leerColaboradores: async () => colaboradores,
    leerNormas: async () => [{ valor: 'nom-009-stps-2011', etiqueta: NORMA }],
    leerCapacitaciones: async () => guardadas,
    async escribir(ops) {
      escrituras++
      for (const op of ops) {
        const d = op.datos as Omit<CapacitacionExistente, 'id'>
        const i = guardadas.findIndex((g) => g.id === op.id)
        if (i >= 0) guardadas[i] = { ...guardadas[i], ...d }
        else guardadas.push({ id: `n${guardadas.length}`, ...d })
      }
    },
  }
  return { a, guardadas, escrituras: () => escrituras }
}

const ana: ColaboradorCapacitacion = { id: 'c1', nombre: 'Ana Pérez', activo: true, ciudad: 'queretaro' }
const fila = (extra: Partial<FilaCapacitacionExcel> = {}): FilaCapacitacionExcel =>
  ({ hoja: 'Q', fila: 5, nombre: 'ana perez', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: '2027-03-13', ...extra })
const correr = (a: AlmacenCapacitaciones, filas: FilaCapacitacionExcel[], simular = false) =>
  sincronizarCapacitaciones({ almacen: a, filas, simular, hoy })

describe('sincronizarCapacitaciones', () => {
  it('crea la capacitación con estado y ciudad del colaborador', async () => {
    const { a, guardadas } = almacen([ana])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ total: 1, nuevas: 1, actualizadas: 0, sinCambios: 0 })
    expect(guardadas[0]).toMatchObject({ colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: true, estado: 'vigente', ciudad: 'queretaro' })
    expect(guardadas[0].fecha).toEqual(deTextoIso('2026-03-13'))
  })
  it('lo pendiente se guarda como no cumple, sin fecha y en estado pendiente', async () => {
    const { a, guardadas } = almacen([ana])
    await correr(a, [fila({ cumple: false, fecha: null, vencimiento: null })])
    expect(guardadas[0]).toMatchObject({ cumple: false, fecha: null, vencimiento: null, estado: 'pendiente' })
  })
  it('simular cuenta pero no escribe', async () => {
    const { a, guardadas, escrituras } = almacen([ana])
    const r = await correr(a, [fila()], true)
    expect(r.nuevas).toBe(1)
    expect(escrituras()).toBe(0)
    expect(guardadas).toHaveLength(0)
  })
  it('actualiza la existente de la misma persona y norma', async () => {
    const previa: CapacitacionExistente = { id: 'k1', colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: false, fecha: null, vencimiento: null }
    const { a, guardadas } = almacen([ana], [previa])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ nuevas: 0, actualizadas: 1 })
    expect(guardadas).toHaveLength(1)
    expect(guardadas[0]).toMatchObject({ id: 'k1', cumple: true })
  })
  it('no retrocede si lo existente es más reciente o el Excel no trae fecha', async () => {
    const previa: CapacitacionExistente = { id: 'k1', colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: true, fecha: deTextoIso('2026-09-18'), vencimiento: deTextoIso('2027-09-18') }
    const { a, guardadas } = almacen([ana], [previa])
    expect((await correr(a, [fila()])).noRetrocedidas).toBe(1)
    expect((await correr(a, [fila({ cumple: false, fecha: null, vencimiento: null })])).noRetrocedidas).toBe(1)
    expect(guardadas[0].fecha).toEqual(deTextoIso('2026-09-18'))
  })
  it('es idempotente: la segunda corrida no cambia nada', async () => {
    const { a, escrituras } = almacen([ana])
    await correr(a, [fila()])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ nuevas: 0, actualizadas: 0, sinCambios: 1 })
    expect(escrituras()).toBe(1)
  })
  it('incluye colaboradores inactivos', async () => {
    const { a, guardadas } = almacen([{ ...ana, activo: false }])
    await correr(a, [fila()])
    expect(guardadas).toHaveLength(1)
  })
  it('con homónimos elige al único activo y si no, reporta ambigua', async () => {
    const otro = { ...ana, id: 'c2', activo: false }
    const uno = almacen([ana, otro])
    await correr(uno.a, [fila()])
    expect(uno.guardadas[0].colaborador_id).toBe('c1')
    const dos = almacen([ana, { ...otro, activo: true }])
    const r = await correr(dos.a, [fila()])
    expect(r.ambiguas).toEqual(['ana perez'])
    expect(dos.guardadas).toHaveLength(0)
  })
  it('reporta sin coincidencia sin repetir nombres', async () => {
    const { a } = almacen([ana])
    const r = await correr(a, [fila({ nombre: 'Zoe Luna' }), fila({ nombre: 'Zoe Luna', fila: 9 })])
    expect(r.sinCoincidencia).toEqual(['Zoe Luna'])
  })
  it('rechaza normas fuera del catálogo y acepta la 2012 como 2011', async () => {
    const { a, guardadas } = almacen([ana])
    const r = await correr(a, [fila({ norma: 'NOM-999', fila: 7 }), fila({ norma: 'NOM-009-STPS-2012' })])
    expect(r.rechazadas).toEqual([{ hoja: 'Q', fila: 7, motivo: 'La norma "NOM-999" no está en el catálogo' }])
    expect(guardadas).toHaveLength(1)
  })
  it('compara los nombres sin acentos ni mayúsculas', async () => {
    const { a } = almacen([ana])
    expect((await correr(a, [fila({ nombre: 'ANA PEREZ' })])).nuevas).toBe(1)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/application/capacitaciones-sync.test.ts`
Expected: FAIL (el módulo no existe).

- [ ] **Step 3: Implementar**

Crear `src/application/capacitaciones-sync.ts`:

```ts
import { claveNorma, type FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { normalizarNombre } from '@/domain/colaboradores-hoja'
import { aTextoIso, deTextoIso, estadoCapacitacion } from '@/domain/fechas'

export interface ColaboradorCapacitacion { id: string; nombre: string; activo: boolean; ciudad: string | null }
export interface NormaCatalogo { valor: string; etiqueta: string }
export interface CapacitacionExistente {
  id: string
  colaborador_id: string
  norma: string
  cumple: boolean
  fecha: Date | null
  vencimiento: Date | null
}

// id null pide crear con identificador automático
export interface OperacionCapacitacion { id: string | null; nuevo: boolean; datos: Record<string, unknown> }

export interface AlmacenCapacitaciones {
  leerColaboradores(): Promise<ColaboradorCapacitacion[]>
  leerNormas(): Promise<NormaCatalogo[]>
  leerCapacitaciones(): Promise<CapacitacionExistente[]>
  escribir(operaciones: OperacionCapacitacion[]): Promise<void>
}

export interface InformeCapacitaciones {
  simulacion: boolean
  total: number
  nuevas: number
  actualizadas: number
  sinCambios: number
  noRetrocedidas: number
  sinCoincidencia: string[]
  ambiguas: string[]
  rechazadas: { hoja: string; fila: number; motivo: string }[]
}

interface Entrada {
  almacen: AlmacenCapacitaciones
  filas: FilaCapacitacionExcel[]
  simular: boolean
  hoy: Date
}

// Se compara por día de calendario para no depender de la hora guardada
const dia = (d: Date | null) => aTextoIso(d)

export async function sincronizarCapacitaciones({ almacen, filas, simular, hoy }: Entrada): Promise<InformeCapacitaciones> {
  const [colaboradores, normas, existentes] = await Promise.all([
    almacen.leerColaboradores(), almacen.leerNormas(), almacen.leerCapacitaciones(),
  ])
  const porNombre = new Map<string, ColaboradorCapacitacion[]>()
  for (const c of colaboradores) {
    const k = normalizarNombre(c.nombre)
    porNombre.set(k, [...(porNombre.get(k) ?? []), c])
  }
  const normaPorClave = new Map<string, string>()
  for (const n of normas) {
    normaPorClave.set(claveNorma(n.valor), n.valor)
    normaPorClave.set(claveNorma(n.etiqueta), n.valor)
  }
  // Si hay varias para la misma persona y norma, gana la de fecha más reciente
  const existentePor = new Map<string, CapacitacionExistente>()
  for (const e of existentes) {
    const k = `${e.colaborador_id}|${e.norma}`
    const previa = existentePor.get(k)
    if (!previa || dia(e.fecha) > dia(previa.fecha)) existentePor.set(k, e)
  }

  const informe: InformeCapacitaciones = {
    simulacion: simular, total: filas.length, nuevas: 0, actualizadas: 0, sinCambios: 0, noRetrocedidas: 0,
    sinCoincidencia: [], ambiguas: [], rechazadas: [],
  }
  const sinCoincidencia = new Set<string>()
  const ambiguas = new Set<string>()
  const resueltas = new Map<string, { colaborador: ColaboradorCapacitacion; norma: string; fila: FilaCapacitacionExcel }>()
  for (const f of filas) {
    const norma = normaPorClave.get(claveNorma(f.norma))
    if (!norma) {
      informe.rechazadas.push({ hoja: f.hoja, fila: f.fila, motivo: `La norma "${f.norma}" no está en el catálogo` })
      continue
    }
    const candidatos = porNombre.get(normalizarNombre(f.nombre)) ?? []
    if (candidatos.length === 0) { sinCoincidencia.add(f.nombre); continue }
    const activos = candidatos.filter((c) => c.activo)
    const colaborador = candidatos.length === 1 ? candidatos[0] : activos.length === 1 ? activos[0] : null
    if (!colaborador) { ambiguas.add(f.nombre); continue }
    resueltas.set(`${colaborador.id}|${norma}`, { colaborador, norma, fila: f })
  }
  informe.sinCoincidencia = Array.from(sinCoincidencia).sort((a, b) => a.localeCompare(b, 'es'))
  informe.ambiguas = Array.from(ambiguas).sort((a, b) => a.localeCompare(b, 'es'))

  const operaciones: OperacionCapacitacion[] = []
  for (const [llave, { colaborador, norma, fila }] of resueltas) {
    const fecha = fila.fecha ? deTextoIso(fila.fecha) : null
    const vencimiento = fila.vencimiento ? deTextoIso(fila.vencimiento) : null
    const datos = {
      colaborador_id: colaborador.id, norma, cumple: fila.cumple, fecha, vencimiento,
      estado: estadoCapacitacion(fecha, vencimiento, hoy), ciudad: colaborador.ciudad,
    }
    const existente = existentePor.get(llave)
    if (!existente) {
      informe.nuevas++
      operaciones.push({ id: null, nuevo: true, datos })
    } else if (existente.fecha && (!fecha || dia(existente.fecha) > dia(fecha))) {
      informe.noRetrocedidas++
    } else if (existente.cumple === fila.cumple && dia(existente.fecha) === dia(fecha) && dia(existente.vencimiento) === dia(vencimiento)) {
      informe.sinCambios++
    } else {
      informe.actualizadas++
      operaciones.push({ id: existente.id, nuevo: false, datos })
    }
  }
  if (!simular && operaciones.length > 0) await almacen.escribir(operaciones)
  return informe
}
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `npx vitest run src/application/capacitaciones-sync.test.ts`
Expected: PASS (10 pruebas).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

---

### Task 4: Almacén de servidor, endpoint y cliente

**Files:**
- Create: `src/infrastructure/servidor/almacen-capacitaciones.ts`
- Create: `src/app/api/capacitaciones/importar/route.ts`
- Create: `src/infrastructure/api/capacitaciones.ts`

**Interfaces:**
- Consumes: `AlmacenCapacitaciones`, `sincronizarCapacitaciones`, `InformeCapacitaciones` (Task 3); `validarFilas`, `FilaCapacitacionExcel` (Task 2); `autorizar`, `leerCuerpo` de `@/infrastructure/servidor/autorizar`; `adminDb` de `@/infrastructure/servidor/admin`.
- Produces:
  - `crearAlmacenCapacitaciones(db: Firestore, actor: string): AlmacenCapacitaciones`
  - `POST /api/capacitaciones/importar` con cuerpo `{ filas, simular }` (`simular` es `true` salvo que sea exactamente `false`); responde `InformeCapacitaciones` más `totalRechazadas`, `totalSinCoincidencia`, `totalAmbiguas`, con las tres listas recortadas a 200.
  - `importarCapacitaciones(filas: FilaCapacitacionExcel[], simular: boolean): Promise<InformeImportacion>` y el tipo `InformeImportacion`.

- [ ] **Step 1: Crear el almacén**

`src/infrastructure/servidor/almacen-capacitaciones.ts`:

```ts
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AlmacenCapacitaciones } from '@/application/capacitaciones-sync'

const TAMANO_LOTE = 400

const aFecha = (v: unknown): Date | null =>
  v && typeof (v as { toDate?: unknown }).toDate === 'function' ? (v as { toDate(): Date }).toDate() : null

export function crearAlmacenCapacitaciones(db: Firestore, actor: string): AlmacenCapacitaciones {
  return {
    async leerColaboradores() {
      const snap = await db.collection('colaboradores').get()
      return snap.docs.map((d) => {
        const x = d.data()
        return { id: d.id, nombre: String(x.nombre ?? ''), activo: x.activo !== false, ciudad: typeof x.ciudad === 'string' ? x.ciudad : null }
      })
    },
    async leerNormas() {
      const items = (await db.doc('catalogos/normas').get()).data()?.items
      return Array.isArray(items)
        ? items.filter((i) => typeof i?.valor === 'string' && typeof i?.etiqueta === 'string').map((i) => ({ valor: i.valor as string, etiqueta: i.etiqueta as string }))
        : []
    },
    async leerCapacitaciones() {
      const snap = await db.collection('capacitaciones').get()
      return snap.docs.map((d) => {
        const x = d.data()
        return {
          id: d.id, colaborador_id: String(x.colaborador_id ?? ''), norma: String(x.norma ?? ''),
          cumple: x.cumple === true, fecha: aFecha(x.fecha), vencimiento: aFecha(x.vencimiento),
        }
      })
    },
    async escribir(operaciones) {
      for (let i = 0; i < operaciones.length; i += TAMANO_LOTE) {
        const lote = db.batch()
        for (const op of operaciones.slice(i, i + TAMANO_LOTE)) {
          const ref = op.id ? db.doc(`capacitaciones/${op.id}`) : db.collection('capacitaciones').doc()
          const marca = { actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp() }
          const alta = op.nuevo ? { creado_por: actor, creado_en: FieldValue.serverTimestamp() } : {}
          lote.set(ref, { ...op.datos, ...alta, ...marca }, { merge: true })
        }
        await lote.commit()
      }
    },
  }
}
```

- [ ] **Step 2: Crear el endpoint**

`src/app/api/capacitaciones/importar/route.ts`:

```ts
import { sincronizarCapacitaciones } from '@/application/capacitaciones-sync'
import { validarFilas } from '@/domain/capacitaciones-excel'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenCapacitaciones } from '@/infrastructure/servidor/almacen-capacitaciones'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_LISTA = 200

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { filas: crudas, simular } = await leerCuerpo(req)
  const validadas = validarFilas(crudas)
  if ('error' in validadas) return Response.json({ error: validadas.error }, { status: 400 })
  try {
    const informe = await sincronizarCapacitaciones({
      almacen: crearAlmacenCapacitaciones(adminDb(), acceso.uid), filas: validadas.filas, simular: simular !== false, hoy: new Date(),
    })
    return Response.json({
      ...informe,
      totalRechazadas: informe.rechazadas.length,
      totalSinCoincidencia: informe.sinCoincidencia.length,
      totalAmbiguas: informe.ambiguas.length,
      rechazadas: informe.rechazadas.slice(0, MAX_LISTA),
      sinCoincidencia: informe.sinCoincidencia.slice(0, MAX_LISTA),
      ambiguas: informe.ambiguas.slice(0, MAX_LISTA),
    })
  } catch (error) {
    console.error('No se pudieron importar las capacitaciones', error)
    return Response.json({ error: 'No se pudieron importar las capacitaciones' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Crear el cliente**

`src/infrastructure/api/capacitaciones.ts`:

```ts
import type { InformeCapacitaciones } from '@/application/capacitaciones-sync'
import type { FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { enviar, llamar } from './llamar'

export type InformeImportacion = InformeCapacitaciones & { totalRechazadas: number; totalSinCoincidencia: number; totalAmbiguas: number }

export const importarCapacitaciones = (filas: FilaCapacitacionExcel[], simular: boolean) =>
  llamar<InformeImportacion>('/api/capacitaciones/importar', enviar({ filas, simular }))
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificar que la ruta se registra**

Run: `npx next build 2>&1 | grep -E "capacitaciones|error|Error"`
Expected: aparece `ƒ /api/capacitaciones/importar` y ningún error.

---

### Task 5: Pantalla y enlace de menú

**Files:**
- Create: `src/presentation/capacitaciones/ImportarCapacitaciones.tsx`
- Create: `src/app/(app)/admin/capacitaciones-excel/page.tsx`
- Modify: `src/presentation/navegacion/enlaces.ts`

**Interfaces:**
- Consumes: `parsearCapacitacionesExcel`, `ResultadoParseo` (Task 2); `leerXlsx` (Task 1); `importarCapacitaciones`, `InformeImportacion` (Task 4); `AvisoError` de `@/presentation/ui/Estado`; `RequireAcceso`; `EncabezadoPagina`.
- Produces: ruta `/admin/capacitaciones-excel` y enlace "Importar capacitaciones" en Administración.

- [ ] **Step 1: Crear el componente**

`src/presentation/capacitaciones/ImportarCapacitaciones.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { parsearCapacitacionesExcel, type ResultadoParseo } from '@/domain/capacitaciones-excel'
import { importarCapacitaciones, type InformeImportacion } from '@/infrastructure/api/capacitaciones'
import { leerXlsx } from '@/infrastructure/xlsx/leer-xlsx'
import { AvisoError } from '@/presentation/ui/Estado'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="tarjeta p-3">
      <p className="text-xs text-texto-suave">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
    </div>
  )
}

function Lista({ titulo, nota, total, items }: { titulo: string; nota: string; total: number; items: string[] }) {
  if (total === 0) return null
  return (
    <section className="tarjeta p-4">
      <h2 className="text-base">{titulo} ({total})</h2>
      <p className="mt-1 text-sm text-texto-suave">{nota}</p>
      <ul className="mt-2 text-sm">{items.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ul>
      {total > items.length && <p className="mt-2 text-xs text-texto-suave">Se muestran los primeros {items.length}.</p>}
    </section>
  )
}

export function ImportarCapacitaciones() {
  const [lectura, setLectura] = useState<{ archivo: string; resultado: ResultadoParseo } | null>(null)
  const [informe, setInforme] = useState<InformeImportacion | null>(null)
  const [ocupado, setOcupado] = useState<'leer' | 'simular' | 'aplicar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [clave, setClave] = useState(0)

  async function elegirArchivo(f: File | undefined) {
    if (!f) return
    setOcupado('leer')
    setError(null)
    setInforme(null)
    setConfirmando(false)
    try {
      setLectura({ archivo: f.name, resultado: parsearCapacitacionesExcel(await leerXlsx(await f.arrayBuffer())) })
    } catch (e) {
      setLectura(null)
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    } finally {
      setOcupado(null)
    }
  }

  async function ejecutar(simular: boolean) {
    if (!lectura) return
    setOcupado(simular ? 'simular' : 'aplicar')
    setConfirmando(false)
    setError(null)
    try {
      setInforme(await importarCapacitaciones(lectura.resultado.filas, simular))
      if (!simular) { setLectura(null); setClave((c) => c + 1) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar')
    } finally {
      setOcupado(null)
    }
  }

  const filas = lectura?.resultado.filas ?? []
  const hojas = new Set(filas.map((f) => f.hoja)).size
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="archivo-capacitaciones" className="block text-sm">Archivo de seguimiento (.xlsx)</label>
        <input key={clave} id="archivo-capacitaciones" type="file" accept=".xlsx" disabled={ocupado !== null}
          onChange={(e) => void elegirArchivo(e.target.files?.[0])} />
        {ocupado === 'leer' && <p className="text-sm text-texto-suave">Leyendo...</p>}
      </div>
      {error && <AvisoError>{error}</AvisoError>}
      {lectura && (
        <div className="space-y-3">
          <p className="text-sm text-texto-suave">
            {lectura.archivo}: {filas.length} capacitaciones de {hojas} hojas, con el dato más reciente de cada persona.
            {lectura.resultado.hojasSinFilas.length > 0 && ` Sin personas: ${lectura.resultado.hojasSinFilas.join(', ')}.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void ejecutar(true)} disabled={ocupado !== null || filas.length === 0} className="boton-secundario">
              {ocupado === 'simular' ? 'Simulando...' : 'Simular'}
            </button>
            {confirmando ? (
              <>
                <span className="text-sm text-texto-suave">Se crearán y actualizarán capacitaciones en la app.</span>
                <button type="button" onClick={() => void ejecutar(false)} disabled={ocupado !== null} className="boton-primario">Confirmar importación</button>
                <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado !== null || filas.length === 0} className="boton-primario">
                {ocupado === 'aplicar' ? 'Importando...' : 'Aplicar'}
              </button>
            )}
          </div>
        </div>
      )}
      {informe && (
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">
            {informe.simulacion ? 'Simulación: no se escribió nada.' : 'Importación terminada.'} {informe.total} capacitaciones del archivo.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <Dato etiqueta="Nuevas" valor={informe.nuevas} />
            <Dato etiqueta="Actualizadas" valor={informe.actualizadas} />
            <Dato etiqueta="Sin cambios" valor={informe.sinCambios} />
            <Dato etiqueta="No retrocedidas" valor={informe.noRetrocedidas} />
            <Dato etiqueta="Sin coincidencia" valor={informe.totalSinCoincidencia} />
            <Dato etiqueta="Ambiguas" valor={informe.totalAmbiguas} />
            <Dato etiqueta="Rechazadas" valor={informe.totalRechazadas} />
          </div>
          <Lista titulo="Sin coincidencia" total={informe.totalSinCoincidencia} items={informe.sinCoincidencia}
            nota="No hay un colaborador con ese nombre en la app; se corrige el nombre en el Excel o se da de alta." />
          <Lista titulo="Ambiguas" total={informe.totalAmbiguas} items={informe.ambiguas}
            nota="Varios colaboradores con el mismo nombre; no se escribió nada para ellos." />
          <Lista titulo="Rechazadas" total={informe.totalRechazadas} items={informe.rechazadas.map((r) => `${r.hoja}, fila ${r.fila}: ${r.motivo}`)}
            nota="Se corrigen en el Excel y se vuelve a importar." />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crear la página**

`src/app/(app)/admin/capacitaciones-excel/page.tsx`:

```tsx
'use client'

import { ImportarCapacitaciones } from '@/presentation/capacitaciones/ImportarCapacitaciones'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function CapacitacionesExcelPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Importar capacitaciones"
          detalle="Actualiza las capacitaciones desde el Excel de seguimiento; el dato más reciente de cada persona y nunca retrocede una fecha." />
        <ImportarCapacitaciones />
      </section>
    </RequireAcceso>
  )
}
```

- [ ] **Step 3: Agregar el enlace**

En `src/presentation/navegacion/enlaces.ts`, después de la línea de `/admin/entregas-hoja`, agregar:

```ts
        { href: '/admin/capacitaciones-excel', titulo: 'Importar capacitaciones', icono: 'catalogos' },
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npx vitest run src/presentation/navegacion && npx eslint src/presentation/capacitaciones src/app/api/capacitaciones "src/app/(app)/admin/capacitaciones-excel"`
Expected: sin errores. Si una prueba de navegación cuenta enlaces de administración, actualizar su número esperado en 1.

---

### Task 6: Verificación con el archivo real (la hace quien coordina)

**Files:**
- Temporal, no se queda: `src/infrastructure/xlsx/real.tmp.test.ts` (se borra al terminar)

- [ ] **Step 1: Prueba temporal contra el Excel real**

Crear `src/infrastructure/xlsx/real.tmp.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsearCapacitacionesExcel } from '@/domain/capacitaciones-excel'
import { leerXlsx } from './leer-xlsx'

const RUTA = 'C:\\Users\\gestionyanalisis\\Downloads\\SEGUIMIENTO SEGURIDAD MKTQRO.xlsx'

describe('archivo real', () => {
  it('parsea y respeta lo observado a mano', async () => {
    const r = parsearCapacitacionesExcel(await leerXlsx(readFileSync(RUTA)))
    console.log('filas:', r.filas.length, '| sin personas:', r.hojasSinFilas, '| cumple:', r.filas.filter((f) => f.cumple).length)
    const q = (n: string) => r.filas.find((f) => f.hoja.startsWith('Queretaro') && f.nombre.startsWith(n))
    expect(q('Moises Mata')).toMatchObject({ cumple: true, fecha: '2026-09-18', vencimiento: '2027-09-18' })
    expect(q('Edgar Eduardo Larios')).toMatchObject({ cumple: true, fecha: '2026-03-13', vencimiento: '2027-03-13' })
    expect(r.filas.length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Ejecutarla**

Run: `npx vitest run src/infrastructure/xlsx/real.tmp.test.ts`
Expected: PASS y una línea `filas: N` con N cercano a 130 a 170 (≈247 filas de datos sin repetir persona y norma; la cifra exacta se revisa contra el reporte de la pantalla).

- [ ] **Step 3: Borrar la prueba temporal**

Run: `rm src/infrastructure/xlsx/real.tmp.test.ts`

- [ ] **Step 4: Suite completa, tipos, lint y build**

Run: `npx vitest run && npx tsc --noEmit && npx next build 2>&1 | tail -5`
Expected: todo pasa. El lint del selector de año (`set-state-in-effect`) ya existía y no cuenta.

- [ ] **Step 5: Revisión manual en la app (la hace el usuario)**

Con `pnpm dev`: entrar a `/admin/capacitaciones-excel`, subir el Excel, **Simular**, revisar el reporte (en especial "Sin coincidencia" y "No retrocedidas") y solo entonces **Aplicar**. No se hace commit hasta esa revisión.
