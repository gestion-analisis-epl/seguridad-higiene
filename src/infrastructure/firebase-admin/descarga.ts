import { applicationDefault, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { ErrorConfiguracion, type PuertosDescarga } from '@/application/adjuntos-descarga'
import { leerBucket, leerConfiguracion } from '@/infrastructure/firebase/configuracion'

const VENTANA_MS = 60_000
const SIN_CREDENCIALES = /default credentials|Could not refresh access token|Could not load|signBlob|iam\.serviceAccounts/i

// Accesos estáticos, como en el cliente; todo se lee al usar, nunca al importar.
function leerEntorno() {
  const proyecto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? ''
  if (!proyecto) throw new ErrorConfiguracion('proyecto')
  try {
    const { baseDatos, dominioPermitido } = leerConfiguracion({
      NEXT_PUBLIC_FIRESTORE_DATABASE: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE,
      NEXT_PUBLIC_DOMINIO_PERMITIDO: process.env.NEXT_PUBLIC_DOMINIO_PERMITIDO,
    })
    const bucket = leerBucket({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET })
    return { proyecto, baseDatos, dominioPermitido, bucket }
  } catch {
    throw new ErrorConfiguracion('entorno')
  }
}

export const dominioConfigurado = (): string => leerEntorno().dominioPermitido

function appAdmin(proyecto: string): App {
  const NOMBRE = 'descarga-adjuntos'
  return getApps().some((a) => a.name === NOMBRE)
    ? getApp(NOMBRE)
    : initializeApp({ credential: applicationDefault(), projectId: proyecto }, NOMBRE)
}

async function conCredenciales<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion()
  } catch (e) {
    if (e instanceof Error && SIN_CREDENCIALES.test(e.message)) throw new ErrorConfiguracion('credenciales')
    throw e
  }
}

export function crearPuertosDescarga(): PuertosDescarga {
  const { proyecto, baseDatos, bucket } = leerEntorno()
  const app = appAdmin(proyecto)
  const firestore = getFirestore(app, baseDatos)
  return {
    verificarToken: async (token) => {
      try {
        const t = await getAuth(app).verifyIdToken(token)
        return { uid: t.uid, email: t.email ?? '', emailVerificado: t.email_verified === true }
      } catch {
        return null
      }
    },
    leerUsuario: (uid) => conCredenciales(async () => {
      const s = await firestore.collection('usuarios').doc(uid).get()
      return s.exists ? (s.data() ?? null) : null
    }),
    leerAdjunto: (id) => conCredenciales(async () => {
      const s = await firestore.collection('adjuntos').doc(id).get()
      return s.exists ? (s.data() ?? null) : null
    }),
    firmarUrl: ({ ruta, tipo, disposicion }) => conCredenciales(async () => {
      const [url] = await getStorage(app).bucket(bucket).file(ruta).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + VENTANA_MS,
        responseDisposition: disposicion,
        responseType: tipo,
      })
      return url
    }),
  }
}
