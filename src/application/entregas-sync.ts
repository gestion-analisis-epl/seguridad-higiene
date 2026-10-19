import { copiaDeColaborador, type ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { claveArticulo, type DestinoEntrega, type FilaEntregaHoja, type FilaRechazada } from '@/domain/entregas-hoja'
import { periodoDe } from '@/domain/fechas'

export interface MapeoArticulo { destino: DestinoEntrega; valor: string }

export interface OperacionEntrega {
  coleccion: string
  id: string
  datos: Record<string, unknown>
  nuevo: boolean
}

export interface AlmacenEntregas {
  leerMapeo(): Promise<Map<string, MapeoArticulo>>
  leerIndice(ids: string[]): Promise<Map<string, string>>
  leerColaborador(uid: string): Promise<Record<string, unknown> | null>
  leerExistentes(coleccion: string): Promise<Map<string, Record<string, unknown>>>
  escribir(operaciones: OperacionEntrega[]): Promise<void>
}

export interface ArticuloSinMapeo { clave: string; articulo: string; filas: number }

export interface InformeEntregas {
  simulacion: boolean
  total: number
  nuevas: number
  actualizadas: number
  sinCambios: number
  omitidas: number
  colaboradoresNuevos: number
  rechazadas: FilaRechazada[]
  sinMapeo: ArticuloSinMapeo[]
}

interface Entrada {
  almacen: AlmacenEntregas
  asegurar: (fila: ColaboradorHoja) => Promise<{ uid: string; creado: boolean }>
  filas: FilaEntregaHoja[]
  rechazadas: FilaRechazada[]
  hoja: ColaboradorHoja[]
  simular: boolean
}

const COLECCION: Record<DestinoEntrega, string> = { uniforme: 'entregas_uniforme', epp: 'entregas_epp', equipo: 'oficinas_equipo' }

function datosDe(f: FilaEntregaHoja, m: MapeoArticulo, uid: string, c: Record<string, unknown>): Record<string, unknown> {
  const ciudad = typeof c.ciudad === 'string' ? c.ciudad : null
  const comunes = {
    colaborador_id: uid, ...copiaDeColaborador(c), ciudad, articulo: f.articulo, cantidad: f.cantidad, monto: f.monto,
    observaciones: f.observaciones || null, fecha_registro: f.fecha_registro, origen: 'hoja', llave: f.llave,
  }
  if (m.destino === 'uniforme') {
    return {
      ...comunes, prenda: m.valor, talla: f.talla || null, entregado: f.entregado, fecha: f.fecha_entrega,
      periodo: f.fecha_entrega ? periodoDe(f.fecha_entrega) : null,
    }
  }
  if (m.destino === 'epp') {
    return { ...comunes, tipo: m.valor, talla: f.talla || null, entregado: f.entregado, fecha: f.fecha_entrega }
  }
  const detalle = [f.articulo, f.talla && `talla ${f.talla}`, `cantidad ${f.cantidad}`, typeof c.nombre === 'string' && c.nombre]
    .filter(Boolean).join(' · ')
  return { ...comunes, tipo: m.valor, detalle, fecha_recarga: f.fecha_entrega }
}

const comparable = (v: unknown) => (v instanceof Date ? v.getTime() : v === undefined ? null : v)
const igual = (nuevo: Record<string, unknown>, actual: Record<string, unknown> | undefined) =>
  !!actual && Object.entries(nuevo).every(([k, v]) => comparable(v) === comparable(actual[k]))

export async function sincronizarEntregas({ almacen, asegurar, filas, rechazadas, hoja, simular }: Entrada): Promise<InformeEntregas> {
  const mapeo = await almacen.leerMapeo()
  const hojaPorId = new Map(hoja.map((c) => [c.id_interno, c]))
  const informe: InformeEntregas = {
    simulacion: simular, total: filas.length + rechazadas.length, nuevas: 0, actualizadas: 0, sinCambios: 0, omitidas: 0,
    colaboradoresNuevos: 0, rechazadas: [...rechazadas], sinMapeo: [],
  }

  const sinMapeo = new Map<string, ArticuloSinMapeo>()
  const candidatas: { fila: FilaEntregaHoja; mapa: MapeoArticulo }[] = []
  for (const f of filas) {
    const mapa = mapeo.get(claveArticulo(f.articulo))
    if (!mapa) {
      const previo = sinMapeo.get(claveArticulo(f.articulo))
      sinMapeo.set(claveArticulo(f.articulo), { clave: claveArticulo(f.articulo), articulo: previo?.articulo ?? f.articulo, filas: (previo?.filas ?? 0) + 1 })
    } else if (!hojaPorId.has(f.id_interno)) {
      informe.rechazadas.push({ fila: f.fila, motivo: 'El id no está en las hojas de colaboradores' })
    } else if (mapa.destino === 'equipo' && !f.entregado) {
      informe.omitidas++
    } else {
      candidatas.push({ fila: f, mapa })
    }
  }
  informe.sinMapeo = Array.from(sinMapeo.values()).sort((a, b) => b.filas - a.filas)

  const ids = Array.from(new Set(candidatas.map((c) => c.fila.id_interno)))
  const uids = await almacen.leerIndice(ids)
  const faltantes = ids.filter((id) => !uids.has(id))
  informe.colaboradoresNuevos = faltantes.length
  const fallidos = new Map<string, string>()
  if (!simular) {
    for (const id of faltantes) {
      try {
        uids.set(id, (await asegurar(hojaPorId.get(id)!)).uid)
      } catch (e) {
        fallidos.set(id, e instanceof Error ? e.message : 'error desconocido')
        informe.colaboradoresNuevos--
      }
    }
  }

  const colaboradores = new Map<string, Record<string, unknown>>()
  await Promise.all(Array.from(new Set(uids.values())).map(async (uid) => {
    const c = await almacen.leerColaborador(uid)
    if (c) colaboradores.set(uid, c)
  }))
  const existentes = new Map<string, Map<string, Record<string, unknown>>>()
  for (const dest of Array.from(new Set(candidatas.map((c) => c.mapa.destino)))) {
    existentes.set(dest, await almacen.leerExistentes(COLECCION[dest]))
  }

  const operaciones: OperacionEntrega[] = []
  for (const { fila: f, mapa } of candidatas) {
    const uid = uids.get(f.id_interno)
    const colaborador = uid ? colaboradores.get(uid) : undefined
    if (fallidos.has(f.id_interno)) {
      informe.rechazadas.push({ fila: f.fila, motivo: `No se pudo crear al colaborador: ${fallidos.get(f.id_interno)}` })
      continue
    }
    if (!uid || !colaborador) { informe.nuevas++; continue }
    const datos = datosDe(f, mapa, uid, colaborador)
    const actual = existentes.get(mapa.destino)?.get(f.llave)
    if (igual(datos, actual)) { informe.sinCambios++; continue }
    if (actual) informe.actualizadas++; else informe.nuevas++
    operaciones.push({ coleccion: COLECCION[mapa.destino], id: f.llave, datos, nuevo: !actual })
  }
  if (!simular) await almacen.escribir(operaciones)
  return informe
}
