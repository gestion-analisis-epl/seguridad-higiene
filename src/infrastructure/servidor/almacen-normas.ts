import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AlmacenNormas } from '@/application/normas-obligatorias-sync'

const TAMANO_LOTE = 400

export function crearAlmacenNormas(db: Firestore, actor: string): AlmacenNormas {
  return {
    async leerColaboradores() {
      const snap = await db.collection('colaboradores').get()
      return snap.docs.map((d) => {
        const x = d.data()
        const normas = Array.isArray(x.normas_obligatorias) ? x.normas_obligatorias.filter((n): n is string => typeof n === 'string') : []
        return { id: d.id, nombre: String(x.nombre ?? ''), activo: x.activo !== false, normas }
      })
    },
    async leerNormas() {
      const items = (await db.doc('catalogos/normas').get()).data()?.items
      return Array.isArray(items)
        ? items.filter((i) => typeof i?.valor === 'string' && typeof i?.etiqueta === 'string').map((i) => ({ valor: i.valor as string, etiqueta: i.etiqueta as string }))
        : []
    },
    async guardar(asignaciones) {
      for (let i = 0; i < asignaciones.length; i += TAMANO_LOTE) {
        const lote = db.batch()
        for (const a of asignaciones.slice(i, i + TAMANO_LOTE)) {
          lote.update(db.doc(`colaboradores/${a.id}`), {
            normas_obligatorias: a.normas, actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp(),
          })
        }
        await lote.commit()
      }
    },
  }
}
