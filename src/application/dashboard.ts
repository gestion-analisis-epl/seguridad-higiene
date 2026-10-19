import { indexarReglas, type ReglaDotacion } from '@/domain/reglas-dotacion'
import type {
  Accidente, Capacitacion, Colaborador, DatosOperativos, ItemBotiquin, Poblacion,
} from '@/domain/entidades'
import { diasParaVencer, estadoVencimiento, DIAS_AVISO_VENCIMIENTO } from '@/domain/fechas'
import {
  calcularAnual, calcularMes, clasificarIli,
  type ConfigIndicadores, type Indices, type NivelIli,
} from '@/domain/indicadores'
import { filtrarPorCiudad } from './dashboard-filtro'

const esActivo = (c: Colaborador) => c.activo !== false

// Por clave gana el registro sin vencimiento (nunca vence); entre fechados el más tardío, en empate el primero.
function ultimosPorClave<T extends { vencimiento: Date | null }>(items: T[], clave: (t: T) => string): T[] {
  const ultimos = new Map<string, T>()
  for (const t of items) {
    const actual = ultimos.get(clave(t))
    const masTardio = !actual || (actual.vencimiento !== null && (t.vencimiento === null || t.vencimiento > actual.vencimiento))
    if (masTardio) ultimos.set(clave(t), t)
  }
  return Array.from(ultimos.values())
}

function capacitacionVigente(id: string, caps: Capacitacion[], hoy: Date): boolean {
  return caps.some((c) => c.colaborador_id === id && c.cumple && estadoVencimiento(c.vencimiento, hoy) !== 'vencido')
}

// Quien no tiene regla no se evalúa en uniforme ni EPP y se cuenta aparte.
function evaluar(c: Colaborador, d: DatosOperativos, hoy: Date, regla: ReglaDotacion | null) {
  return {
    capacitacionOk: capacitacionVigente(c.id, d.capacitaciones, hoy),
    sinRegla: regla === null,
    prendasFaltantes: (regla?.prendas ?? []).filter((p) => !d.entregasUniforme.some((e) => e.colaborador_id === c.id && e.prenda === p && e.entregado !== false)),
    eppFaltantes: (regla?.tipos_epp ?? []).filter((t) => !d.entregasEpp.some((e) => e.colaborador_id === c.id && e.tipo === t && e.entregado)),
  }
}

type Evaluado = ReturnType<typeof evaluar>

function evaluarActivos(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[]) {
  const resolver = indexarReglas(reglas)
  return d.colaboradores.filter(esActivo).map((c) => ({ c, e: evaluar(c, d, hoy, resolver(c)) }))
}

const fraccion = (n: number, total: number) => (total === 0 ? null : n / total)

// Uniforme y EPP se miden solo sobre quienes tienen regla; null si nadie la tiene.
function cumplimiento(evaluados: Evaluado[]) {
  const conRegla = evaluados.filter((e) => !e.sinRegla)
  return {
    pctUniforme: fraccion(conRegla.filter((e) => e.prendasFaltantes.length === 0).length, conRegla.length),
    pctEpp: fraccion(conRegla.filter((e) => e.eppFaltantes.length === 0).length, conRegla.length),
    sinRegla: evaluados.length - conRegla.length,
  }
}

export interface ResumenCiudad {
  ciudad: string
  activos: number
  pctCapacitacion: number
  pctUniforme: number | null
  pctEpp: number | null
  sinRegla: number
}

export function resumenPorCiudad(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): ResumenCiudad[] {
  const evaluados = evaluarActivos(d, hoy, reglas)
  const ciudades = Array.from(new Set(evaluados.map(({ c }) => c.ciudad)))
  return ciudades.sort().map((ciudad) => {
    const deCiudad = evaluados.filter(({ c }) => c.ciudad === ciudad).map(({ e }) => e)
    return {
      ciudad,
      activos: deCiudad.length,
      pctCapacitacion: deCiudad.filter((e) => e.capacitacionOk).length / deCiudad.length,
      ...cumplimiento(deCiudad),
    }
  })
}

export interface ResumenGlobal {
  activos: number
  pctCapacitacion: number
  pctUniforme: number | null
  pctEpp: number | null
  sinRegla: number
  vencidos: number
  porVencer: number
}

// Porcentajes como suma de numeradores sobre suma de activos; d ya viene filtrado por ciudad.
export function resumenGlobal(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): ResumenGlobal {
  const evaluados = evaluarActivos(d, hoy, reglas).map(({ e }) => e)
  const alertas = alertasVencimiento(d, hoy)
  return {
    activos: evaluados.length,
    pctCapacitacion: evaluados.length === 0 ? 0 : evaluados.filter((e) => e.capacitacionOk).length / evaluados.length,
    ...cumplimiento(evaluados),
    vencidos: alertas.filter((a) => a.estado === 'vencido').length,
    porVencer: alertas.filter((a) => a.estado === 'por_vencer').length,
  }
}

export interface Pendiente {
  colaborador: Colaborador
  capacitacionPendiente: boolean
  sinRegla: boolean
  prendasFaltantes: string[]
  eppFaltantes: string[]
}

export function pendientesPorColaborador(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): Pendiente[] {
  return evaluarActivos(d, hoy, reglas)
    .map(({ c, e }) => ({
      colaborador: c,
      capacitacionPendiente: !e.capacitacionOk,
      sinRegla: e.sinRegla,
      prendasFaltantes: [...e.prendasFaltantes],
      eppFaltantes: [...e.eppFaltantes],
    }))
    .filter((p) => p.capacitacionPendiente || p.sinRegla || p.prendasFaltantes.length > 0 || p.eppFaltantes.length > 0)
}

export type OrigenAlerta =
  | 'capacitacion' | 'epp' | 'extintor' | 'botiquin' | 'vehiculo_extintor' | 'vehiculo_botiquin'

export interface Alerta {
  origen: OrigenAlerta
  ciudad: string
  referencia: string
  vencimiento: Date
  dias: number
  estado: 'vencido' | 'por_vencer'
}

export function alertasVencimiento(d: DatosOperativos, hoy: Date, dias = DIAS_AVISO_VENCIMIENTO): Alerta[] {
  const alertas: Alerta[] = []
  const colaborador = (id: string) => d.colaboradores.find((c) => c.id === id)
  const nombre = (id: string) => colaborador(id)?.nombre ?? id
  const personaActiva = (id: string) => { const c = colaborador(id); return !c || esActivo(c) }
  const agregar = (origen: OrigenAlerta, ciudad: string, referencia: string, vencimiento: Date | null) => {
    const estado = estadoVencimiento(vencimiento, hoy, dias)
    if (!vencimiento || (estado !== 'vencido' && estado !== 'por_vencer')) return
    alertas.push({ origen, ciudad, referencia, vencimiento, dias: diasParaVencer(vencimiento, hoy), estado })
  }
  const caps = d.capacitaciones.filter((c) => c.cumple && personaActiva(c.colaborador_id))
  for (const c of ultimosPorClave(caps, (c) => `${c.colaborador_id}|${c.norma}`)) {
    agregar('capacitacion', c.ciudad, nombre(c.colaborador_id), c.vencimiento)
  }
  const epp = d.entregasEpp.filter((e) => e.entregado && personaActiva(e.colaborador_id))
  for (const e of ultimosPorClave(epp, (e) => `${e.colaborador_id}|${e.tipo}`)) {
    agregar('epp', colaborador(e.colaborador_id)?.ciudad ?? '', nombre(e.colaborador_id), e.vencimiento)
  }
  // Con ítems cada uno alerta por separado; sin ítems rige la fecha única (registros antiguos).
  const porItem = (origen: OrigenAlerta, ciudad: string, prefijo: string, items: ItemBotiquin[]) => {
    for (const i of items) agregar(origen, ciudad, `${prefijo}Botiquín: ${i.nombre}`, i.caducidad)
  }
  for (const o of d.equipoOficinas) {
    if (o.tipo === 'extintor') agregar('extintor', o.ciudad, 'Extintor', o.vencimiento)
    else if (o.tipo === 'botiquin' && o.items?.length) porItem('botiquin', o.ciudad, '', o.items)
    else if (o.tipo === 'botiquin') agregar('botiquin', o.ciudad, 'Botiquín', o.vencimiento)
  }
  for (const v of d.vehiculos) {
    agregar('vehiculo_extintor', v.ciudad, v.placa, v.extintor_vencimiento)
    if (v.botiquin_items?.length) porItem('vehiculo_botiquin', v.ciudad, `${v.placa} - `, v.botiquin_items)
    else agregar('vehiculo_botiquin', v.ciudad, v.placa, v.botiquin_caducidad)
  }
  return alertas.sort((a, b) => a.dias - b.dias)
}

// Los indices (eventos, dias) cuentan solo accidentes laborales; trayecto es informativo.
export interface PuntoMes extends Indices {
  periodo: string
  trayecto: number
  laboral: number
  poblacion: number
}

export function serieMensual(
  accidentes: Accidente[], poblaciones: Poblacion[], cfg: ConfigIndicadores, anio: number, ciudades?: string[],
): PuntoMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const periodo = `${anio}-${String(i + 1).padStart(2, '0')}`
    const delMes = filtrarPorCiudad(accidentes, ciudades).filter((a) => a.periodo === periodo)
    const trayecto = delMes.filter((a) => a.tipo === 'trayecto').length
    const laboral = delMes.filter((a) => a.tipo === 'laboral').length
    const dias = delMes.filter((a) => a.tipo === 'laboral').reduce((s, a) => s + a.dias_incapacidad, 0)
    const poblacion = filtrarPorCiudad(poblaciones, ciudades)
      .filter((p) => p.periodo === periodo)
      .reduce((s, p) => s + p.poblacion, 0)
    return { periodo, trayecto, laboral, poblacion, ...calcularMes({ poblacion, eventos: laboral, dias }, cfg) }
  })
}

export function acumuladoAnual(puntos: PuntoMes[], cfg: ConfigIndicadores): Indices {
  return calcularAnual(puntos.map((p) => ({ poblacion: p.poblacion, eventos: p.eventos, dias: p.dias })), cfg)
}

export interface FilaComparativo { ciudad: string; indices: Indices; nivel: NivelIli }

export function comparativoCiudades(
  accidentes: Accidente[], poblaciones: Poblacion[], cfg: ConfigIndicadores, anio: number, ciudades: string[],
): FilaComparativo[] {
  return ciudades
    .map((ciudad) => {
      const indices = acumuladoAnual(serieMensual(accidentes, poblaciones, cfg, anio, [ciudad]), cfg)
      return { ciudad, indices, nivel: clasificarIli(indices.ili, cfg) }
    })
    .sort((a, b) => (b.indices.ili ?? -1) - (a.indices.ili ?? -1))
}
