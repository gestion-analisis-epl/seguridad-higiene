import { FieldValue } from 'firebase-admin/firestore'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import {
  planearUnion, referenciasDeCatalogo, type Encontrados, type PlanUnion,
} from '@/application/union-catalogos'
import { adminDb } from './admin'

type Db = ReturnType<typeof adminDb>

// Lee solo los registros que apuntan al origen y calcula el plan
export async function planearUnionDesdeFirestore(
  db: Db, catalogo: string, origen: string, destino: string,
): Promise<PlanUnion | { error: string }> {
  const snap = await db.doc(`catalogos/${catalogo}`).get()
  const items = (snap.data()?.items ?? []) as ItemCatalogo[]
  const encontrados: Encontrados[] = []
  for (const referencia of referenciasDeCatalogo(catalogo)) {
    const col = db.collection(referencia.coleccion)
    const consulta = referencia.lista ? col.where(referencia.campo, 'array-contains', origen) : col.where(referencia.campo, '==', origen)
    const docs = await consulta.get()
    encontrados.push({ referencia, docs: docs.docs.map((d) => ({ id: d.id, data: d.data() })) })
  }
  return planearUnion(catalogo, origen, destino, items, encontrados)
}

// Reasigna por lotes y al final guarda el catálogo; repetirlo tras un fallo continúa donde quedó
export async function aplicarUnion(db: Db, catalogo: string, plan: PlanUnion, actor: string): Promise<void> {
  for (let i = 0; i < plan.cambios.length; i += 400) {
    const lote = db.batch()
    for (const c of plan.cambios.slice(i, i + 400)) {
      lote.update(db.collection(c.coleccion).doc(c.id), { ...c.campos, actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp() })
    }
    await lote.commit()
  }
  await db.doc(`catalogos/${catalogo}`).set(
    { items: plan.items, actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp() }, { merge: true },
  )
}
