import { normalizarNombre } from './colaboradores-hoja'
import { slug } from './slug'
import { aTitulo } from './texto'

export interface ReglaDotacion {
  id: string
  linea_negocio: string
  // Puesto normalizado: es parte de la llave
  puesto: string
  puesto_etiqueta: string
  // Vacío: aplica a todas las plazas de la empresa y el puesto
  ciudad: string | null
  // Vacío: aplica a todas las áreas (departamentos)
  area: string | null
  prendas: string[]
  tipos_epp: string[]
}

export interface PerfilColaborador { linea_negocio: string; puesto?: string | null; ciudad: string; area?: string | null }
export type ColaboradorRegla = PerfilColaborador & { activo?: boolean }

export interface CombinacionPendiente {
  linea_negocio: string
  puesto: string
  puesto_etiqueta: string
  ciudad: string
  colaboradores: number
}

export const normalizarPuesto = normalizarNombre

// Sin área el identificador no cambia, así las reglas anteriores conservan el suyo
export function idRegla(linea: string, puesto: string, ciudad: string | null, area: string | null = null): string {
  return [slug(linea), slug(normalizarPuesto(puesto)), ciudad ? slug(ciudad) : 'todas', ...(area ? [slug(area)] : [])].join('__')
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

// Convierte un documento de Firestore (con su id) en una regla
export function aRegla(r: Record<string, unknown>): ReglaDotacion {
  return {
    id: texto(r.id), linea_negocio: texto(r.linea_negocio), puesto: normalizarPuesto(texto(r.puesto)),
    puesto_etiqueta: texto(r.puesto_etiqueta) || texto(r.puesto), ciudad: texto(r.ciudad) || null,
    area: texto(r.area) || null, prendas: lista(r.prendas), tipos_epp: lista(r.tipos_epp),
  }
}

const llave = (linea: string, puesto: string, ciudad: string | null, area: string | null) => `${linea}|${puesto}|${ciudad ?? ''}|${area ?? ''}`

// De lo más específico a lo general: ciudad y área, ciudad, área, ninguna; sin ninguna, null
export function indexarReglas(reglas: ReglaDotacion[]): (c: PerfilColaborador) => ReglaDotacion | null {
  const mapa = new Map(reglas.map((r) => [llave(r.linea_negocio, normalizarPuesto(r.puesto), r.ciudad, r.area), r]))
  return (c) => {
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) return null
    const area = c.area || null
    return mapa.get(llave(c.linea_negocio, puesto, c.ciudad, area)) ?? mapa.get(llave(c.linea_negocio, puesto, c.ciudad, null))
      ?? mapa.get(llave(c.linea_negocio, puesto, null, area)) ?? mapa.get(llave(c.linea_negocio, puesto, null, null)) ?? null
  }
}

export const resolverRegla = (reglas: ReglaDotacion[], c: PerfilColaborador): ReglaDotacion | null =>
  indexarReglas(reglas)(c)

// Combinaciones de colaboradores activos sin regla; sinDatos son los que no traen puesto o empresa
export function combinacionesSinRegla(
  colaboradores: ColaboradorRegla[], reglas: ReglaDotacion[],
): { pendientes: CombinacionPendiente[]; sinDatos: number } {
  const resolver = indexarReglas(reglas)
  const grupos = new Map<string, CombinacionPendiente>()
  let sinDatos = 0
  for (const c of colaboradores) {
    if (c.activo === false || resolver(c)) continue
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) { sinDatos++; continue }
    const clave = llave(c.linea_negocio, puesto, c.ciudad, null)
    const actual = grupos.get(clave)
    if (actual) actual.colaboradores++
    else grupos.set(clave, { linea_negocio: c.linea_negocio, puesto, puesto_etiqueta: aTitulo(c.puesto ?? ''), ciudad: c.ciudad, colaboradores: 1 })
  }
  const pendientes = Array.from(grupos.values()).sort((a, b) =>
    a.linea_negocio.localeCompare(b.linea_negocio) || a.puesto.localeCompare(b.puesto) || a.ciudad.localeCompare(b.ciudad))
  return { pendientes, sinDatos }
}

// Activos que resolverían a la candidata si se guardara junto con las reglas actuales
export function colaboradoresAbarcados(
  candidata: ReglaDotacion, reglas: ReglaDotacion[], colaboradores: ColaboradorRegla[],
): number {
  const resolver = indexarReglas([...reglas.filter((r) => r.id !== candidata.id), candidata])
  return colaboradores.filter((c) => c.activo !== false && resolver(c)?.id === candidata.id).length
}

// Puestos de los colaboradores activos de una empresa, sin repetir y ordenados
export function puestosDeEmpresa(colaboradores: ColaboradorRegla[], lineaNegocio: string): string[] {
  const porClave = new Map<string, string>()
  for (const c of colaboradores) {
    const clave = normalizarPuesto(c.puesto ?? '')
    if (c.activo !== false && c.linea_negocio === lineaNegocio && clave && !porClave.has(clave)) porClave.set(clave, aTitulo(c.puesto ?? ''))
  }
  return Array.from(porClave.values()).sort((a, b) => a.localeCompare(b, 'es'))
}
