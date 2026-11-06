import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AlmacenBajas } from '@/application/colaboradores-servidor'
import { MODULOS } from '@/domain/modulos-definiciones'

const LOTE_CONSULTA = 30
const LOTE_ESCRITURA = 150

// Colecciones cuyos registros apuntan a un colaborador
const COLECCIONES = Object.values(MODULOS).filter((m) => m.campos.some((c) => c.nombre === 'colaborador_id')).map((m) => m.coleccion)

export function crearAlmacenBajas(db: Firestore, actor: string): AlmacenBajas {
  return {
    async conRegistros(uids) {
      const con = new Set<string>()
      for (let i = 0; i < uids.length; i += LOTE_CONSULTA) {
        const lote = uids.slice(i, i + LOTE_CONSULTA)
        const consultas = await Promise.all(COLECCIONES.map((c) => db.collection(c).where('colaborador_id', 'in', lote).select('colaborador_id').get()))
        for (const snap of consultas) snap.docs.forEach((d) => con.add(String(d.data().colaborador_id)))
      }
      return con
    },
    async eliminar(uids) {
      for (let i = 0; i < uids.length; i += LOTE_ESCRITURA) {
        const docs = await db.getAll(...uids.slice(i, i + LOTE_ESCRITURA).map((uid) => db.doc(`colaboradores/${uid}`)))
        const lote = db.batch()
        for (const d of docs.filter((x) => x.exists)) {
          const datos = d.data() ?? {}
          lote.set(db.collection('respaldo_colaboradores_eliminados').doc(), {
            uid: d.id, datos, eliminado_por: actor, eliminado_en: FieldValue.serverTimestamp(),
          })
          lote.delete(d.ref)
          if (typeof datos.id_interno === 'string') lote.delete(db.doc(`indice_id_interno/${datos.id_interno}`))
        }
        await lote.commit()
      }
    },
  }
}
