import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AlmacenEntregas, MapeoArticulo } from '@/application/entregas-sync'
import type { DestinoEntrega } from '@/domain/entregas-hoja'

const DESTINOS: DestinoEntrega[] = ['uniforme', 'epp', 'equipo']
const TAMANO_LOTE = 400
const TAMANO_LECTURA = 300

// Los Timestamp de Firestore se vuelven Date para compararlos con los datos nuevos
const aFechas = (datos: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v && typeof (v as { toDate?: unknown }).toDate === 'function' ? (v as { toDate(): Date }).toDate() : v]))

export function crearAlmacenEntregas(db: Firestore, actor: string): AlmacenEntregas {
  return {
    async leerMapeo() {
      const snap = await db.collection('articulos_hoja').get()
      const mapeo = new Map<string, MapeoArticulo>()
      for (const d of snap.docs) {
        const { destino, valor } = d.data()
        if (DESTINOS.includes(destino) && typeof valor === 'string' && valor) mapeo.set(d.id, { destino, valor })
      }
      return mapeo
    },
    async leerIndice(ids) {
      const uids = new Map<string, string>()
      for (let i = 0; i < ids.length; i += TAMANO_LECTURA) {
        const lote = ids.slice(i, i + TAMANO_LECTURA)
        const docs = await db.getAll(...lote.map((id) => db.doc(`indice_id_interno/${id}`)))
        docs.forEach((d, j) => { const uid = d.data()?.uid; if (typeof uid === 'string') uids.set(lote[j], uid) })
      }
      return uids
    },
    async leerColaborador(uid) {
      const snap = await db.doc(`colaboradores/${uid}`).get()
      return snap.exists ? (snap.data() ?? null) : null
    },
    async leerExistentes(coleccion) {
      const snap = await db.collection(coleccion).where('origen', '==', 'hoja').get()
      return new Map(snap.docs.map((d) => [d.id, aFechas(d.data())]))
    },
    async escribir(operaciones) {
      for (let i = 0; i < operaciones.length; i += TAMANO_LOTE) {
        const lote = db.batch()
        for (const op of operaciones.slice(i, i + TAMANO_LOTE)) {
          const marca = { actualizado_por: actor, actualizado_en: FieldValue.serverTimestamp() }
          const alta = op.nuevo ? { creado_por: actor, creado_en: FieldValue.serverTimestamp() } : {}
          lote.set(db.doc(`${op.coleccion}/${op.id}`), { ...op.datos, ...alta, ...marca }, { merge: true })
        }
        await lote.commit()
      }
    },
  }
}
