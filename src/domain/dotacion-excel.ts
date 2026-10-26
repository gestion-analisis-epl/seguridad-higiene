import { REGIONES_ANATOMICAS } from './catalogos-iniciales'
import { agruparPorRegion } from './epp-regiones'
import type { Opcion } from './modulos'
import { idRegla, type ReglaDotacion } from './reglas-dotacion'
import { slug } from './slug'
import { aTitulo } from './texto'

// filas[fila][columna], base 0, con las celdas vacías como ''
export interface HojaLeida { nombre: string; filas: string[][]; colores?: string[][] }
export interface CodigoEpp { region: number; letra: string }
export interface FilaPuesto { hoja: string; puesto: string; departamento: string; codigos: CodigoEpp[] }

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const esRegion = (v: string | undefined) => /^\d+(\.0+)?$/.test((v ?? '').trim())
const esInciso = (v: string | undefined) => /^[A-Za-z]$/.test((v ?? '').trim())
const marcada = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'x'

// La matriz tiene una fila de regiones (1, 2, ...) y debajo una de incisos (A, B, ...); los puestos van después
function encabezado(filas: string[][]): number {
  return filas.findIndex((f, i) => {
    const primera = f.findIndex((v, c) => c >= 2 && esRegion(v))
    return primera >= 2 && f.filter((v) => esRegion(v)).length >= 2 && esInciso(filas[i + 1]?.[primera])
  })
}

export function leerPuestos(hoja: HojaLeida): FilaPuesto[] {
  const h = encabezado(hoja.filas)
  if (h < 0) return []
  const regiones = hoja.filas[h]
  const incisos = hoja.filas[h + 1]
  const primera = regiones.findIndex((v, c) => c >= 2 && esRegion(v))
  const regionDe: Record<number, number> = {}
  let actual = 0
  for (let c = primera; c < incisos.length; c++) {
    if (esRegion(regiones[c])) actual = Math.trunc(Number(regiones[c]))
    if (actual && esInciso(incisos[c])) regionDe[c] = actual
  }
  // Sin columna de departamento el puesto va justo antes de la matriz
  const conDepto = primera >= 3
  const colPuesto = conDepto ? primera - 2 : primera - 1
  const puestos: FilaPuesto[] = []
  for (let r = h + 2; r < hoja.filas.length; r++) {
    const fila = hoja.filas[r]
    const puesto = (fila[colPuesto] ?? '').trim()
    if (!puesto) break
    const codigos = Object.entries(regionDe)
      .filter(([c]) => marcada(fila[Number(c)]))
      .map(([c, region]) => ({ region, letra: incisos[Number(c)].trim().toUpperCase() }))
    puestos.push({ hoja: hoja.nombre, puesto, departamento: conDepto ? (fila[primera - 1] ?? '').trim() : '', codigos })
  }
  return puestos
}

export interface CatalogosImportacion { lineas: Opcion[]; ciudades: Opcion[]; areas: Opcion[]; tiposEpp: Opcion[] }
export interface DecisionHoja { linea?: string; ciudad?: string }
export interface Decisiones {
  hojas: Record<string, DecisionHoja>
  // id de la regla en conflicto -> nombre de la hoja que prevalece
  conflictos: Record<string, string>
}

export interface ReglaPlan {
  id: string
  linea_negocio: string
  puesto_etiqueta: string
  ciudad: string | null
  area: string | null
  tipos_epp: string[]
  hojas: string[]
  accion: 'crear' | 'actualizar'
}
export interface HojaPendiente { hoja: string; linea: string | null; ciudad: string | null }
export interface Conflicto {
  id: string
  linea_negocio: string
  puesto_etiqueta: string
  ciudad: string | null
  area: string | null
  opciones: { hoja: string; tipos_epp: string[] }[]
}
export interface PlanImportacion {
  reglas: ReglaPlan[]
  hojasPendientes: HojaPendiente[]
  conflictos: Conflicto[]
  problemas: string[]
}

const claves = (o: Opcion) => [o.valor, o.etiqueta, o.nombre_corto].filter((x): x is string => !!x).map(slug).filter(Boolean)
const buscar = (opciones: Opcion[], texto: string) => {
  const t = slug(texto)
  return t ? opciones.find((o) => claves(o).includes(t))?.valor ?? null : null
}

// Nombre de hoja = nombre corto de la empresa + nombre corto de la ciudad; gana el prefijo más largo
function identificarHoja(nombre: string, { lineas, ciudades }: CatalogosImportacion): { linea: string | null; ciudad: string | null } {
  const hoja = slug(nombre)
  let mejor: { valor: string; largo: number } | null = null
  for (const l of lineas) {
    for (const c of claves(l)) {
      if ((hoja === c || hoja.startsWith(`${c}-`)) && c.length > (mejor?.largo ?? 0)) mejor = { valor: l.valor, largo: c.length }
    }
  }
  if (!mejor) return { linea: null, ciudad: null }
  return { linea: mejor.valor, ciudad: buscar(ciudades, hoja.slice(mejor.largo + 1).replace(/-/g, ' ')) }
}

const firma = (tipos: string[]) => [...tipos].sort().join('|')

// El archivo de una sola empresa lleva su nombre; coincide exacto o por prefijo único
function lineaDeArchivo(archivo: string, lineas: Opcion[]): string | null {
  const nombre = slug(archivo.replace(/\.xlsx$/i, ''))
  if (!nombre) return null
  const exacta = buscar(lineas, nombre.replace(/-/g, ' '))
  if (exacta) return exacta
  const prefijo = lineas.filter((l) => claves(l).some((c) => c.startsWith(`${nombre}-`)))
  return prefijo.length === 1 ? prefijo[0].valor : null
}

export function planearImportacion(
  hojas: HojaLeida[], catalogos: CatalogosImportacion, existentes: ReglaDotacion[], decisiones: Decisiones, archivo = '',
): PlanImportacion {
  const grupos = agruparPorRegion(catalogos.tiposEpp)
  const ids = new Set(existentes.map((r) => r.id))
  const hojasPendientes: HojaPendiente[] = []
  const problemas: string[] = []
  const candidatas = new Map<string, Omit<ReglaPlan, 'accion' | 'hojas' | 'tipos_epp'> & { opciones: { hoja: string; tipos_epp: string[] }[] }>()

  for (const hoja of hojas) {
    const puestos = leerPuestos(hoja)
    if (puestos.length === 0) continue
    const detectada = identificarHoja(hoja.nombre, catalogos)
    // Una hoja que no nombra empresa hereda la del archivo y aplica a todas las ciudades
    const deArchivo = detectada.linea ? null : lineaDeArchivo(archivo, catalogos.lineas)
    const decidida = decisiones.hojas[hoja.nombre]
    const linea = decidida?.linea ?? detectada.linea ?? deArchivo
    const ciudad = decidida?.ciudad ?? detectada.ciudad
    const todas = !detectada.linea && !ciudad
    if (!linea || (!ciudad && !todas)) { hojasPendientes.push({ hoja: hoja.nombre, linea, ciudad }); continue }

    for (const p of puestos) {
      const donde = `${hoja.nombre} · ${p.puesto}`
      const area = p.departamento ? buscar(catalogos.areas, p.departamento) : null
      if (p.departamento && !area) { problemas.push(`${donde}: el departamento «${p.departamento}» no está en el catálogo de áreas`); continue }
      const tipos: string[] = []
      const faltan: string[] = []
      for (const { region, letra } of p.codigos) {
        const grupo = grupos.find((g) => g.region === REGIONES_ANATOMICAS[region - 1]?.valor)
        const tipo = grupo?.items[LETRAS.indexOf(letra)]
        if (tipo) { if (!tipos.includes(tipo.valor)) tipos.push(tipo.valor) } else faltan.push(`${region}:${letra}`)
      }
      if (faltan.length > 0) { problemas.push(`${donde}: no existe en el catálogo de EPP ${faltan.join(', ')}`); continue }
      const id = idRegla(linea, p.puesto, ciudad ?? null, area)
      const actual = candidatas.get(id) ?? { id, linea_negocio: linea, puesto_etiqueta: aTitulo(p.puesto), ciudad: ciudad ?? null, area, opciones: [] }
      actual.opciones.push({ hoja: hoja.nombre, tipos_epp: tipos })
      candidatas.set(id, actual)
    }
  }

  const reglas: ReglaPlan[] = []
  const conflictos: Conflicto[] = []
  for (const { opciones, ...base } of Array.from(candidatas.values())) {
    const iguales = opciones.every((o) => firma(o.tipos_epp) === firma(opciones[0].tipos_epp))
    const elegida = decisiones.conflictos[base.id]
    const aplicables = iguales ? opciones : opciones.filter((o) => o.hoja === elegida)
    if (aplicables.length === 0) { conflictos.push({ ...base, opciones }); continue }
    reglas.push({ ...base, tipos_epp: aplicables[0].tipos_epp, hojas: aplicables.map((o) => o.hoja), accion: ids.has(base.id) ? 'actualizar' : 'crear' })
  }
  return { reglas, hojasPendientes, conflictos, problemas }
}
