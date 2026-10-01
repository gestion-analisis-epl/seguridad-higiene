import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import type { PuertoAlmacenamiento } from '@/application/adjuntos-subida'
import { pedirUrlDescarga } from '@/application/adjuntos-descarga-cliente'
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

// El enlace se pide al usarlo y quien lo llama no debe guardarlo ni registrarlo.
export const obtenerUrlArchivo = (ruta: string): Promise<string> =>
  pedirUrlDescarga(ruta, { obtenerUrl: (r) => getDownloadURL(ref(storage(), r)), esNoEncontrado })

export async function descargarArchivo(ruta: string): Promise<void> {
  const url = await obtenerUrlArchivo(ruta)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
