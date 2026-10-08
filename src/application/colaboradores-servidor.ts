import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import { resolverEntradaCatalogo, type ColaboradorHoja } from '@/domain/colaboradores-hoja'
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

const datosDeHoja = (f: ColaboradorHoja) => ({
  id_interno: f.id_interno, numero_colaborador: f.numero, puesto: f.puesto, zona: f.zona, plaza: f.plaza,
  empresa: f.empresa, jefe: f.jefe, gerente: f.gerente, motivo_baja: f.motivo_baja,
  fecha_baja: f.fecha_baja ? deTextoIso(f.fecha_baja) : null,
})

export async function asegurarColaborador(almacen: AlmacenColaboradores, fila: ColaboradorHoja) {
  if (fila.fecha_baja) throw new ErrorColaborador(409, 'El colaborador está dado de baja en la hoja')
  return almacen.transaccion(async (tx) => {
    const existente = await tx.leerIndice(fila.id_interno)
    if (existente) return { uid: existente, creado: false }
    const { valores, nuevos } = await resolverCatalogos(tx, fila, ['ciudad', 'area', 'linea_negocio'])
    for (const [id, items] of Array.from(nuevos)) tx.escribirCatalogo(id, items)
    const uid = tx.nuevoId()
    tx.crearColaborador(uid, {
      ...datosDeHoja(fila), ...valores, nombre: aTitulo(fila.nombre),
      fecha_ingreso: fila.fecha_ingreso ? deTextoIso(fila.fecha_ingreso) : null, activo: true,
    })
    tx.escribirIndice(fila.id_interno, uid)
    return { uid, creado: true }
  })
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
      ...datosDeHoja(fila), ...valores, ...(fila.fecha_baja ? { activo: false } : {}),
      ...(sobrescribir ? { nombre: aTitulo(fila.nombre), fecha_ingreso: fecha } : actual.fecha_ingreso || !fecha ? {} : { fecha_ingreso: fecha }),
    })
    if (previo && previo !== fila.id_interno) tx.borrarIndice(previo)
    tx.escribirIndice(fila.id_interno, uid)
  })
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
