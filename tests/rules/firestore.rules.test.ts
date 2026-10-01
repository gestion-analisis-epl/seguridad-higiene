import { readFileSync } from 'node:fs'
import { renderizarPlantilla } from '../../scripts/lib/plantillas.mjs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

const VALORES = { NEXT_PUBLIC_FIRESTORE_DATABASE: 'base-prueba', NEXT_PUBLIC_DOMINIO_PERMITIDO: 'ejemplo.test' }

const como = (uid: string, email = `${uid}@ejemplo.test`) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-seguridad-higiene',
    firestore: {
      rules: renderizarPlantilla(readFileSync('firestore.rules.template', 'utf8'), VALORES),
      host: '127.0.0.1', port: 8080,
    },
  })
})

afterAll(async () => { await env.cleanup() })

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios/admin1'), { email: 'admin1@ejemplo.test', rol: 'admin', activo: true })
    await setDoc(doc(db, 'usuarios/capt1'), { email: 'capt1@ejemplo.test', rol: 'capturista', activo: true })
    await setDoc(doc(db, 'usuarios/cons1'), { email: 'cons1@ejemplo.test', rol: 'consulta', activo: true })
    await setDoc(doc(db, 'usuarios/inact1'), { email: 'inact1@ejemplo.test', rol: 'consulta', activo: false })
    await setDoc(doc(db, 'usuarios/sinrol1'), { email: 'sinrol1@ejemplo.test', rol: 'sin_rol', activo: true })
    await setDoc(doc(db, 'usuarios/ext1'), { email: 'ext1@gmail.com', rol: 'admin', activo: true })
    await setDoc(doc(db, 'colaboradores/c1'), { nombre: 'Prueba', ciudad: 'ciudad-a' })
    await setDoc(doc(db, 'accidentes/a0'), { ciudad: 'ciudad-a' })
    await setDoc(doc(db, 'otra_coleccion/x1'), { valor: 1 })
  })
})

describe('lectura', () => {
  it('consulta, capturista y admin leen', async () => {
    for (const uid of ['cons1', 'capt1', 'admin1']) {
      await assertSucceeds(getDoc(doc(como(uid), 'colaboradores/c1')))
    }
  })
  it('sin_rol activo no lee datos operativos', async () => {
    await assertFails(getDoc(doc(como('sinrol1'), 'colaboradores/c1')))
  })
  it('sin sesión, sin registro, inactivo y correo externo no leen', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('nuevo1'), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('inact1'), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('ext1', 'ext1@gmail.com'), 'colaboradores/c1')))
  })
})

describe('escritura de datos', () => {
  it('consulta no escribe', async () => {
    await assertFails(setDoc(doc(como('cons1'), 'colaboradores/c2'), { nombre: 'X' }))
    await assertFails(updateDoc(doc(como('cons1'), 'colaboradores/c1'), { nombre: 'X' }))
  })
  it('capturista crea y edita, pero no borra', async () => {
    await assertSucceeds(setDoc(doc(como('capt1'), 'accidentes/a1'), { ciudad: 'ciudad-a' }))
    await assertSucceeds(updateDoc(doc(como('capt1'), 'colaboradores/c1'), { nombre: 'Y' }))
    await assertFails(deleteDoc(doc(como('capt1'), 'colaboradores/c1')))
  })
  it('admin borra registros operativos', async () => {
    await assertSucceeds(deleteDoc(doc(como('admin1'), 'accidentes/a0')))
  })
  it('nadie borra colaboradores, ni admin', async () => {
    await assertFails(deleteDoc(doc(como('admin1'), 'colaboradores/c1')))
  })
  it('una colección fuera de la lista se niega para leer y escribir', async () => {
    await assertFails(getDoc(doc(como('admin1'), 'otra_coleccion/x1')))
    await assertFails(setDoc(doc(como('admin1'), 'otra_coleccion/x2'), { valor: 2 }))
    await assertFails(deleteDoc(doc(como('admin1'), 'otra_coleccion/x1')))
  })
})

describe('usuarios', () => {
  it('cada quien lee su documento, solo admin lista', async () => {
    await assertSucceeds(getDoc(doc(como('cons1'), 'usuarios/cons1')))
    await assertFails(getDoc(doc(como('cons1'), 'usuarios/admin1')))
    await assertFails(getDocs(collection(como('capt1'), 'usuarios')))
    await assertSucceeds(getDocs(collection(como('admin1'), 'usuarios')))
  })
  it('un usuario nuevo se registra como consulta activo', async () => {
    await assertSucceeds(setDoc(doc(como('nuevo1'), 'usuarios/nuevo1'),
      { email: 'nuevo1@ejemplo.test', rol: 'consulta', activo: true }))
  })
  it('el recién registrado lee datos y no escribe', async () => {
    const db = como('nuevo1')
    await assertSucceeds(setDoc(doc(db, 'usuarios/nuevo1'),
      { email: 'nuevo1@ejemplo.test', rol: 'consulta', activo: true }))
    await assertSucceeds(getDoc(doc(db, 'colaboradores/c1')))
    await assertFails(setDoc(doc(db, 'colaboradores/c2'), { nombre: 'X' }))
  })
  it('el alta propia con otro rol o con activo false se niega', async () => {
    for (const [uid, rol] of [['n1', 'admin'], ['n2', 'capturista'], ['n3', 'sin_rol']]) {
      await assertFails(setDoc(doc(como(uid), `usuarios/${uid}`),
        { email: `${uid}@ejemplo.test`, rol, activo: true }))
    }
    await assertFails(setDoc(doc(como('n4'), 'usuarios/n4'),
      { email: 'n4@ejemplo.test', rol: 'consulta', activo: false }))
  })
  it('el alta propia con clave extra, otro uid o correo ajeno se niega', async () => {
    await assertFails(setDoc(doc(como('n5'), 'usuarios/n5'),
      { email: 'n5@ejemplo.test', rol: 'consulta', activo: true, extra: 1 }))
    await assertFails(setDoc(doc(como('n6'), 'usuarios/otro'),
      { email: 'n6@ejemplo.test', rol: 'consulta', activo: true }))
    await assertFails(setDoc(doc(como('n7'), 'usuarios/n7'),
      { email: 'otro@ejemplo.test', rol: 'consulta', activo: true }))
  })
  it('el alta propia con correo externo o sin verificar se niega', async () => {
    await assertFails(setDoc(doc(como('n8', 'n8@gmail.com'), 'usuarios/n8'),
      { email: 'n8@gmail.com', rol: 'consulta', activo: true }))
    const sinVerificar = env.authenticatedContext('n9', { email: 'n9@ejemplo.test', email_verified: false }).firestore()
    await assertFails(setDoc(doc(sinVerificar, 'usuarios/n9'),
      { email: 'n9@ejemplo.test', rol: 'consulta', activo: true }))
  })
  it('un correo que solo contiene el dominio permitido no se registra', async () => {
    const falsos = ['s1@ejemplo.test.otro.test', 's2@mail.ejemplo.test', 's3@malejemplo.test', 's4@ejemploxtest']
    for (let i = 0; i < falsos.length; i++) {
      const email = falsos[i]
      const uid = `sp${i}`
      await assertFails(setDoc(doc(como(uid, email), `usuarios/${uid}`), { email, rol: 'consulta', activo: true }))
      await assertFails(getDoc(doc(como(uid, email), 'colaboradores/c1')))
    }
  })
  it('un desactivado no se reactiva ni se vuelve a registrar', async () => {
    const db = como('inact1')
    await assertFails(updateDoc(doc(db, 'usuarios/inact1'), { activo: true }))
    await assertFails(setDoc(doc(db, 'usuarios/inact1'),
      { email: 'inact1@ejemplo.test', rol: 'consulta', activo: true }))
  })
  it('admin promueve y desactiva', async () => {
    const admin = como('admin1')
    await assertSucceeds(updateDoc(doc(admin, 'usuarios/cons1'), { rol: 'capturista' }))
    await assertSucceeds(updateDoc(doc(admin, 'usuarios/cons1'), { activo: false }))
  })
  it('nadie borra usuarios, ni admin ni la propia cuenta', async () => {
    await assertFails(deleteDoc(doc(como('admin1'), 'usuarios/cons1')))
    await assertFails(deleteDoc(doc(como('cons1'), 'usuarios/cons1')))
  })
  it('solo admin cambia roles', async () => {
    await assertFails(updateDoc(doc(como('capt1'), 'usuarios/capt1'), { rol: 'admin' }))
    await assertSucceeds(updateDoc(doc(como('admin1'), 'usuarios/cons1'), { rol: 'capturista' }))
  })
})

describe('catálogos y configuración', () => {
  it('todos leen, solo admin escribe', async () => {
    await assertSucceeds(getDoc(doc(como('cons1'), 'catalogos/ciudades')))
    await assertFails(setDoc(doc(como('capt1'), 'catalogos/ciudades'), { items: [] }))
    await assertSucceeds(setDoc(doc(como('admin1'), 'configuracion/indicadores'), { k_mensual: 20000 }))
  })
})

describe('adjuntos', () => {
  const valido = (uid: string) => ({
    colaborador_id: 'c1', modulo: 'accidentes', registro_id: 'a0', archivo_id: 'a'.repeat(32),
    nombre: 'informe.pdf', tipo: 'application/pdf', tamano: 1024, subido_por: uid, subido_en: serverTimestamp(),
  })

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'adjuntos/existente'), { ...valido('capt1'), subido_en: new Date() })
    })
  })

  it('capturista y admin crean, consulta y sin sesión no', async () => {
    await assertSucceeds(setDoc(doc(como('capt1'), 'adjuntos/n1'), valido('capt1')))
    await assertSucceeds(setDoc(doc(como('admin1'), 'adjuntos/n2'), valido('admin1')))
    await assertFails(setDoc(doc(como('cons1'), 'adjuntos/n3'), valido('cons1')))
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'adjuntos/n4'), valido('x')))
  })

  it('todos los roles activos leen', async () => {
    for (const uid of ['cons1', 'capt1', 'admin1']) await assertSucceeds(getDoc(doc(como(uid), 'adjuntos/existente')))
    await assertFails(getDoc(doc(como('inact1'), 'adjuntos/existente')))
  })

  it('admite los tipos de PowerPoint', async () => {
    const db = como('capt1')
    await assertSucceeds(setDoc(doc(db, 'adjuntos/p1'), { ...valido('capt1'), nombre: 'a.ppt', tipo: 'application/vnd.ms-powerpoint' }))
    await assertSucceeds(setDoc(doc(db, 'adjuntos/p2'), {
      ...valido('capt1'), nombre: 'a.pptx', tipo: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }))
  })

  it('rechaza tipo, tamaño, módulo y forma inválidos', async () => {
    const db = como('capt1')
    const malos = [
      { tipo: 'application/x-msdownload' }, { tamano: 0 }, { tamano: 10 * 1024 * 1024 + 1 }, { tamano: '5' },
      { modulo: 'otro' }, { archivo_id: '../x' }, { nombre: '' }, { nombre: 'x'.repeat(121) },
      { colaborador_id: '' }, { extra: 1 },
    ]
    for (let i = 0; i < malos.length; i++) {
      const cambio = malos[i]
      await assertFails(setDoc(doc(db, `adjuntos/m${i}`), { ...valido('capt1'), ...cambio }))
    }
  })

  it('subido_por y subido_en deben ser los del servidor', async () => {
    const db = como('capt1')
    await assertFails(setDoc(doc(db, 'adjuntos/p1'), valido('admin1')))
    await assertFails(setDoc(doc(db, 'adjuntos/p2'), { ...valido('capt1'), subido_en: new Date(0) }))
  })

  it('nadie actualiza; capturista y admin borran, consulta no', async () => {
    await assertFails(updateDoc(doc(como('admin1'), 'adjuntos/existente'), { nombre: 'otro.pdf' }))
    await assertFails(deleteDoc(doc(como('cons1'), 'adjuntos/existente')))
    await assertSucceeds(deleteDoc(doc(como('capt1'), 'adjuntos/existente')))
  })
})
