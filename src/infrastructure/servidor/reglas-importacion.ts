import { FieldValue } from 'firebase-admin/firestore'
import { COLECCION_REGLAS, aRegla, planearDeltas } from '@/domain/reglas-dotacion'
import { validarImportacion, type ReglaImportada, type ValoresCatalogo } from '@/application/reglas-importacion'
import { adminDb } from './admin'

type Db = ReturnType<typeof adminDb>

async function valoresDe(db: Db, id: string): Promise<string[]> {
  const items = ((await db.doc(`catalogos/${id}`).get()).data()?.items ?? []) as { valor?: unknown }[]
  return items.map((i) => i.valor).filter((v): v is string => typeof v === 'string')
}

export async function leerCatalogos(db: Db): Promise<ValoresCatalogo> {
  const [lineas, ciudades, areas, tiposEpp] = await Promise.all(
    ['lineas_negocio', 'ciudades', 'areas', 'tipos_epp'].map((id) => valoresDe(db, id)),
  )
  return { lineas, ciudades, areas, tiposEpp }
}

// Reemplaza el EPP de cada regla importada; se guarda como cambio frente a las reglas más generales de su puesto
export async function guardarReglas(db: Db, reglas: ReglaImportada[], actor: string): Promise<{ creadas: number; actualizadas: number }> {
  const existentes = (await db.collection(COLECCION_REGLAS.epp).get()).docs.map((d) => aRegla({ ...d.data(), id: d.id }))
  const ids = new Set(existentes.map((r) => r.id))
  const plan = planearDeltas(existentes, reglas.map((r) => ({
    linea_negocio: r.linea_negocio, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area, articulos: r.tipos_epp,
  })))
  for (let i = 0; i < plan.length; i += 400) {
    const lote = db.batch()
    for (const r of plan.slice(i, i + 400)) {
      const nueva = !ids.has(r.id)
      const marca = FieldValue.serverTimestamp()
      lote.set(db.doc(`${COLECCION_REGLAS.epp}/${r.id}`), {
        linea_negocio: r.linea_negocio, puesto: r.puesto, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area,
        agrega: r.agrega, quita: r.quita, ...(nueva ? { creado_por: actor, creado_en: marca } : {}),
        actualizado_por: actor, actualizado_en: marca,
      }, { merge: true })
    }
    await lote.commit()
  }
  return { creadas: plan.filter((r) => !ids.has(r.id)).length, actualizadas: plan.filter((r) => ids.has(r.id)).length }
}

export { validarImportacion }
