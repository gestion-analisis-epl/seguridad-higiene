import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'
import type {
  Accidente, Capacitacion, Colaborador, DatosOperativos, Poblacion,
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

function evaluar(c: Colaborador, d: DatosOperativos, hoy: Date) {
  return {
    capacitacionOk: capacitacionVigente(c.id, d.capacitaciones, hoy),
    prendasFaltantes: PRENDAS.filter((p) => !d.entregasUniforme.some((e) => e.colaborador_id === c.id && e.prenda === p)),
    eppFaltantes: TIPOS_EPP.filter((t) => !d.entregasEpp.some((e) => e.colaborador_id === c.id && e.tipo === t && e.entregado)),
  }
}

export interface ResumenCiudad {
  ciudad: string
  activos: number
  pctCapacitacion: number
  pctUniforme: number
  pctEpp: number
}

export function resumenPorCiudad(d: DatosOperativos, hoy: Date): ResumenCiudad[] {
  const ciudades = Array.from(new Set(d.colaboradores.filter(esActivo).map((c) => c.ciudad)))
  return ciudades.sort().map((ciudad) => {
    const activos = d.colaboradores.filter((c) => esActivo(c) && c.ciudad === ciudad)
    const evaluados = activos.map((c) => evaluar(c, d, hoy))
    const pct = (n: number) => n / activos.length
    return {
      ciudad,
      activos: activos.length,
      pctCapacitacion: pct(evaluados.filter((e) => e.capacitacionOk).length),
      pctUniforme: pct(evaluados.filter((e) => e.prendasFaltantes.length === 0).length),
      pctEpp: pct(evaluados.filter((e) => e.eppFaltantes.length === 0).length),
    }
  })
}

export interface ResumenGlobal {
  activos: number
  pctCapacitacion: number
  pctUniforme: number
  pctEpp: number
  vencidos: number
  porVencer: number
}

// Porcentajes como suma de numeradores sobre suma de activos; d ya viene filtrado por ciudad.
export function resumenGlobal(d: DatosOperativos, hoy: Date): ResumenGlobal {
  const evaluados = d.colaboradores.filter(esActivo).map((c) => evaluar(c, d, hoy))
  const pct = (n: number) => (evaluados.length === 0 ? 0 : n / evaluados.length)
  const alertas = alertasVencimiento(d, hoy)
  return {
    activos: evaluados.length,
    pctCapacitacion: pct(evaluados.filter((e) => e.capacitacionOk).length),
    pctUniforme: pct(evaluados.filter((e) => e.prendasFaltantes.length === 0).length),
    pctEpp: pct(evaluados.filter((e) => e.eppFaltantes.length === 0).length),
    vencidos: alertas.filter((a) => a.estado === 'vencido').length,
    porVencer: alertas.filter((a) => a.estado === 'por_vencer').length,
  }
}

export interface Pendiente {
  colaborador: Colaborador
  capacitacionPendiente: boolean
  prendasFaltantes: string[]
  eppFaltantes: string[]
}

export function pendientesPorColaborador(d: DatosOperativos, hoy: Date): Pendiente[] {
  return d.colaboradores
    .filter(esActivo)
    .map((colaborador) => {
      const e = evaluar(colaborador, d, hoy)
      return {
        colaborador,
        capacitacionPendiente: !e.capacitacionOk,
        prendasFaltantes: [...e.prendasFaltantes],
        eppFaltantes: [...e.eppFaltantes],
      }
    })
    .filter((p) => p.capacitacionPendiente || p.prendasFaltantes.length > 0 || p.eppFaltantes.length > 0)
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
  for (const o of d.equipoOficinas) {
    if (o.tipo === 'extintor' || o.tipo === 'botiquin') agregar(o.tipo, o.ciudad, o.tipo === 'extintor' ? 'Extintor' : 'Botiquín', o.vencimiento)
  }
  for (const v of d.vehiculos) {
    agregar('vehiculo_extintor', v.ciudad, v.placa, v.extintor_vencimiento)
    agregar('vehiculo_botiquin', v.ciudad, v.placa, v.botiquin_caducidad)
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
