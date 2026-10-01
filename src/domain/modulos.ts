import type { ModuloAdjunto } from './adjuntos'
import { formatearFecha, periodoDe } from './fechas'
import { aPlaca, aTitulo, limpiarLibre, limpiarTexto } from './texto'

export type ValorItem = string | number | Date | null
export type Item = Record<string, ValorItem>
export type Valor = string | number | boolean | Date | null | Item[]
export type Valores = Record<string, Valor>
export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'booleano' | 'seleccion' | 'lista'
export type OrigenOpciones = { tipo: 'catalogo'; id: string } | { tipo: 'colaboradores' }
export type FormatoTexto = 'titulo' | 'placa' | 'libre'
export interface Opcion { valor: string; etiqueta: string }

export interface CampoDef {
  nombre: string
  etiqueta: string
  tipo: TipoCampo
  requerido?: boolean
  origen?: OrigenOpciones
  opciones?: Opcion[]
  formato?: FormatoTexto
  patron?: RegExp
  mensajePatron?: string
  subcampos?: CampoDef[]
  visibleSi?: (valores: Valores) => boolean
}

export interface ContextoModulo { ciudadDeColaborador(id: string): string | null }

export interface ModuloDef {
  id: string
  coleccion: string
  titulo: string
  campos: CampoDef[]
  columnas: string[]
  inicial?: Valores
  derivar?: (valores: Valores, ctx: ContextoModulo, hoy: Date) => Valores
  idFijo?: (valores: Valores) => string
  bloquearEnEdicion?: string[]
  adjuntos?: ModuloAdjunto
}

export function validarRegistro(def: ModuloDef, valores: Valores): Record<string, string> {
  return validarCampos(def.campos, valores)
}

function sanitizarTexto(c: CampoDef, v: string): string {
  if (c.patron) return v.trim()
  switch (c.formato) {
    case 'titulo': return aTitulo(v)
    case 'placa': return aPlaca(v)
    case 'libre': return limpiarLibre(v)
    default: return limpiarTexto(v)
  }
}

// Sanitiza los campos de texto (y subcampos de listas) antes de validar y guardar.
export function sanitizarValores(campos: CampoDef[], valores: Valores): Valores {
  const salida = { ...valores }
  for (const c of campos) {
    const v = valores[c.nombre]
    if (c.tipo === 'lista' && Array.isArray(v)) {
      salida[c.nombre] = v.map((item) => sanitizarValores(c.subcampos ?? [], item) as Item)
    } else if (c.tipo === 'texto' && typeof v === 'string') {
      salida[c.nombre] = sanitizarTexto(c, v)
    }
  }
  return salida
}

export const campoVisible = (c: CampoDef, valores: Valores): boolean => c.visibleSi?.(valores) ?? true

// Los campos ocultos se guardan en null para no dejar valores obsoletos.
export function limpiarOcultos(campos: CampoDef[], valores: Valores): Valores {
  const salida = { ...valores }
  for (const c of campos) if (!campoVisible(c, valores)) salida[c.nombre] = null
  return salida
}

// Errores de ítems con clave "lista.fila.subcampo" (fila desde 0).
function validarLista(c: CampoDef, v: Valor | undefined, errores: Record<string, string>) {
  if (!Array.isArray(v)) return
  v.forEach((item, i) => {
    for (const [k, msg] of Object.entries(validarCampos(c.subcampos ?? [], item))) errores[`${c.nombre}.${i}.${k}`] = msg
  })
}

export function validarCampos(campos: CampoDef[], valores: Valores): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const c of campos) {
    if (!campoVisible(c, valores)) continue
    const v = valores[c.nombre]
    if (c.tipo === 'lista') {
      validarLista(c, v, errores)
      continue
    }
    const vacio = v === null || v === undefined || v === ''
    if (vacio) {
      if (c.requerido && c.tipo !== 'booleano') errores[c.nombre] = 'Obligatorio'
      continue
    }
    if (c.tipo === 'numero' && !(typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
      errores[c.nombre] = 'Número inválido'
    } else if (c.tipo === 'fecha' && !(v instanceof Date && !Number.isNaN(v.getTime()))) {
      errores[c.nombre] = 'Fecha inválida'
    } else if (c.tipo === 'seleccion' && c.opciones && !c.opciones.some((o) => o.valor === v)) {
      errores[c.nombre] = 'Opción inválida'
    } else if (c.patron && !(typeof v === 'string' && c.patron.test(v))) {
      errores[c.nombre] = c.mensajePatron ?? 'Formato inválido'
    }
  }
  return errores
}

export function formatearValor(campo: CampoDef, valor: Valor | undefined, opciones: Opcion[] = []): string {
  if (valor === null || valor === undefined || valor === '') return '-'
  if (Array.isArray(valor)) return valor.length === 0 ? '-' : `${valor.length} ${valor.length === 1 ? 'ítem' : 'ítems'}`
  switch (campo.tipo) {
    case 'fecha': return valor instanceof Date ? formatearFecha(valor) : '-'
    case 'booleano': return valor ? 'Sí' : 'No'
    case 'seleccion': return opciones.find((o) => o.valor === valor)?.etiqueta ?? String(valor)
    default: return String(valor)
  }
}

export function caducidadMasProxima(items: Valor | undefined): Date | null {
  if (!Array.isArray(items)) return null
  const fechas = items.map((i) => i.caducidad).filter((f): f is Date => f instanceof Date)
  return fechas.reduce<Date | null>((min, f) => (min === null || f < min ? f : min), null)
}

// Con ítems el campo de fecha se deriva; sin ítems se conserva el valor manual.
export function derivarCaducidad(v: Valores, campoItems: string, campoFecha: string): Valores {
  const items = v[campoItems]
  if (!Array.isArray(items) || items.length === 0) return v
  return { ...v, [campoFecha]: caducidadMasProxima(items) }
}

export function derivarCiudad(v: Valores, ctx: ContextoModulo): Valores {
  const id = v.colaborador_id
  return { ...v, ciudad: typeof id === 'string' ? ctx.ciudadDeColaborador(id) : null }
}

export function derivarPeriodo(v: Valores, campoFecha: string): Valores {
  const f = v[campoFecha]
  return { ...v, periodo: f instanceof Date ? periodoDe(f) : null }
}
