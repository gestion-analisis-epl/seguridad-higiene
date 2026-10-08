import { applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { leerConfiguracion } from '@/infrastructure/firebase/configuracion'

// Accesos estáticos para que Next.js resuelva las variables igual que en el cliente
export const configuracionServidor = () => leerConfiguracion({
  NEXT_PUBLIC_FIRESTORE_DATABASE: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE,
  NEXT_PUBLIC_DOMINIO_PERMITIDO: process.env.NEXT_PUBLIC_DOMINIO_PERMITIDO,
})

// En local FIREBASE_SERVICE_ACCOUNT_JSON; en App Hosting bastan las credenciales por defecto
const credencial = () => {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  return json ? cert(JSON.parse(json)) : applicationDefault()
}

const app = () => (getApps().length
  ? getApp()
  : initializeApp({ credential: credencial(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }))

export const adminAuth = () => getAuth(app())
export const adminDb = () => getFirestore(app(), configuracionServidor().baseDatos)
