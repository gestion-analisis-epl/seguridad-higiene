import { deleteObject, getBlob, ref, uploadBytesResumable } from 'firebase/storage'
import type { PuertoAlmacenamiento } from '@/application/adjuntos-subida'
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

async function obtenerBlob(ruta: string): Promise<Blob> {
  try {
    return await getBlob(ref(storage(), ruta))
  } catch {
    return getBlob(ref(storage(), ruta))
  }
}

// Descarga con sesión y reglas (sin enlaces públicos); un reintento si falla.
export async function descargarArchivo(ruta: string, nombre: string, tipo: string): Promise<void> {
  const blob = await obtenerBlob(ruta)
  const url = URL.createObjectURL(new Blob([blob], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
