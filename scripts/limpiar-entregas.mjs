// Elimina las entregas de uniforme y EPP capturadas en la app (las que no vienen de la hoja), con respaldo previo.
// Uso: node --env-file=.env.local scripts/limpiar-entregas.mjs [--confirmar]; sin --confirmar solo respalda y cuenta.
import { mkdirSync, writeFileSync } from 'node:fs'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLECCIONES = ['entregas_uniforme', 'entregas_epp']
const confirmar = process.argv.includes('--confirmar')

const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
const baseDatos = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE
if (!baseDatos) { console.error('Falta NEXT_PUBLIC_FIRESTORE_DATABASE'); process.exit(1) }
const app = initializeApp({
  credential: json ? cert(JSON.parse(json)) : applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app, baseDatos)

const serializable = (v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString()
  if (Array.isArray(v)) return v.map(serializable)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializable(x)]))
  return v
}

const respaldo = {}
const porBorrar = []
for (const coleccion of COLECCIONES) {
  const snap = await db.collection(coleccion).get()
  const propios = snap.docs.filter((d) => d.data().origen !== 'hoja')
  respaldo[coleccion] = propios.map((d) => ({ id: d.id, ...serializable(d.data()) }))
  porBorrar.push(...propios.map((d) => d.ref))
  console.log(`${coleccion}: ${snap.size} documentos, ${propios.length} capturados en la app`)
}

mkdirSync('respaldos', { recursive: true })
const archivo = `respaldos/entregas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(archivo, JSON.stringify(respaldo, null, 2))
console.log(`Respaldo guardado en ${archivo}`)

if (!confirmar) {
  console.log('No se eliminó nada. Agrega --confirmar para eliminar esos documentos.')
} else {
  for (let i = 0; i < porBorrar.length; i += 400) {
    const lote = db.batch()
    for (const ref of porBorrar.slice(i, i + 400)) lote.delete(ref)
    await lote.commit()
  }
  console.log(`Eliminados ${porBorrar.length} documentos.`)
}
