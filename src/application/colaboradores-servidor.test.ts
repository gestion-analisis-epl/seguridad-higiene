import { describe, expect, it } from 'vitest'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import {
  almacenSoloLectura, asegurarColaborador, desvincularColaborador, ErrorColaborador, importarColaboradores, sincronizarColaboradores,
  vincularColaborador,
  type AlmacenColaboradores, type TxColaboradores,
} from './colaboradores-servidor'

function almacenMemoria(inicial: { colaboradores?: Record<string, Record<string, unknown>>; catalogos?: Record<string, ItemCatalogo[]> } = {}) {
  const colaboradores = new Map(Object.entries(inicial.colaboradores ?? {}))
  const catalogos = new Map(Object.entries(inicial.catalogos ?? {}))
  const indice = new Map<string, string>()
  for (const [uid, c] of Array.from(colaboradores)) if (typeof c.id_interno === 'string') indice.set(c.id_interno, uid)
  let siguiente = 0
  const almacen: AlmacenColaboradores = {
    async transaccion(fn) {
      let escribio = false
      // Imita a Firestore: leer después de escribir dentro de la transacción es un error
      const leer = <T,>(v: T) => { if (escribio) throw new Error('lectura después de escribir'); return Promise.resolve(v) }
      const escribir = (f: () => void) => { escribio = true; f() }
      const tx: TxColaboradores = {
        leerIndice: (id) => leer(indice.get(id) ?? null),
        leerColaborador: (uid) => leer(colaboradores.get(uid) ?? null),
        leerCatalogo: (id) => leer(catalogos.get(id) ?? []),
        escribirCatalogo: (id, items) => escribir(() => void catalogos.set(id, items)),
        nuevoId: () => `uid${++siguiente}`,
        crearColaborador: (uid, datos) => escribir(() => void colaboradores.set(uid, datos)),
        actualizarColaborador: (uid, datos) => escribir(() => void colaboradores.set(uid, { ...colaboradores.get(uid), ...datos })),
        quitarIdInterno: (uid) => escribir(() => { const copia = { ...colaboradores.get(uid) }; delete copia.id_interno; colaboradores.set(uid, copia) }),
        escribirIndice: (id, uid) => escribir(() => void indice.set(id, uid)),
        borrarIndice: (id) => escribir(() => void indice.delete(id)),
      }
      return fn(tx)
    },
  }
  return { almacen, colaboradores, catalogos, indice }
}

const fila = (o: Partial<ColaboradorHoja> = {}): ColaboradorHoja => ({
  id_interno: '12066', numero: '2120', nombre: 'ADALBERTO GUTIERREZ MIRANDA', plaza: 'LEON', departamento: 'SEGURIDAD',
  empresa: 'SICMART SA DE CV', puesto: 'GUARDIA DE SEGURIDAD', fecha_ingreso: '2026-09-28', zona: 'Bajío Centro',
  jefe: 'JOSE', gerente: 'ALFONSO', fecha_baja: null, motivo_baja: '', inactivo: false, ...o,
})

describe('importarColaboradores', () => {
  it('crea activos e inactivos y reporta los que fallan sin detener al resto', async () => {
    const m = almacenMemoria()
    const r = await importarColaboradores(m.almacen, [
      fila({ id_interno: '1', nombre: 'ANA PEREZ' }), fila({ id_interno: '2', nombre: 'LUIS RUIZ', inactivo: true }),
      fila({ id_interno: '3', nombre: 'SIN PLAZA', plaza: '' }),
    ])
    expect(r.creados).toBe(2)
    expect(r.errores).toEqual([{ id_interno: '3', nombre: 'SIN PLAZA', error: 'La hoja no trae Plaza para este colaborador' }])
    expect(m.colaboradores.get(m.indice.get('2')!)?.activo).toBe(false)
  })
})

describe('asegurarColaborador', () => {
  it('crea el colaborador con los datos de la hoja y agrega las entradas de catálogo faltantes', async () => {
    const m = almacenMemoria({ catalogos: { ciudades: [{ valor: 'leon', etiqueta: 'León' }] } })
    const r = await asegurarColaborador(m.almacen, fila())
    expect(r).toEqual({ uid: 'uid1', creado: true })
    expect(m.colaboradores.get('uid1')).toMatchObject({
      nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon', area: 'seguridad', linea_negocio: 'sicmart-sa-de-cv',
      id_interno: '12066', numero_colaborador: '2120', puesto: 'GUARDIA DE SEGURIDAD', plaza: 'LEON', activo: true,
    })
    expect(m.catalogos.get('areas')).toEqual([{ valor: 'seguridad', etiqueta: 'Seguridad' }])
    expect(m.catalogos.get('ciudades')).toEqual([{ valor: 'leon', etiqueta: 'León' }])
    expect(m.indice.get('12066')).toBe('uid1')
  })

  it('devuelve el colaborador existente sin duplicar', async () => {
    const m = almacenMemoria()
    await asegurarColaborador(m.almacen, fila())
    const r = await asegurarColaborador(m.almacen, fila())
    expect(r).toEqual({ uid: 'uid1', creado: false })
    expect(m.colaboradores.size).toBe(1)
  })

  it('crea como inactivo a quien está inactivo si se permite', async () => {
    const m = almacenMemoria()
    const { uid } = await asegurarColaborador(m.almacen, fila({ inactivo: true }), { permitirInactivo: true })
    expect(m.colaboradores.get(uid)?.activo).toBe(false)
  })

  it('rechaza a quien está dado de baja en la hoja', async () => {
    const m = almacenMemoria()
    await expect(asegurarColaborador(m.almacen, fila({ inactivo: true }))).rejects.toMatchObject({ estado: 409 })
    expect(m.colaboradores.size).toBe(0)
  })

  it('rechaza si faltan Plaza o Empresa, que son obligatorias', async () => {
    const m = almacenMemoria()
    await expect(asegurarColaborador(m.almacen, fila({ plaza: '' }))).rejects.toBeInstanceOf(ErrorColaborador)
    await expect(asegurarColaborador(m.almacen, fila({ empresa: '' }))).rejects.toMatchObject({ estado: 422 })
  })

  it('deja el área en null si Departamento viene vacío', async () => {
    const m = almacenMemoria()
    await asegurarColaborador(m.almacen, fila({ departamento: '' }))
    expect(m.colaboradores.get('uid1')?.area).toBeNull()
  })
})

describe('vincularColaborador', () => {
  const existente = { nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon-gto', activo: true }

  it('completa lo faltante sin pisar ciudad, área ni línea ya capturadas', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, area: 'mantenimiento' } } })
    await vincularColaborador(m.almacen, 'a', fila())
    expect(m.colaboradores.get('a')).toMatchObject({
      nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon-gto', area: 'mantenimiento', linea_negocio: 'sicmart-sa-de-cv',
      id_interno: '12066', puesto: 'GUARDIA DE SEGURIDAD', numero_colaborador: '2120',
    })
    expect(m.catalogos.get('ciudades')).toBeUndefined()
    expect(m.indice.get('12066')).toBe('a')
  })

  it('rechaza si la fila ya pertenece a otro colaborador', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente, b: { nombre: 'Otro', id_interno: '12066' } } })
    await expect(vincularColaborador(m.almacen, 'a', fila())).rejects.toMatchObject({ estado: 409 })
  })

  it('rechaza si el colaborador ya está vinculado a otra fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, id_interno: '1' } } })
    await expect(vincularColaborador(m.almacen, 'a', fila())).rejects.toMatchObject({ estado: 409 })
  })

  it('responde 404 si el colaborador no existe', async () => {
    await expect(vincularColaborador(almacenMemoria().almacen, 'zz', fila())).rejects.toMatchObject({ estado: 404 })
  })

  it('marca como inactivo a quien está de baja en la hoja', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente } })
    await vincularColaborador(m.almacen, 'a', fila({ inactivo: true }))
    expect(m.colaboradores.get('a')).toMatchObject({ activo: false, id_interno: '12066' })
  })

  it('no cambia activo si la fila sigue vigente', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, activo: false } } })
    await vincularColaborador(m.almacen, 'a', fila())
    expect(m.colaboradores.get('a')?.activo).toBe(false)
  })

  it('es idempotente con la misma fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente } })
    await vincularColaborador(m.almacen, 'a', fila())
    await expect(vincularColaborador(m.almacen, 'a', fila())).resolves.toBeUndefined()
  })
})

describe('vincularColaborador sobrescribiendo', () => {
  const existente = { nombre: 'Adalberto G. M.', ciudad: 'otra', area: 'otra', linea_negocio: 'otra', fecha_ingreso: new Date(2000, 0, 1), activo: true }

  it('reemplaza nombre, ciudad, área, línea y fecha con los datos de la hoja', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente } })
    await vincularColaborador(m.almacen, 'a', fila(), { sobrescribir: true })
    expect(m.colaboradores.get('a')).toMatchObject({
      nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon', area: 'seguridad', linea_negocio: 'sicmart-sa-de-cv',
      id_interno: '12066', puesto: 'GUARDIA DE SEGURIDAD',
    })
    expect(m.colaboradores.get('a')?.fecha_ingreso).toEqual(new Date('2026-09-28T12:00:00Z'))
  })

  it('cambia a otra fila y libera la anterior', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, id_interno: '1' } } })
    await vincularColaborador(m.almacen, 'a', fila(), { sobrescribir: true })
    expect(m.colaboradores.get('a')?.id_interno).toBe('12066')
    expect(m.indice.has('1')).toBe(false)
    expect(m.indice.get('12066')).toBe('a')
  })

  it('sigue rechazando una fila vinculada a otro colaborador', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente, b: { nombre: 'Otro', id_interno: '12066' } } })
    await expect(vincularColaborador(m.almacen, 'a', fila(), { sobrescribir: true })).rejects.toMatchObject({ estado: 409 })
  })
})

describe('sincronizarColaboradores', () => {
  const catalogos = {
    ciudades: [{ valor: 'leon', etiqueta: 'León' }], areas: [{ valor: 'seguridad', etiqueta: 'Seguridad' }],
    lineas_negocio: [{ valor: 'sicmart-sa-de-cv', etiqueta: 'Sicmart Sa De Cv' }],
  }
  const vinculado = {
    nombre: 'Nombre Editado', fecha_ingreso: new Date(2000, 0, 1), id_interno: '12066', numero_colaborador: '1', activo: true,
    ciudad: 'leon', area: 'seguridad', linea_negocio: 'sicmart-sa-de-cv', puesto: 'GUARDIA DE SEGURIDAD', zona: 'Bajío Centro',
    plaza: 'LEON', empresa: 'SICMART SA DE CV', jefe: 'JOSE', gerente: 'ALFONSO', motivo_baja: '', fecha_baja: null,
  }
  const existentes = (m: ReturnType<typeof almacenMemoria>) =>
    Array.from(m.colaboradores, ([id, c]) => ({ id, nombre: String(c.nombre), id_interno: (c.id_interno as string) ?? null }))

  it('crea a los activos nuevos y no a los inactivos sin vincular', async () => {
    const m = almacenMemoria({ catalogos })
    const r = await sincronizarColaboradores(m.almacen, [fila({ id_interno: '1', nombre: 'ANA' }), fila({ id_interno: '2', nombre: 'LUIS', inactivo: true })], [])
    expect(r).toMatchObject({ creados: 1, errores: [] })
    expect(m.indice.has('2')).toBe(false)
  })

  it('actualiza movimientos sin tocar nombre, fecha de ingreso, id ni número', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { a: vinculado } })
    const r = await sincronizarColaboradores(m.almacen, [fila({ puesto: 'SUPERVISOR', jefe: 'MARIA', nombre: 'OTRO NOMBRE', numero: '99', fecha_ingreso: '2026-01-01' })], existentes(m))
    expect(r.actualizados).toBe(1)
    expect(m.colaboradores.get('a')).toMatchObject({
      puesto: 'SUPERVISOR', jefe: 'MARIA', nombre: 'Nombre Editado', numero_colaborador: '1', id_interno: '12066', fecha_ingreso: new Date(2000, 0, 1),
    })
  })

  it('desactiva con la baja y reactiva en un reingreso', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { a: vinculado } })
    const baja = fila({ inactivo: true, fecha_baja: '2026-10-01', motivo_baja: 'RENUNCIA' })
    expect((await sincronizarColaboradores(m.almacen, [baja], existentes(m))).desactivados).toBe(1)
    expect(m.colaboradores.get('a')).toMatchObject({ activo: false, motivo_baja: 'RENUNCIA' })
    const reingreso = await sincronizarColaboradores(m.almacen, [fila()], existentes(m))
    expect(reingreso.reactivados).toBe(1)
    expect(m.colaboradores.get('a')).toMatchObject({ activo: true, motivo_baja: '', fecha_baja: null })
  })

  it('no escribe si nada cambió', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { a: vinculado } })
    const r = await sincronizarColaboradores(m.almacen, [fila()], existentes(m))
    expect(r).toMatchObject({ creados: 0, actualizados: 0, reactivados: 0, desactivados: 0 })
  })

  it('omite al que coincide en nombre con un colaborador sin vincular y reporta los errores', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { x: { nombre: 'Ana Perez' } } })
    const r = await sincronizarColaboradores(m.almacen, [fila({ id_interno: '1', nombre: 'ANA PEREZ' }), fila({ id_interno: '2', nombre: 'SIN PLAZA', plaza: '' })], existentes(m))
    expect(r.omitidos).toBe(1)
    expect(r.pendientes).toEqual([{ id_interno: '1', nombre: 'ANA PEREZ', inactivo: false, candidatos: [{ uid: 'x', nombre: 'Ana Perez' }] }])
    expect(r.errores).toHaveLength(1)
  })

  it('con instantánea solo abre transacciones para lo que cambia', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { a: vinculado, b: { ...vinculado, id_interno: '2', nombre: 'Otro' } } })
    let transacciones = 0
    const almacen: AlmacenColaboradores = { transaccion: (fn) => { transacciones++; return m.almacen.transaccion(fn) } }
    const instantanea = { colaboradores: new Map(Array.from(m.colaboradores.values(), (c) => [c.id_interno as string, c])), catalogos }
    const r = await sincronizarColaboradores(almacen, [fila(), fila({ id_interno: '2', nombre: 'OTRO', puesto: 'SUPERVISOR' })], existentes(m), instantanea)
    expect(transacciones).toBe(1)
    expect(r.actualizados).toBe(1)
    expect(m.colaboradores.get('b')?.puesto).toBe('SUPERVISOR')
  })

  it('en modo solo lectura calcula el resultado sin escribir', async () => {
    const m = almacenMemoria({ catalogos, colaboradores: { a: vinculado } })
    const r = await sincronizarColaboradores(almacenSoloLectura(m.almacen), [fila({ puesto: 'SUPERVISOR' }), fila({ id_interno: '5', nombre: 'NUEVO' })], existentes(m))
    expect(r).toMatchObject({ creados: 1, actualizados: 1 })
    expect(m.colaboradores.get('a')?.puesto).toBe('GUARDIA DE SEGURIDAD')
    expect(m.colaboradores.size).toBe(1)
  })
})

describe('desvincularColaborador', () => {
  it('quita el id_interno y libera la fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: { nombre: 'X', id_interno: '12066' } } })
    await desvincularColaborador(m.almacen, 'a')
    expect(m.colaboradores.get('a')).toEqual({ nombre: 'X' })
    expect(m.indice.has('12066')).toBe(false)
  })

  it('no hace nada si no estaba vinculado y falla si no existe', async () => {
    const m = almacenMemoria({ colaboradores: { a: { nombre: 'X' } } })
    await expect(desvincularColaborador(m.almacen, 'a')).resolves.toBeUndefined()
    await expect(desvincularColaborador(m.almacen, 'zz')).rejects.toMatchObject({ estado: 404 })
  })
})
