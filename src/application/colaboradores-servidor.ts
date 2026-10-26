import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import { normalizarNombre, planearImportacion, resolverEntradaCatalogo, type ColaboradorHoja, type ExistenteEnlace } from '@/domain/colaboradores-hoja'
import { deTextoIso } from '@/domain/fechas'
import { aTitulo } from '@/domain/texto'

export interface TxColaboradores {
  leerIndice(idInterno: string): Promise<string | null>
  leerColaborador(uid: string): Promise<Record<string, unknown> | null>
  leerCatalogo(id: string): Promise<ItemCatalogo[]>
  escribirCatalogo(id: string, items: ItemCatalogo[]): void
  nuevoId(): string
  crearColaborador(uid: string, datos: Record<string, unknown>): void
  actualizarColaborador(uid: string, datos: Record<string, unknown>): void
  quitarIdInterno(uid: string): void
  escribirIndice(idInterno: string, uid: string): void
  borrarIndice(idInterno: string): void
}

export interface AlmacenColaboradores {
  transaccion<T>(fn: (tx: TxColaboradores) => Promise<T>): Promise<T>
}

export class ErrorColaborador extends Error {
  constructor(readonly estado: number, mensaje: string) { super(mensaje) }
}

type CampoCatalogo = 'ciudad' | 'area' | 'linea_negocio'
const CATALOGOS: { campo: CampoCatalogo; catalogo: string; texto: (f: ColaboradorHoja) => string; obligatorio: boolean; origen: string }[] = [
  { campo: 'ciudad', catalogo: 'ciudades', texto: (f) => f.plaza, obligatorio: true, origen: 'Plaza' },
  { campo: 'area', catalogo: 'areas', texto: (f) => f.departamento, obligatorio: false, origen: 'Departamento' },
  { campo: 'linea_negocio', catalogo: 'lineas_negocio', texto: (f) => f.empresa, obligatorio: true, origen: 'Empresa' },
]

// Lee los catálogos necesarios antes de cualquier escritura, como exigen las transacciones
async function resolverCatalogos(tx: TxColaboradores, fila: ColaboradorHoja, campos: CampoCatalogo[]) {
  const valores: Partial<Record<CampoCatalogo, string | null>> = {}
  const nuevos = new Map<string, ItemCatalogo[]>()
  for (const c of CATALOGOS.filter((x) => campos.includes(x.campo))) {
    const items = await tx.leerCatalogo(c.catalogo)
    const entrada = resolverEntradaCatalogo(items, c.texto(fila))
    if (!entrada) {
      if (c.obligatorio) throw new ErrorColaborador(422, `La hoja no trae ${c.origen} para este colaborador`)
      valores[c.campo] = null
      continue
    }
    valores[c.campo] = entrada.valor
    if (entrada.nueva) nuevos.set(c.catalogo, [...items, { valor: entrada.valor, etiqueta: entrada.etiqueta }])
  }
  return { valores, nuevos }
}

const camposMovibles = (f: ColaboradorHoja) => ({
  puesto: f.puesto, zona: f.zona, plaza: f.plaza, empresa: f.empresa, jefe: f.jefe, gerente: f.gerente,
  motivo_baja: f.motivo_baja, fecha_baja: f.fecha_baja ? deTextoIso(f.fecha_baja) : null,
})

const datosDeHoja = (f: ColaboradorHoja) => ({ id_interno: f.id_interno, numero_colaborador: f.numero, ...camposMovibles(f) })

export async function asegurarColaborador(
  almacen: AlmacenColaboradores, fila: ColaboradorHoja, { permitirInactivo = false } = {},
) {
  if (fila.inactivo && !permitirInactivo) throw new ErrorColaborador(409, 'El colaborador está inactivo en la hoja')
  return almacen.transaccion(async (tx) => {
    const existente = await tx.leerIndice(fila.id_interno)
    if (existente) return { uid: existente, creado: false }
    const { valores, nuevos } = await resolverCatalogos(tx, fila, ['ciudad', 'area', 'linea_negocio'])
    for (const [id, items] of Array.from(nuevos)) tx.escribirCatalogo(id, items)
    const uid = tx.nuevoId()
    tx.crearColaborador(uid, {
      ...datosDeHoja(fila), ...valores, nombre: aTitulo(fila.nombre),
      fecha_ingreso: fila.fecha_ingreso ? deTextoIso(fila.fecha_ingreso) : null, activo: !fila.inactivo,
    })
    tx.escribirIndice(fila.id_interno, uid)
    return { uid, creado: true }
  })
}

export interface ResultadoImportacion { creados: number; errores: { id_interno: string; nombre: string; error: string }[] }

// Una transacción por fila para que un fallo no frene al resto
export async function importarColaboradores(almacen: AlmacenColaboradores, filas: ColaboradorHoja[]): Promise<ResultadoImportacion> {
  const resultado: ResultadoImportacion = { creados: 0, errores: [] }
  for (const fila of filas) {
    try {
      if ((await asegurarColaborador(almacen, fila, { permitirInactivo: true })).creado) resultado.creados++
    } catch (e) {
      const error = e instanceof ErrorColaborador ? e.message : 'No se pudo crear'
      resultado.errores.push({ id_interno: fila.id_interno, nombre: fila.nombre, error })
    }
  }
  return resultado
}

export async function vincularColaborador(
  almacen: AlmacenColaboradores, uid: string, fila: ColaboradorHoja, { sobrescribir = false } = {},
) {
  await almacen.transaccion(async (tx) => {
    const dueno = await tx.leerIndice(fila.id_interno)
    if (dueno && dueno !== uid) throw new ErrorColaborador(409, 'Esa fila ya está vinculada a otro colaborador')
    const actual = await tx.leerColaborador(uid)
    if (!actual) throw new ErrorColaborador(404, 'El colaborador no existe')
    const previo = typeof actual.id_interno === 'string' ? actual.id_interno : null
    if (previo && previo !== fila.id_interno && !sobrescribir) {
      throw new ErrorColaborador(409, 'El colaborador ya está vinculado a otra fila')
    }
    const campos = CATALOGOS.map((c) => c.campo).filter((campo) => sobrescribir || !actual[campo])
    const { valores, nuevos } = await resolverCatalogos(tx, fila, campos)
    for (const [id, items] of Array.from(nuevos)) tx.escribirCatalogo(id, items)
    const fecha = fila.fecha_ingreso ? deTextoIso(fila.fecha_ingreso) : null
    tx.actualizarColaborador(uid, {
      ...datosDeHoja(fila), ...valores, ...(fila.inactivo ? { activo: false } : {}),
      ...(sobrescribir ? { nombre: aTitulo(fila.nombre), fecha_ingreso: fecha } : actual.fecha_ingreso || !fecha ? {} : { fecha_ingreso: fecha }),
    })
    if (previo && previo !== fila.id_interno) tx.borrarIndice(previo)
    tx.escribirIndice(fila.id_interno, uid)
  })
}

const comparable = (v: unknown) => (v instanceof Date ? v.getTime()
  : v && typeof v === 'object' && 'toMillis' in v ? (v as { toMillis(): number }).toMillis() : v ?? null)

const cambiosPropuestos = (fila: ColaboradorHoja, actual: Record<string, unknown>, valores: Partial<Record<CampoCatalogo, string | null>>) =>
  Object.fromEntries(
    Object.entries({ ...camposMovibles(fila), ...valores, activo: !fila.inactivo }).filter(([k, v]) => comparable(actual[k]) !== comparable(v)),
  )

export type CambioSincronizado = 'sin_cambios' | 'actualizado' | 'reactivado' | 'desactivado'

// Aplica la hoja a un colaborador ya vinculado; nombre, fecha de ingreso, id y número no se tocan
export async function actualizarDesdeHoja(almacen: AlmacenColaboradores, fila: ColaboradorHoja): Promise<CambioSincronizado> {
  return almacen.transaccion(async (tx) => {
    const uid = await tx.leerIndice(fila.id_interno)
    const actual = uid ? await tx.leerColaborador(uid) : null
    if (!uid || !actual) return 'sin_cambios'
    const { valores, nuevos } = await resolverCatalogos(tx, fila, ['ciudad', 'area', 'linea_negocio'])
    const cambios = cambiosPropuestos(fila, actual, valores)
    if (Object.keys(cambios).length === 0) return 'sin_cambios'
    for (const [id, items] of Array.from(nuevos)) tx.escribirCatalogo(id, items)
    tx.actualizarColaborador(uid, cambios)
    if (!('activo' in cambios)) return 'actualizado'
    return fila.inactivo ? 'desactivado' : 'reactivado'
  })
}

// Lee de verdad pero descarta las escrituras, para ver qué cambiaría una sincronización
export function almacenSoloLectura(almacen: AlmacenColaboradores): AlmacenColaboradores {
  const nada = () => {}
  return {
    transaccion: (fn) => almacen.transaccion((tx) => fn({
      ...tx, escribirCatalogo: nada, crearColaborador: nada, actualizarColaborador: nada,
      quitarIdInterno: nada, escribirIndice: nada, borrarIndice: nada,
    })),
  }
}

// Fila de la hoja que coincide en nombre con colaboradores sin vincular: se decide a mano si es uno de ellos o uno nuevo
export interface PendienteSincronizacion {
  id_interno: string; nombre: string; inactivo: boolean; candidatos: { uid: string; nombre: string }[]
}

export interface ResultadoSincronizacion {
  creados: number; actualizados: number; reactivados: number; desactivados: number; omitidos: number
  pendientes: PendienteSincronizacion[]
  errores: { id_interno: string; nombre: string; error: string }[]
}

// Lo ya leído de la base: evita abrir una transacción por cada fila que no cambia
export interface Instantanea {
  colaboradores: Map<string, Record<string, unknown>>
  catalogos: Record<string, ItemCatalogo[]>
}

// Solo es true si con certeza no hay nada que escribir; ante la duda se decide dentro de la transacción
function sinCambiosEnMemoria(fila: ColaboradorHoja, { colaboradores, catalogos }: Instantanea): boolean {
  const actual = colaboradores.get(fila.id_interno)
  if (!actual) return false
  const valores: Partial<Record<CampoCatalogo, string | null>> = {}
  for (const c of CATALOGOS) {
    const entrada = resolverEntradaCatalogo(catalogos[c.catalogo] ?? [], c.texto(fila))
    if (entrada?.nueva || (!entrada && c.obligatorio)) return false
    valores[c.campo] = entrada?.valor ?? null
  }
  return Object.keys(cambiosPropuestos(fila, actual, valores)).length === 0
}

const COMPETENCIA = 8

// Altas de activos, cambios de estado y movimientos de los vinculados; los inactivos sin vincular no se crean
export async function sincronizarColaboradores(
  almacen: AlmacenColaboradores, hoja: ColaboradorHoja[], existentes: ExistenteEnlace[], instantanea?: Instantanea,
): Promise<ResultadoSincronizacion> {
  const resultado: ResultadoSincronizacion = { creados: 0, actualizados: 0, reactivados: 0, desactivados: 0, omitidos: 0, pendientes: [], errores: [] }
  const { crear, omitidas } = planearImportacion(existentes, hoja)
  const porCrear = new Set(crear.map((f) => f.id_interno))
  const porNombre = new Set(omitidas.map((f) => f.id_interno))
  async function procesar(fila: ColaboradorHoja) {
    try {
      if (porNombre.has(fila.id_interno)) {
        resultado.omitidos++
        const clave = normalizarNombre(fila.nombre)
        const candidatos = existentes.filter((e) => !e.id_interno && normalizarNombre(e.nombre) === clave).map((e) => ({ uid: e.id, nombre: e.nombre }))
        resultado.pendientes.push({ id_interno: fila.id_interno, nombre: fila.nombre, inactivo: fila.inactivo, candidatos })
      } else if (porCrear.has(fila.id_interno)) {
        if (!fila.inactivo && (await asegurarColaborador(almacen, fila)).creado) resultado.creados++
      } else if (!(instantanea && sinCambiosEnMemoria(fila, instantanea))) {
        const cambio = await actualizarDesdeHoja(almacen, fila)
        if (cambio === 'actualizado') resultado.actualizados++
        else if (cambio === 'reactivado') resultado.reactivados++
        else if (cambio === 'desactivado') resultado.desactivados++
      }
    } catch (e) {
      const error = e instanceof ErrorColaborador ? e.message : 'No se pudo sincronizar'
      resultado.errores.push({ id_interno: fila.id_interno, nombre: fila.nombre, error })
    }
  }
  // Cada transacción tarda cientos de ms en la red: se corren varias a la vez
  let siguiente = 0
  await Promise.all(Array.from({ length: Math.min(COMPETENCIA, hoja.length) }, async () => {
    while (siguiente < hoja.length) await procesar(hoja[siguiente++])
  }))
  return resultado
}

export async function desvincularColaborador(almacen: AlmacenColaboradores, uid: string) {
  await almacen.transaccion(async (tx) => {
    const actual = await tx.leerColaborador(uid)
    if (!actual) throw new ErrorColaborador(404, 'El colaborador no existe')
    if (typeof actual.id_interno !== 'string') return
    tx.borrarIndice(actual.id_interno)
    tx.quitarIdInterno(uid)
  })
}
