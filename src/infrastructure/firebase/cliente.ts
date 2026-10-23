import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { leerConfiguracion } from './configuracion'

// Accesos estáticos: Next.js solo incrusta process.env.NEXT_PUBLIC_* escritos así
const { baseDatos, dominioPermitido } = leerConfiguracion({
  NEXT_PUBLIC_FIRESTORE_DATABASE: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE,
  NEXT_PUBLIC_DOMINIO_PERMITIDO: process.env.NEXT_PUBLIC_DOMINIO_PERMITIDO,
})

export const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })

export const auth = getAuth(app)
// Caché en IndexedDB solo en cliente; si ya estaba inicializado reutiliza la instancia
function crearFirestore(): Firestore {
  if (typeof window === 'undefined') return getFirestore(app, baseDatos)
  try {
    return initializeFirestore(
      app,
      { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      baseDatos,
    )
  } catch {
    return getFirestore(app, baseDatos)
  }
}

export const db = crearFirestore()
export { dominioPermitido }
