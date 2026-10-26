import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import {
  almacenSoloLectura, sincronizarColaboradores, type Instantanea, type ResultadoSincronizacion,
} from '@/application/colaboradores-servidor'
import { adminDb } from './admin'
import { crearAlmacenAdmin } from './almacen-admin'
import { leerHoja } from './hoja'

export type EjecucionSincronizacion = { ok: true; resultado: ResultadoSincronizacion } | { ok: false; error: string }

const CATALOGOS = ['ciudades', 'areas', 'lineas_negocio']

export async function ejecutarSincronizacion(actor: string, simular: boolean): Promise<EjecucionSincronizacion> {
  const db = adminDb()
  const [{ dato: hoja, desactualizado }, snap, catalogos] = await Promise.all([
    leerHoja(true),
    db.collection('colaboradores').get(),
    db.getAll(...CATALOGOS.map((c) => db.doc(`catalogos/${c}`))),
  ])
  // Con datos viejos o vacíos no se sincroniza: se desactivaría a gente por error
  if (desactualizado || hoja.length === 0) return { ok: false, error: 'La hoja no se pudo leer o viene vacía; no se sincronizó nada' }
  const existentes = snap.docs.map((d) => ({
    id: d.id,
    nombre: String(d.data().nombre ?? d.id),
    id_interno: typeof d.data().id_interno === 'string' ? (d.data().id_interno as string) : null,
  }))
  const instantanea: Instantanea = {
    colaboradores: new Map(snap.docs.flatMap((d) => {
      const id = d.data().id_interno
      return typeof id === 'string' ? [[id, d.data()] as const] : []
    })),
    catalogos: Object.fromEntries(CATALOGOS.map((c, i) => [c, (catalogos[i].data()?.items ?? []) as ItemCatalogo[]])),
  }
  const almacen = crearAlmacenAdmin(db, actor)
  const resultado = await sincronizarColaboradores(simular ? almacenSoloLectura(almacen) : almacen, hoja, existentes, instantanea)
  if (resultado.errores.length) console.warn(`Sincronización de colaboradores: ${resultado.errores.length} filas con error`)
  return { ok: true, resultado }
}
