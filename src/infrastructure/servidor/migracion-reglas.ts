import { FieldValue } from 'firebase-admin/firestore'
import { planearMigracion } from '@/application/migracion-reglas'
import { COLECCION_REGLAS, COLECCION_REGLAS_ANTERIOR, type ReglaDotacion, type TipoRegla } from '@/domain/reglas-dotacion'
import { adminDb } from './admin'

type Db = ReturnType<typeof adminDb>

async function escribir(db: Db, tipo: TipoRegla, reglas: ReglaDotacion[], actor: string) {
  for (let i = 0; i < reglas.length; i += 400) {
    const lote = db.batch()
    for (const r of reglas.slice(i, i + 400)) {
      const marca = FieldValue.serverTimestamp()
      lote.set(db.doc(`${COLECCION_REGLAS[tipo]}/${r.id}`), {
        linea_negocio: r.linea_negocio, puesto: r.puesto, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area,
        agrega: r.agrega, quita: r.quita, creado_por: actor, creado_en: marca, actualizado_por: actor, actualizado_en: marca,
      })
    }
    await lote.commit()
  }
}

// Copia las reglas anteriores a uniforme y EPP; no borra las originales y no corre si ya hay reglas nuevas
export async function migrarReglas(db: Db, actor: string): Promise<{ uniforme: number; epp: number } | { error: string }> {
  const [uniforme, epp] = await Promise.all([db.collection(COLECCION_REGLAS.uniforme).limit(1).get(), db.collection(COLECCION_REGLAS.epp).limit(1).get()])
  if (!uniforme.empty || !epp.empty) return { error: 'Ya hay reglas de uniforme o EPP; la migración solo corre sobre una configuración vacía' }
  const anteriores = (await db.collection(COLECCION_REGLAS_ANTERIOR).get()).docs.map((d) => ({ id: d.id, data: d.data() }))
  if (anteriores.length === 0) return { error: 'No hay reglas anteriores que migrar' }
  const plan = planearMigracion(anteriores)
  await escribir(db, 'uniforme', plan.uniforme, actor)
  await escribir(db, 'epp', plan.epp, actor)
  return { uniforme: plan.uniforme.length, epp: plan.epp.length }
}
