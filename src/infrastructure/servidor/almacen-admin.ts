import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import type { AlmacenColaboradores } from '@/application/colaboradores-servidor'

export function crearAlmacenAdmin(db: Firestore, actor: string): AlmacenColaboradores {
  const marca = () => FieldValue.serverTimestamp()
  return {
    transaccion: (fn) => db.runTransaction((t) => fn({
      leerIndice: async (id) => ((await t.get(db.doc(`indice_id_interno/${id}`))).data()?.uid as string | undefined) ?? null,
      leerColaborador: async (uid) => {
        const snap = await t.get(db.doc(`colaboradores/${uid}`))
        return snap.exists ? (snap.data() ?? null) : null
      },
      leerCatalogo: async (id) => ((await t.get(db.doc(`catalogos/${id}`))).data()?.items ?? []) as ItemCatalogo[],
      escribirCatalogo: (id, items) => {
        t.set(db.doc(`catalogos/${id}`), { items, actualizado_por: actor, actualizado_en: marca() }, { merge: true })
      },
      nuevoId: () => db.collection('colaboradores').doc().id,
      crearColaborador: (uid, datos) => {
        t.create(db.doc(`colaboradores/${uid}`), {
          ...datos, creado_por: actor, creado_en: marca(), actualizado_por: actor, actualizado_en: marca(),
        })
      },
      actualizarColaborador: (uid, datos) => {
        t.update(db.doc(`colaboradores/${uid}`), { ...datos, actualizado_por: actor, actualizado_en: marca() })
      },
      quitarIdInterno: (uid) => {
        t.update(db.doc(`colaboradores/${uid}`), { id_interno: FieldValue.delete(), actualizado_por: actor, actualizado_en: marca() })
      },
      escribirIndice: (id, uid) => {
        t.set(db.doc(`indice_id_interno/${id}`), { uid, actualizado_por: actor, actualizado_en: marca() })
      },
      borrarIndice: (id) => { t.delete(db.doc(`indice_id_interno/${id}`)) },
    })),
  }
}
