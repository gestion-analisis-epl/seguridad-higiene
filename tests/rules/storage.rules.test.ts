import { readFileSync } from 'node:fs'
import { renderizarPlantilla } from '../../scripts/lib/plantillas.mjs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteObject, getBytes, ref, updateMetadata, uploadBytes } from 'firebase/storage'
import { doc, setDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

const VALORES = { NEXT_PUBLIC_FIRESTORE_DATABASE: 'base-prueba', NEXT_PUBLIC_DOMINIO_PERMITIDO: 'ejemplo.test' }
const RUTA = `adjuntos/c1/accidentes/r1/${'a'.repeat(32)}`
const PDF = { contentType: 'application/pdf' }
const bytes = (n: number) => new Uint8Array(n)

// El emulador resuelve el usuario en la base por defecto: la plantilla se prueba apuntando a ella.
const reglasStorage = () =>
  renderizarPlantilla(readFileSync('storage.rules.template', 'utf8').replace(/\{\{BASE_DATOS\}\}/g, '(default)'), VALORES)

const como = (uid: string, email = `${uid}@ejemplo.test`) =>
  env.authenticatedContext(uid, { email, email_verified: true }).storage()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-seguridad-higiene',
    firestore: { rules: renderizarPlantilla(readFileSync('firestore.rules.template', 'utf8'), VALORES), host: '127.0.0.1', port: 8080 },
    storage: { rules: reglasStorage(), host: '127.0.0.1', port: 9199 },
  })
})

afterAll(async () => { await env.cleanup() })

beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios/admin1'), { email: 'admin1@ejemplo.test', rol: 'admin', activo: true })
    await setDoc(doc(db, 'usuarios/capt1'), { email: 'capt1@ejemplo.test', rol: 'capturista', activo: true })
    await setDoc(doc(db, 'usuarios/cons1'), { email: 'cons1@ejemplo.test', rol: 'consulta', activo: true })
    await setDoc(doc(db, 'usuarios/inact1'), { email: 'inact1@ejemplo.test', rol: 'capturista', activo: false })
    await setDoc(doc(db, 'usuarios/ext1'), { email: 'ext1@gmail.com', rol: 'admin', activo: true })
    await uploadBytes(ref(ctx.storage(), RUTA), bytes(10), PDF)
  })
})

describe('storage: subir', () => {
  it('capturista y admin suben un tipo permitido', async () => {
    await assertSucceeds(uploadBytes(ref(como('capt1'), `adjuntos/c1/accidentes/r1/${'b'.repeat(32)}`), bytes(10), PDF))
    await assertSucceeds(uploadBytes(ref(como('admin1'), `adjuntos/c1/capacitaciones/r1/${'c'.repeat(32)}`), bytes(10), PDF))
  })
  it('consulta, sin sesión, inactivo y correo externo no suben', async () => {
    const destino = `adjuntos/c1/accidentes/r1/${'d'.repeat(32)}`
    await assertFails(uploadBytes(ref(como('cons1'), destino), bytes(10), PDF))
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), destino), bytes(10), PDF))
    await assertFails(uploadBytes(ref(como('inact1'), destino), bytes(10), PDF))
    await assertFails(uploadBytes(ref(como('ext1', 'ext1@gmail.com'), destino), bytes(10), PDF))
  })
  it('admite PowerPoint y rechaza un tipo de Office no listado', async () => {
    const st = como('capt1')
    await assertSucceeds(uploadBytes(ref(st, `adjuntos/c1/accidentes/r1/${'f'.repeat(32)}`), bytes(10), { contentType: 'application/vnd.ms-powerpoint' }))
    await assertSucceeds(uploadBytes(ref(st, `adjuntos/c1/accidentes/r1/${'1'.repeat(32)}`), bytes(10), {
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }))
    await assertFails(uploadBytes(ref(st, `adjuntos/c1/accidentes/r1/${'2'.repeat(32)}`), bytes(10), {
      contentType: 'application/vnd.ms-outlook',
    }))
  })
  it('rechaza tipo, tamaño y ruta inválidos', async () => {
    const st = como('capt1')
    const destino = `adjuntos/c1/accidentes/r1/${'e'.repeat(32)}`
    await assertFails(uploadBytes(ref(st, destino), bytes(10), { contentType: 'application/x-msdownload' }))
    await assertFails(uploadBytes(ref(st, destino), bytes(0), PDF))
    await assertFails(uploadBytes(ref(st, destino), bytes(10 * 1024 * 1024 + 1), PDF))
    await assertFails(uploadBytes(ref(st, `adjuntos/c1/otro/r1/${'e'.repeat(32)}`), bytes(10), PDF))
    await assertFails(uploadBytes(ref(st, 'otra/ruta/archivo'), bytes(10), PDF))
  })
})

describe('storage: leer, actualizar y borrar', () => {
  it('todos los roles activos leen; sin sesión e inactivo no', async () => {
    for (const uid of ['cons1', 'capt1', 'admin1']) await assertSucceeds(getBytes(ref(como(uid), RUTA)))
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), RUTA)))
    await assertFails(getBytes(ref(como('inact1'), RUTA)))
  })
  it('nadie actualiza metadatos', async () => {
    await assertFails(updateMetadata(ref(como('admin1'), RUTA), { contentType: 'image/png' }))
  })
  it('capturista y admin borran, consulta no', async () => {
    await assertFails(deleteObject(ref(como('cons1'), RUTA)))
    await assertSucceeds(deleteObject(ref(como('capt1'), RUTA)))
  })
})
