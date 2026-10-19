import { ALCANCES, planearReinicio, type AlcanceReinicio, type DocumentoRespaldo, type PlanReinicio } from '@/application/reinicio-dotacion'
import { adminDb } from './admin'

type Db = ReturnType<typeof adminDb>

const serializable = (v: unknown): unknown => {
  if (v && typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate(): Date }).toDate().toISOString()
  if (Array.isArray(v)) return v.map(serializable)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializable(x)]))
  return v
}

async function leerColeccion(db: Db, nombre: string): Promise<DocumentoRespaldo[]> {
  const snap = await db.collection(nombre).get()
  return snap.docs.map((d) => ({ id: d.id, data: serializable(d.data()) as Record<string, unknown> }))
}

// Lee solo lo que el alcance toca y calcula el plan
export async function planearDesdeFirestore(db: Db, alcances: AlcanceReinicio[]): Promise<PlanReinicio> {
  const defs = alcances.map((a) => ALCANCES[a])
  const catalogos: Record<string, Record<string, unknown> | undefined> = {}
  for (const { catalogo } of defs) {
    const snap = await db.doc(`catalogos/${catalogo}`).get()
    catalogos[catalogo] = snap.exists ? (serializable(snap.data()) as Record<string, unknown>) : undefined
  }
  const colecciones: Record<string, DocumentoRespaldo[]> = {}
  for (const { coleccion } of defs) if (coleccion) colecciones[coleccion] = await leerColeccion(db, coleccion)
  return planearReinicio(alcances, { catalogos, colecciones, articulos: await leerColeccion(db, 'articulos_hoja') })
}

// Borra por lotes y deja vacío el catálogo; el respaldo lo descarga el usuario antes
export async function aplicarReinicio(db: Db, plan: PlanReinicio): Promise<void> {
  for (const { coleccion, ids } of plan.borrar) {
    for (let i = 0; i < ids.length; i += 400) {
      const lote = db.batch()
      for (const id of ids.slice(i, i + 400)) lote.delete(db.collection(coleccion).doc(id))
      await lote.commit()
    }
  }
  for (const id of plan.vaciar) await db.doc(`catalogos/${id}`).set({ items: [] }, { merge: true })
}
