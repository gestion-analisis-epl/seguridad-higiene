import { claveNorma, type FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { normalizarNombre } from '@/domain/colaboradores-hoja'
import { aTextoIso, deTextoIso, estadoCapacitacion } from '@/domain/fechas'

export interface ColaboradorCapacitacion { id: string; nombre: string; activo: boolean; ciudad: string | null }
export interface NormaCatalogo { valor: string; etiqueta: string }
export interface CapacitacionExistente {
  id: string
  colaborador_id: string
  norma: string
  cumple: boolean
  fecha: Date | null
  vencimiento: Date | null
}

// id null pide crear con identificador automático
export interface OperacionCapacitacion { id: string | null; nuevo: boolean; datos: Record<string, unknown> }

export interface AlmacenCapacitaciones {
  leerColaboradores(): Promise<ColaboradorCapacitacion[]>
  leerNormas(): Promise<NormaCatalogo[]>
  leerCapacitaciones(): Promise<CapacitacionExistente[]>
  escribir(operaciones: OperacionCapacitacion[]): Promise<void>
}

export interface InformeCapacitaciones {
  simulacion: boolean
  total: number
  nuevas: number
  actualizadas: number
  sinCambios: number
  noRetrocedidas: number
  sinCoincidencia: string[]
  ambiguas: string[]
  rechazadas: { hoja: string; fila: number; motivo: string }[]
}

interface Entrada {
  almacen: AlmacenCapacitaciones
  filas: FilaCapacitacionExcel[]
  simular: boolean
  hoy: Date
}

// Se compara por día de calendario para no depender de la hora guardada
const dia = (d: Date | null) => aTextoIso(d)

export async function sincronizarCapacitaciones({ almacen, filas, simular, hoy }: Entrada): Promise<InformeCapacitaciones> {
  const [colaboradores, normas, existentes] = await Promise.all([
    almacen.leerColaboradores(), almacen.leerNormas(), almacen.leerCapacitaciones(),
  ])
  const porNombre = new Map<string, ColaboradorCapacitacion[]>()
  for (const c of colaboradores) {
    const k = normalizarNombre(c.nombre)
    porNombre.set(k, [...(porNombre.get(k) ?? []), c])
  }
  const normaPorClave = new Map<string, string>()
  for (const n of normas) {
    normaPorClave.set(claveNorma(n.valor), n.valor)
    normaPorClave.set(claveNorma(n.etiqueta), n.valor)
  }
  // Si hay varias para la misma persona y norma, gana la de fecha más reciente
  const existentePor = new Map<string, CapacitacionExistente>()
  for (const e of existentes) {
    const k = `${e.colaborador_id}|${e.norma}`
    const previa = existentePor.get(k)
    if (!previa || dia(e.fecha) > dia(previa.fecha)) existentePor.set(k, e)
  }

  const informe: InformeCapacitaciones = {
    simulacion: simular, total: filas.length, nuevas: 0, actualizadas: 0, sinCambios: 0, noRetrocedidas: 0,
    sinCoincidencia: [], ambiguas: [], rechazadas: [],
  }
  const sinCoincidencia = new Set<string>()
  const ambiguas = new Set<string>()
  const resueltas = new Map<string, { colaborador: ColaboradorCapacitacion; norma: string; fila: FilaCapacitacionExcel }>()
  for (const f of filas) {
    const norma = normaPorClave.get(claveNorma(f.norma))
    if (!norma) {
      informe.rechazadas.push({ hoja: f.hoja, fila: f.fila, motivo: `La norma "${f.norma}" no está en el catálogo` })
      continue
    }
    const candidatos = porNombre.get(normalizarNombre(f.nombre)) ?? []
    if (candidatos.length === 0) { sinCoincidencia.add(f.nombre); continue }
    const activos = candidatos.filter((c) => c.activo)
    const colaborador = candidatos.length === 1 ? candidatos[0] : activos.length === 1 ? activos[0] : null
    if (!colaborador) { ambiguas.add(f.nombre); continue }
    resueltas.set(`${colaborador.id}|${norma}`, { colaborador, norma, fila: f })
  }
  informe.sinCoincidencia = Array.from(sinCoincidencia).sort((a, b) => a.localeCompare(b, 'es'))
  informe.ambiguas = Array.from(ambiguas).sort((a, b) => a.localeCompare(b, 'es'))

  const operaciones: OperacionCapacitacion[] = []
  for (const [llave, { colaborador, norma, fila }] of resueltas) {
    const fecha = fila.fecha ? deTextoIso(fila.fecha) : null
    const vencimiento = fila.vencimiento ? deTextoIso(fila.vencimiento) : null
    const datos = {
      colaborador_id: colaborador.id, norma, cumple: fila.cumple, fecha, vencimiento,
      estado: estadoCapacitacion(fecha, vencimiento, hoy), ciudad: colaborador.ciudad,
    }
    const existente = existentePor.get(llave)
    if (!existente) {
      informe.nuevas++
      operaciones.push({ id: null, nuevo: true, datos })
    } else if (existente.fecha && (!fecha || dia(existente.fecha) > dia(fecha))) {
      informe.noRetrocedidas++
    } else if (existente.cumple === fila.cumple && dia(existente.fecha) === dia(fecha) && dia(existente.vencimiento) === dia(vencimiento)) {
      informe.sinCambios++
    } else {
      informe.actualizadas++
      operaciones.push({ id: existente.id, nuevo: false, datos })
    }
  }
  if (!simular && operaciones.length > 0) await almacen.escribir(operaciones)
  return informe
}
