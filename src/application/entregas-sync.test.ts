import { describe, expect, it } from 'vitest'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { parsearEntregasHoja } from '@/domain/entregas-hoja'
import { sincronizarEntregas, type AlmacenEntregas, type MapeoArticulo, type OperacionEntrega } from './entregas-sync'

const ENCABEZADO = ['id', 'Uniforme&Cantidad', '$MontoMaterial', 'Talla', 'Cantidad', 'Observaciones', 'FechaRegistro', 'Fecha Entrega']
const fila = (o: Partial<Record<string, unknown>> = {}) => {
  const base: Record<string, unknown> = {
    id: 1, 'Uniforme&Cantidad': 'CASCO PARA ALTURAS', '$MontoMaterial': 852, Talla: '', Cantidad: 1,
    Observaciones: '', FechaRegistro: 45654, 'Fecha Entrega': 45654, ...o,
  }
  return ENCABEZADO.map((h) => base[h])
}
const parsear = (...filas: unknown[][]) => parsearEntregasHoja([ENCABEZADO, ...filas])

const col = (id: string, o: Partial<ColaboradorHoja> = {}): ColaboradorHoja => ({
  id_interno: id, numero: '9', nombre: 'ANA PEREZ', plaza: 'LEON', departamento: 'X', empresa: 'Y', puesto: 'SOLDADOR',
  fecha_ingreso: null, zona: '', jefe: '', gerente: '', fecha_baja: null, motivo_baja: '', inactivo: false,
  nombres: '', apellido_paterno: '', apellido_materno: '', funcion_area: '', empresa_alta: '', correo: '', tipo_nomina: '', ...o,
})

const MAPEO = new Map<string, MapeoArticulo>([
  ['casco-para-alturas', { destino: 'epp', valor: 'casco' }],
  ['gorro', { destino: 'uniforme', valor: 'gorro' }],
  ['extintor-pqs-2-kg', { destino: 'equipo', valor: 'extintor' }],
])

function almacen(inicial: { indice?: Record<string, string>; existentes?: Record<string, Record<string, unknown>> } = {}) {
  const indice = new Map(Object.entries(inicial.indice ?? { '1': 'u1' }))
  const existentes = new Map(Object.entries(inicial.existentes ?? {}))
  const escritas: OperacionEntrega[] = []
  const a: AlmacenEntregas = {
    leerMapeo: async () => MAPEO,
    leerIndice: async (ids) => new Map(ids.filter((i) => indice.has(i)).map((i) => [i, indice.get(i)!])),
    leerColaborador: async (uid) => ({ nombre: `Persona ${uid}`, ciudad: 'leon', plaza: 'LEON', puesto: 'SOLDADOR' }),
    leerExistentes: async () => existentes,
    escribir: async (ops) => { escritas.push(...ops) },
  }
  return { a, escritas, indice }
}

const asegurarFalso = (indice: Map<string, string>) => async (f: ColaboradorHoja) => {
  const uid = `nuevo-${f.id_interno}`
  indice.set(f.id_interno, uid)
  return { uid, creado: true }
}

describe('sincronizarEntregas', () => {
  it('crea las entregas con los datos del colaborador y la fecha derivada', async () => {
    const { a, escritas, indice } = almacen()
    const { filas, rechazadas } = parsear(fila(), fila({ 'Uniforme&Cantidad': 'GORRO', Talla: 'M' }))
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: false })
    expect(informe).toMatchObject({ nuevas: 2, actualizadas: 0, sinCambios: 0, colaboradoresNuevos: 0 })
    expect(escritas.map((o) => [o.coleccion, o.id, o.nuevo])).toEqual([
      ['entregas_epp', '1_casco-para-alturas_20241228', true], ['entregas_uniforme', '1_gorro_20241228', true],
    ])
    expect(escritas[1].datos).toMatchObject({
      colaborador_id: 'u1', prenda: 'gorro', talla: 'M', entregado: true, periodo: '2024-12', ciudad: 'leon', origen: 'hoja', monto: 852,
      colaborador_nombre: 'Persona u1',
    })
    expect(escritas[0].datos).toMatchObject({ tipo: 'casco', entregado: true })
  })

  it('en simulación no escribe ni crea colaboradores, solo cuenta', async () => {
    const { a, escritas, indice } = almacen({ indice: {} })
    const { filas, rechazadas } = parsear(fila(), fila({ id: 1, 'Uniforme&Cantidad': 'GORRO' }))
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: true })
    expect(informe).toMatchObject({ simulacion: true, nuevas: 2, colaboradoresNuevos: 1 })
    expect(escritas).toEqual([])
    expect(indice.size).toBe(0)
  })

  it('crea al colaborador que no existe y escribe sus entregas', async () => {
    const { a, escritas, indice } = almacen({ indice: {} })
    const { filas, rechazadas } = parsear(fila())
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1', { inactivo: true })], simular: false })
    expect(informe.colaboradoresNuevos).toBe(1)
    expect(escritas[0].datos.colaborador_id).toBe('nuevo-1')
  })

  it('si no se puede crear a un colaborador rechaza sus filas y sigue con las demás', async () => {
    const { a, escritas, indice } = almacen({ indice: { '1': 'u1' } })
    const { filas, rechazadas } = parsear(fila({ id: 7 }), fila({ id: 1 }))
    const asegurar = async (f: ColaboradorHoja) => {
      if (f.id_interno === '7') throw new Error('La hoja no trae Plaza')
      return asegurarFalso(indice)(f)
    }
    const informe = await sincronizarEntregas({ almacen: a, asegurar, filas, rechazadas, hoja: [col('1'), col('7')], simular: false })
    expect(informe).toMatchObject({ nuevas: 1, colaboradoresNuevos: 0 })
    expect(informe.rechazadas).toEqual([{ fila: 2, motivo: 'No se pudo crear al colaborador: La hoja no trae Plaza' }])
    expect(escritas).toHaveLength(1)
  })

  it('es idempotente: sin cambios la segunda vez, y actualiza lo que cambió', async () => {
    const { a, escritas, indice } = almacen()
    const { filas, rechazadas } = parsear(fila({ 'Fecha Entrega': '' }))
    await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: false })
    const guardada = escritas[0]
    expect(guardada.datos.entregado).toBe(false)

    const repetida = almacen({ existentes: { [guardada.id]: guardada.datos } })
    const igualito = await sincronizarEntregas({ almacen: repetida.a, asegurar: asegurarFalso(repetida.indice), filas, rechazadas, hoja: [col('1')], simular: false })
    expect(igualito).toMatchObject({ nuevas: 0, actualizadas: 0, sinCambios: 1 })

    const entregada = parsear(fila())
    const cambio = await sincronizarEntregas({ almacen: repetida.a, asegurar: asegurarFalso(repetida.indice), filas: entregada.filas, rechazadas: [], hoja: [col('1')], simular: false })
    expect(cambio).toMatchObject({ actualizadas: 1, sinCambios: 0 })
    expect(repetida.escritas[0]).toMatchObject({ id: guardada.id, nuevo: false })
    expect(repetida.escritas[0].datos).toMatchObject({ entregado: true })
  })

  it('reporta artículos sin mapeo y no los importa', async () => {
    const { a, escritas, indice } = almacen()
    const { filas, rechazadas } = parsear(fila({ 'Uniforme&Cantidad': 'COSA RARA' }), fila({ 'Uniforme&Cantidad': 'cosa rara', FechaRegistro: 45655 }))
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: false })
    expect(informe.sinMapeo).toEqual([{ clave: 'cosa-rara', articulo: 'COSA RARA', filas: 2 }])
    expect(escritas).toEqual([])
  })

  it('rechaza ids que no están en la hoja de colaboradores y conserva los rechazos del análisis', async () => {
    const { a, indice } = almacen()
    const { filas, rechazadas } = parsear(fila({ id: 99 }), fila({ Cantidad: -1 }))
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: false })
    expect(informe.rechazadas.map((r) => r.fila)).toEqual([3, 2])
    expect(informe.nuevas).toBe(0)
  })

  it('el equipo solo se registra si se entregó, en oficinas_equipo con la ciudad del colaborador', async () => {
    const { a, escritas, indice } = almacen()
    const { filas, rechazadas } = parsear(
      fila({ 'Uniforme&Cantidad': 'EXTINTOR PQS 2 KG' }),
      fila({ 'Uniforme&Cantidad': 'EXTINTOR PQS 2 KG', Cantidad: 0, FechaRegistro: 45655 }),
    )
    const informe = await sincronizarEntregas({ almacen: a, asegurar: asegurarFalso(indice), filas, rechazadas, hoja: [col('1')], simular: false })
    expect(informe).toMatchObject({ nuevas: 1, omitidas: 1 })
    expect(escritas[0]).toMatchObject({ coleccion: 'oficinas_equipo' })
    expect(escritas[0].datos).toMatchObject({ ciudad: 'leon', tipo: 'extintor' })
    expect(String(escritas[0].datos.detalle)).toContain('Persona u1')
  })
})
