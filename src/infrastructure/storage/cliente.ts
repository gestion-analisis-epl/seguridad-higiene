import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { app } from '@/infrastructure/firebase/cliente'
import { leerBucket } from '@/infrastructure/firebase/configuracion'

let instancia: FirebaseStorage | null = null

// Perezoso: sin la variable falla al usar Storage, no al importar.
export function storage(): FirebaseStorage {
  if (!instancia) {
    // Acceso estático: Next.js solo incrusta process.env.NEXT_PUBLIC_* escritos así
    const bucket = leerBucket({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET })
    instancia = getStorage(app, `gs://${bucket}`)
  }
  return instancia
}
