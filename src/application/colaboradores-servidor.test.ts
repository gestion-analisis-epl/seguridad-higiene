import { describe, expect, it } from 'vitest'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import {
  asegurarColaborador, desvincularColaborador, ErrorColaborador, vincularColaborador,
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
  jefe: 'JOSE', gerente: 'ALFONSO', fecha_baja: null, motivo_baja: '', ...o,
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

  it('rechaza a quien está dado de baja en la hoja', async () => {
    const m = almacenMemoria()
    await expect(asegurarColaborador(m.almacen, fila({ fecha_baja: '2026-10-01' }))).rejects.toMatchObject({ estado: 409 })
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
    await vincularColaborador(m.almacen, 'a', fila({ fecha_baja: '2026-10-01' }))
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
