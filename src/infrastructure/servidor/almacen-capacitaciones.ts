import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AlmacenCapacitaciones } from '@/application/capacitaciones-sync'

const TAMANO_LOTE = 400

const aFecha = (v: unknown): Date | null =>
  v && typeof (v as { toDate?: unknown }).toDate === 'function' ? (v as { toDate(): Date }).toDate() : null

export function crearAlmacenCapacitaciones(db: Firestore, actor: string): AlmacenCapacitaciones {
  return {
    async leerColaboradores() {
      const snap = await db.collection('colaboradores').get()
      return snap.docs.map((d) => {
        const x = d.data()
        return { id: d.id, nombre: String(x.nombre ?? ''), activo: x.activo !== false, ciudad: typeof x.ciudad === 'string' ? x.ciudad : null }
      })
    },
    async leerNormas() {
      const items = (await db.doc('catalogos/normas').get()).data()?.items
      return Array.isArray(items)
        ? items.filter((i) => typeof i?.valor === 'string' && typeof i?.etiqueta === 'string').map((i) => ({ valor: i.valor as string, etiqueta: i.etiqueta as string }))
        : []
    },
    async leerCapacitaciones() {
      const snap = await db.collection('capacitaciones').get()
      return snap.docs.map((d) => {
        const x = d.data()
        return {
          id: d.id, colaborador_id: String(x.colaborador_id ?? ''), norma: String(x.norma ?? ''),
          cumple: x.cumple === true, fecha: aFecha(x.fecha), vencimiento: aFecha(x.vencimiento),
        }
      })
    },
    async escribir(operaciones) {
      for (let i = 0; i < operaciones.length; i += TAMANO_LOTE) {
        const lote = db.batch()
        for (const op of operaciones.slice(i, i + TAMANO_LOTE)) {
          const ref = op.id ? db.doc(`capacitaciones/${op.id}`) : db.collection('capacitaciones').doc()
          const marca = { actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp() }
          const alta = op.nuevo ? { creado_por: actor, creado_en: FieldValue.serverTimestamp() } : {}
          lote.set(ref, { ...op.datos, ...alta, ...marca }, { merge: true })
        }
        await lote.commit()
      }
    },
  }
}
