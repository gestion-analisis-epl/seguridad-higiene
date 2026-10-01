import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import type { PuertoMetadatos } from '@/application/adjuntos-subida'
import { rutaAdjunto, type Adjunto, type ModuloAdjunto } from '@/domain/adjuntos'
import { db } from '@/infrastructure/firebase/cliente'
import { esNoEncontrado } from '@/infrastructure/storage/almacenamiento'
import { storage } from '@/infrastructure/storage/cliente'

const COLECCION = 'adjuntos'

export function crearMetadatosFirestore(uid: string): PuertoMetadatos {
  return {
    crear: async (a) => (await addDoc(collection(db, COLECCION), { ...a, subido_por: uid, subido_en: serverTimestamp() })).id,
    borrar: (id) => deleteDoc(doc(db, COLECCION, id)),
  }
}

// Reserva el id del documento antes de guardarlo, para ligar archivos a un registro nuevo.
export const reservarId = (coleccion: string): string => doc(collection(db, coleccion)).id

// Borra archivos y documentos del registro; tolera archivos ya inexistentes.
export async function borrarAdjuntosDeRegistro(modulo: ModuloAdjunto, registro_id: string, adjuntos: Adjunto[]): Promise<void> {
  for (const a of adjuntos.filter((x) => x.modulo === modulo && x.registro_id === registro_id)) {
    try {
      await deleteObject(ref(storage(), rutaAdjunto(a)))
    } catch (e) {
      if (!esNoEncontrado(e)) throw e
    }
    await deleteDoc(doc(db, COLECCION, a.id))
  }
}
