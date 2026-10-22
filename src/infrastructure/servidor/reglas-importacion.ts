import { FieldValue } from 'firebase-admin/firestore'
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

// Reemplaza el EPP de las reglas que existen y crea el resto; el uniforme de las existentes no se toca
export async function guardarReglas(db: Db, reglas: ReglaImportada[], actor: string): Promise<{ creadas: number; actualizadas: number }> {
  const refs = reglas.map((r) => db.doc(`reglas_dotacion/${r.id}`))
  const existentes = new Set((await db.getAll(...refs)).filter((s) => s.exists).map((s) => s.id))
  for (let i = 0; i < reglas.length; i += 400) {
    const lote = db.batch()
    reglas.slice(i, i + 400).forEach((r, j) => {
      const nueva = !existentes.has(r.id)
      const marca = FieldValue.serverTimestamp()
      lote.set(refs[i + j], {
        linea_negocio: r.linea_negocio, puesto: r.puesto, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area,
        tipos_epp: r.tipos_epp, ...(nueva ? { prendas: [], creado_por: actor, creado_en: marca } : {}),
        actualizado_por: actor, actualizado_en: marca,
      }, { merge: true })
    })
    await lote.commit()
  }
  return { creadas: reglas.length - existentes.size, actualizadas: existentes.size }
}

export { validarImportacion }
