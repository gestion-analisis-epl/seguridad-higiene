import { normalizarNombre } from './colaboradores-hoja'
import { slug } from './slug'
import { aTitulo } from './texto'

export type TipoRegla = 'uniforme' | 'epp'

export const COLECCION_REGLAS: Record<TipoRegla, string> = { uniforme: 'reglas_uniforme', epp: 'reglas_epp' }
export const COLECCION_REGLAS_ANTERIOR = 'reglas_dotacion'
export const ROTULO_TIPO: Record<TipoRegla, string> = { uniforme: 'Uniformes', epp: 'EPP' }

// Cada regla guarda solo lo que cambia frente a las más generales de su puesto: base, área, ciudad, ciudad y área
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
  agrega: string[]
  quita: string[]
}

export interface Dotacion { uniforme: ReglaDotacion[]; epp: ReglaDotacion[] }
export const DOTACION_VACIA: Dotacion = { uniforme: [], epp: [] }

export interface Alcance { linea_negocio: string; puesto: string; ciudad: string | null; area: string | null }
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
    area: texto(r.area) || null, agrega: lista(r.agrega), quita: lista(r.quita),
  }
}

const llave = (linea: string, puesto: string, ciudad: string | null, area: string | null) => `${linea}|${puesto}|${ciudad ?? ''}|${area ?? ''}`

// 0 base, 1 área, 2 ciudad, 3 ciudad y área: el orden en que se aplican
export const nivelDe = (a: { ciudad: string | null; area: string | null }) => (a.ciudad ? 2 : 0) + (a.area ? 1 : 0)

export const alcanceDe = (r: ReglaDotacion): Alcance =>
  ({ linea_negocio: r.linea_negocio, puesto: normalizarPuesto(r.puesto), ciudad: r.ciudad, area: r.area })

// Aplica las reglas de la más general a la más específica: cada una quita y luego agrega
export function articulosEfectivos(cadena: ReglaDotacion[]): string[] {
  let articulos: string[] = []
  for (const r of cadena) {
    articulos = articulos.filter((a) => !r.quita.includes(a))
    for (const a of r.agrega) if (!articulos.includes(a)) articulos.push(a)
  }
  return articulos
}

export function indexarReglas(reglas: ReglaDotacion[]): (c: PerfilColaborador) => ReglaDotacion[] {
  const mapa = new Map(reglas.map((r) => [llave(r.linea_negocio, normalizarPuesto(r.puesto), r.ciudad, r.area), r]))
  return (c) => {
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) return []
    const area = c.area || null
    const ciudad = c.ciudad || null
    const candidatas = [
      mapa.get(llave(c.linea_negocio, puesto, null, null)),
      area ? mapa.get(llave(c.linea_negocio, puesto, null, area)) : undefined,
      ciudad ? mapa.get(llave(c.linea_negocio, puesto, ciudad, null)) : undefined,
      ciudad && area ? mapa.get(llave(c.linea_negocio, puesto, ciudad, area)) : undefined,
    ]
    return candidatas.filter((r): r is ReglaDotacion => r !== undefined)
  }
}

// null cuando ninguna regla aplica al colaborador
export function resolverArticulos(reglas: ReglaDotacion[], c: PerfilColaborador): string[] | null {
  const cadena = indexarReglas(reglas)(c)
  return cadena.length === 0 ? null : articulosEfectivos(cadena)
}

export interface DotacionResuelta { prendas: string[]; tipos_epp: string[] }

// null cuando el colaborador no tiene regla ni de uniforme ni de EPP
export function indexarDotacion(d: Dotacion): (c: PerfilColaborador) => DotacionResuelta | null {
  const uniforme = indexarReglas(d.uniforme)
  const epp = indexarReglas(d.epp)
  return (c) => {
    const u = uniforme(c)
    const e = epp(c)
    if (u.length === 0 && e.length === 0) return null
    return { prendas: articulosEfectivos(u), tipos_epp: articulosEfectivos(e) }
  }
}

// Reglas más generales del mismo puesto que se aplican antes que este alcance
function previas(reglas: ReglaDotacion[], a: Alcance): ReglaDotacion[] {
  const mismas = reglas.filter((r) => r.linea_negocio === a.linea_negocio && normalizarPuesto(r.puesto) === a.puesto)
  const buscar = (ciudad: string | null, area: string | null) => mismas.find((r) => r.ciudad === ciudad && r.area === area)
  const orden = a.ciudad && a.area ? [buscar(null, null), buscar(null, a.area), buscar(a.ciudad, null)]
    : a.ciudad || a.area ? [buscar(null, null)] : []
  return orden.filter((r): r is ReglaDotacion => r !== undefined)
}

export const reglasPrevias = previas

// Lo que el alcance recibe de las reglas más generales, antes de su propio cambio
export const padreEfectivo = (reglas: ReglaDotacion[], a: Alcance): string[] => articulosEfectivos(previas(reglas, a))

export function aDelta(padre: string[], deseados: string[]): { agrega: string[]; quita: string[] } {
  return { agrega: deseados.filter((a) => !padre.includes(a)), quita: padre.filter((a) => !deseados.includes(a)) }
}

export interface Deseada { linea_negocio: string; puesto_etiqueta: string; ciudad: string | null; area: string | null; articulos: string[] }

// Convierte listas completas en cambios frente a lo heredado, de lo general a lo específico
export function planearDeltas(existentes: ReglaDotacion[], deseadas: Deseada[]): ReglaDotacion[] {
  const trabajo = new Map(existentes.map((r) => [r.id, r]))
  const planeadas: ReglaDotacion[] = []
  for (const d of [...deseadas].sort((a, b) => nivelDe(a) - nivelDe(b))) {
    const puesto = normalizarPuesto(d.puesto_etiqueta)
    const alcance = { linea_negocio: d.linea_negocio, puesto, ciudad: d.ciudad, area: d.area }
    const regla: ReglaDotacion = {
      id: idRegla(d.linea_negocio, puesto, d.ciudad, d.area), linea_negocio: d.linea_negocio, puesto,
      puesto_etiqueta: aTitulo(d.puesto_etiqueta), ciudad: d.ciudad, area: d.area,
      ...aDelta(padreEfectivo(Array.from(trabajo.values()), alcance), Array.from(new Set(d.articulos))),
    }
    trabajo.set(regla.id, regla)
    planeadas.push(regla)
  }
  return planeadas
}

const coincide = (r: Alcance, c: PerfilColaborador) =>
  r.linea_negocio === c.linea_negocio && r.puesto === normalizarPuesto(c.puesto ?? '')
  && (!r.ciudad || r.ciudad === c.ciudad) && (!r.area || r.area === c.area)

// Colaboradores activos a los que alcanza el ámbito de la regla
export const colaboradoresAlcanzados = (a: Alcance, colaboradores: ColaboradorRegla[]): number =>
  colaboradores.filter((c) => c.activo !== false && coincide(a, c)).length

// Combinaciones de colaboradores activos sin regla; sinDatos son los que no traen puesto o empresa
export function combinacionesSinRegla(
  colaboradores: ColaboradorRegla[], reglas: ReglaDotacion[],
): { pendientes: CombinacionPendiente[]; sinDatos: number } {
  const cadena = indexarReglas(reglas)
  const grupos = new Map<string, CombinacionPendiente>()
  let sinDatos = 0
  for (const c of colaboradores) {
    if (c.activo === false) continue
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) { sinDatos++; continue }
    if (cadena(c).length > 0) continue
    const clave = llave(c.linea_negocio, puesto, c.ciudad, null)
    const actual = grupos.get(clave)
    if (actual) actual.colaboradores++
    else grupos.set(clave, { linea_negocio: c.linea_negocio, puesto, puesto_etiqueta: aTitulo(c.puesto ?? ''), ciudad: c.ciudad, colaboradores: 1 })
  }
  const pendientes = Array.from(grupos.values()).sort((a, b) =>
    a.linea_negocio.localeCompare(b.linea_negocio) || a.puesto.localeCompare(b.puesto) || a.ciudad.localeCompare(b.ciudad))
  return { pendientes, sinDatos }
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

export type Gravedad = 'info' | 'aviso' | 'error'
export type CodigoHallazgo = 'sobrescribe' | 'redundante' | 'quita' | 'sin_efecto' | 'conflicto'

export interface Hallazgo {
  codigo: CodigoHallazgo
  gravedad: Gravedad
  // Artículos implicados, en valores de catálogo
  articulos: string[]
  // Reglas con las que se relaciona
  con: string[]
}

export interface Diagnostico {
  regla: ReglaDotacion
  previas: ReglaDotacion[]
  heredados: string[]
  efectivos: string[]
  colaboradores: number
  hallazgos: Hallazgo[]
}

const compartidos = (a: string[], b: string[]) => a.filter((x) => b.includes(x))

// Cruzadas: una de ciudad sin área y otra de área sin ciudad del mismo puesto; ninguna contiene a la otra
function cruzadas(a: ReglaDotacion, b: ReglaDotacion): boolean {
  return a.linea_negocio === b.linea_negocio && normalizarPuesto(a.puesto) === normalizarPuesto(b.puesto)
    && a.ciudad !== null && a.area === null && b.ciudad === null && b.area !== null
}

export function diagnosticar(reglas: ReglaDotacion[], colaboradores: ColaboradorRegla[]): Map<string, Diagnostico> {
  const activos = colaboradores.filter((c) => c.activo !== false)
  const resultado = new Map<string, Diagnostico>()
  for (const r of reglas) {
    const alcance = alcanceDe(r)
    const anteriores = previas(reglas, alcance)
    const heredados = articulosEfectivos(anteriores)
    const hallazgos: Hallazgo[] = []
    const nuevos = r.agrega.filter((a) => !heredados.includes(a))
    const ya = compartidos(r.agrega, heredados)
    const quitados = compartidos(r.quita, heredados)
    const con = anteriores.map((p) => p.id)
    if (anteriores.length > 0) {
      if (nuevos.length === 0 && quitados.length === 0) hallazgos.push({ codigo: 'redundante', gravedad: 'aviso', articulos: [], con })
      else {
        if (ya.length > 0) hallazgos.push({ codigo: 'redundante', gravedad: 'aviso', articulos: ya, con })
        hallazgos.push({ codigo: 'sobrescribe', gravedad: 'info', articulos: [], con })
      }
      if (quitados.length > 0) hallazgos.push({ codigo: 'quita', gravedad: 'aviso', articulos: quitados, con })
    }
    const alcanzados = colaboradoresAlcanzados(alcance, activos)
    if (alcanzados === 0) hallazgos.push({ codigo: 'sin_efecto', gravedad: 'aviso', articulos: [], con: [] })
    for (const otra of reglas) {
      if (!cruzadas(r, otra) && !cruzadas(otra, r)) continue
      const choque = [...compartidos(r.agrega, otra.quita), ...compartidos(r.quita, otra.agrega)]
      if (choque.length === 0) continue
      const ambas = activos.filter((c) => coincide(alcance, c) && coincide(alcanceDe(otra), c)).length
      if (ambas > 0) hallazgos.push({ codigo: 'conflicto', gravedad: 'error', articulos: Array.from(new Set(choque)), con: [otra.id] })
    }
    resultado.set(r.id, {
      regla: r, previas: anteriores, heredados, efectivos: articulosEfectivos([...anteriores, r]), colaboradores: alcanzados, hallazgos,
    })
  }
  return resultado
}

// Reglas que no cambian nada frente a lo que heredan; se excluyen las que participan en un conflicto
export function redundantesEliminables(diagnosticos: Map<string, Diagnostico>): ReglaDotacion[] {
  const enConflicto = new Set<string>()
  for (const d of diagnosticos.values()) {
    for (const h of d.hallazgos) if (h.codigo === 'conflicto') { enConflicto.add(d.regla.id); h.con.forEach((id) => enConflicto.add(id)) }
  }
  return Array.from(diagnosticos.values())
    .filter((d) => !enConflicto.has(d.regla.id) && d.hallazgos.some((h) => h.codigo === 'redundante' && h.articulos.length === 0))
    .map((d) => d.regla)
}
