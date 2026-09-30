import { formatearFecha, periodoDe } from './fechas'

export type Valor = string | number | boolean | Date | null
export type Valores = Record<string, Valor>
export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'booleano' | 'seleccion'
export type OrigenOpciones = { tipo: 'catalogo'; id: string } | { tipo: 'colaboradores' }
export interface Opcion { valor: string; etiqueta: string }

export interface CampoDef {
  nombre: string
  etiqueta: string
  tipo: TipoCampo
  requerido?: boolean
  origen?: OrigenOpciones
  opciones?: Opcion[]
  patron?: RegExp
  mensajePatron?: string
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
}

export function validarRegistro(def: ModuloDef, valores: Valores): Record<string, string> {
  return validarCampos(def.campos, valores)
}

export function validarCampos(campos: CampoDef[], valores: Valores): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const c of campos) {
    const v = valores[c.nombre]
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
  switch (campo.tipo) {
    case 'fecha': return valor instanceof Date ? formatearFecha(valor) : '-'
    case 'booleano': return valor ? 'Sí' : 'No'
    case 'seleccion': return opciones.find((o) => o.valor === valor)?.etiqueta ?? String(valor)
    default: return String(valor)
  }
}

export function derivarCiudad(v: Valores, ctx: ContextoModulo): Valores {
  const id = v.colaborador_id
  return { ...v, ciudad: typeof id === 'string' ? ctx.ciudadDeColaborador(id) : null }
}

export function derivarPeriodo(v: Valores, campoFecha: string): Valores {
  const f = v[campoFecha]
  return { ...v, periodo: f instanceof Date ? periodoDe(f) : null }
}
