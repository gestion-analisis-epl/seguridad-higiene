import { deleteObject, ref, uploadBytesResumable } from 'firebase/storage'
import type { PuertoAlmacenamiento } from '@/application/adjuntos-subida'
import { pedirUrlDescarga } from '@/application/adjuntos-descarga-cliente'
import { auth } from '@/infrastructure/firebase/cliente'
import { storage } from './cliente'

export function crearAlmacenamientoStorage(): PuertoAlmacenamiento {
  return {
    subir: (ruta, archivo, alProgreso, senal) =>
      new Promise<void>((ok, falla) => {
        const tarea = uploadBytesResumable(ref(storage(), ruta), archivo, { contentType: archivo.type })
        const alAbortar = () => tarea.cancel()
        if (senal.aborted) alAbortar()
        senal.addEventListener('abort', alAbortar, { once: true })
        tarea.on(
          'state_changed',
          (s) => alProgreso(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
          (e) => { senal.removeEventListener('abort', alAbortar); falla(e) },
          () => { senal.removeEventListener('abort', alAbortar); ok() },
        )
      }),
    borrar: (ruta) => deleteObject(ref(storage(), ruta)),
  }
}

export const esNoEncontrado = (e: unknown): boolean => (e as { code?: string } | null)?.code === 'storage/object-not-found'

// La URL firmada la genera el servidor tras validar sesión y rol; se navega a ella sin leerla desde JS.
export async function descargarArchivo(adjuntoId: string): Promise<void> {
  const url = await pedirUrlDescarga(adjuntoId, {
    token: async () => {
      const u = auth.currentUser
      if (!u) throw new Error('sin sesión')
      return u.getIdToken()
    },
    fetch: (ruta, init) => fetch(ruta, init),
  })
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
