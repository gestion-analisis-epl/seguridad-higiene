import { derivarCiudad, derivarPeriodo, sanitizarValores, validarCampos, type CampoDef, type Valor, type Valores } from '@/domain/modulos'
import type { ConfigEntrega } from './entregas-config'
import type { ErroresEntrega, Modo, Operacion, RegistroEntrega } from './entregas-tipos'

export interface EntradaEntrega {
  config: ConfigEntrega
  modo: Modo
  colaboradorId: string
  ciudad: string | null
  claves: string[]
  fecha: Date | null
  items: Record<string, Valores>
  ultimas: Record<string, RegistroEntrega>
  copia?: Valores
}

export interface PlanEntrega { errores: ErroresEntrega; operaciones: Operacion[] }

const vacio = (v: unknown) => v === null || v === undefined || v === ''

function normalizar(campo: CampoDef, v: unknown): Valor {
  if (campo.tipo === 'booleano') return v === true
  return vacio(v) ? null : (v as Valor)
}

function comparable(v: Valor): unknown {
  return v instanceof Date ? v.getTime() : v
}

const limpio = (e: EntradaEntrega, v: Valores): Valores => sanitizarValores(e.config.campos, v)

export function valoresIniciales(config: ConfigEntrega, registro: RegistroEntrega | undefined): Valores {
  const valores: Valores = {}
  if (!registro) return valores
  for (const c of config.campos) valores[c.nombre] = normalizar(c, registro[c.nombre])
  return valores
}

function armarValores(e: EntradaEntrega, clave: string, v: Valores): Valores {
  const base: Valores = { colaborador_id: e.colaboradorId, [e.config.campoItem]: clave }
  for (const c of e.config.campos) base[c.nombre] = normalizar(c, v[c.nombre])
  const conCiudad = derivarCiudad(base, { ciudadDeColaborador: () => e.ciudad, copiaDeColaborador: () => e.copia ?? {} })
  return e.config.derivaPeriodo ? derivarPeriodo(conCiudad, 'fecha') : conCiudad
}

function validarItem(e: EntradaEntrega, v: Valores, exigeFecha: boolean, errores: ErroresEntrega, clave: string) {
  const campos = e.config.campos.map((c) => (c.nombre === 'fecha' ? { ...c, requerido: exigeFecha } : c))
  const fallos = validarCampos(campos, v)
  if (e.modo === 'nueva' && fallos.fecha) {
    errores.fecha = fallos.fecha
    delete fallos.fecha
  }
  if (Object.keys(fallos).length) errores.items[clave] = fallos
}

function cambio(e: EntradaEntrega, v: Valores, registro: RegistroEntrega): boolean {
  return e.config.campos.some((c) =>
    comparable(normalizar(c, v[c.nombre])) !== comparable(normalizar(c, registro[c.nombre])))
}

function planNueva(e: EntradaEntrega, errores: ErroresEntrega): Operacion[] {
  const operaciones: Operacion[] = []
  let capturados = 0
  for (const clave of e.claves) {
    const v: Valores = limpio(e, { ...(e.items[clave] ?? {}), fecha: e.fecha })
    const soloVencimiento = e.config.conVencimiento && !vacio(v.vencimiento) && !e.config.capturado(v)
    if (!e.config.capturado(v) && !soloVencimiento) continue
    capturados++
    if (soloVencimiento) {
      errores.items[clave] = { vencimiento: 'Marca Entregado para registrar el vencimiento' }
      continue
    }
    validarItem(e, v, true, errores, clave)
    operaciones.push({ tipo: 'crear', coleccion: e.config.coleccion, valores: armarValores(e, clave, v) })
  }
  if (!capturados) errores.general = 'Captura al menos un artículo'
  return operaciones
}

function planCorregir(e: EntradaEntrega, errores: ErroresEntrega): Operacion[] {
  const operaciones: Operacion[] = []
  for (const clave of e.claves) {
    if (!e.items[clave]) continue
    const v = limpio(e, e.items[clave])
    const registro = e.ultimas[clave]
    if (!registro) {
      if (!e.config.capturado(v)) continue
      validarItem(e, v, true, errores, clave)
      operaciones.push({ tipo: 'crear', coleccion: e.config.coleccion, valores: armarValores(e, clave, v) })
    } else if (!(e.config.ignorarVacioAlCorregir && !e.config.capturado(v)) && cambio(e, v, registro)) {
      validarItem(e, v, e.config.fechaObligatoriaAlEditar, errores, clave)
      operaciones.push({
        tipo: 'actualizar', coleccion: e.config.coleccion, id: registro.id, valores: armarValores(e, clave, v),
      })
    }
  }
  if (!operaciones.length) errores.general = 'No hay cambios'
  return operaciones
}

export function planificarEntrega(entrada: EntradaEntrega): PlanEntrega {
  const errores: ErroresEntrega = { items: {} }
  const operaciones = entrada.modo === 'nueva' ? planNueva(entrada, errores) : planCorregir(entrada, errores)
  const conErrores = !!errores.general || !!errores.fecha || Object.keys(errores.items).length > 0
  return { errores, operaciones: conErrores ? [] : operaciones }
}
