import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { leerConfiguracion } from './configuracion'

// Accesos estáticos: Next.js solo incrusta process.env.NEXT_PUBLIC_* escritos así
const { baseDatos, dominioPermitido } = leerConfiguracion({
  NEXT_PUBLIC_FIRESTORE_DATABASE: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE,
  NEXT_PUBLIC_DOMINIO_PERMITIDO: process.env.NEXT_PUBLIC_DOMINIO_PERMITIDO,
})

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })

export const auth = getAuth(app)
export const db = getFirestore(app, baseDatos)
export { dominioPermitido }
