import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import type { Valores } from '@/domain/modulos'
import { aFirestore, conAuditoria, deFirestore } from './conversion'

export type Registro = { id: string } & Record<string, unknown>

export function suscribir(
  coleccion: string,
  alCambiar: (registros: Registro[]) => void,
  alError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, coleccion),
    (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...deFirestore(d.data()) }))),
    alError,
  )
}

export function suscribirDoc(
  coleccion: string,
  id: string,
  alCambiar: (registro: Registro | null) => void,
  alError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, coleccion, id),
    (snap) => alCambiar(snap.exists() ? { id: snap.id, ...deFirestore(snap.data()) } : null),
    alError,
  )
}

export async function guardar(coleccion: string, valores: Valores, uid: string, id?: string): Promise<string> {
  const datos = aFirestore(valores)
  if (!id) {
    const ref = await addDoc(collection(db, coleccion), conAuditoria(datos, uid, true))
    return ref.id
  }
  const ref = doc(db, coleccion, id)
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria(datos, uid, !existe), { merge: true })
  return id
}

export async function eliminar(coleccion: string, id: string): Promise<void> {
  await deleteDoc(doc(db, coleccion, id))
}
