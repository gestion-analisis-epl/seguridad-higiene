import { formatearValor, type CampoDef, type ModuloDef, type Opcion, type Valor } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { estadoDeColaborador } from '@/application/estado-colaborador'
import type { Filtro } from '@/presentation/ui/tabla/logica'
import { FILTRO_ACTIVO_BOOLEANO, FILTRO_ESTADO_ACTIVO } from '@/presentation/ui/tabla/filtros-estado'
import type { ColumnaTabla, TipoColumna, ValorCelda } from '@/presentation/ui/tabla/tipos'

const TIPOS: Record<CampoDef['tipo'], TipoColumna> = {
  texto: 'texto', numero: 'numero', fecha: 'fecha', booleano: 'booleano', seleccion: 'categoria', lista: 'texto',
}

// Cantidad de ítems más sus nombres, para poder filtrar por contenido.
function resumenLista(campo: CampoDef, v: unknown): ValorCelda {
  if (!Array.isArray(v) || v.length === 0) return null
  const nombres = v.map((i) => (i && typeof i === 'object' ? (i as Record<string, unknown>).nombre : null)).filter(Boolean)
  const base = formatearValor(campo, v as Valor)
  return nombres.length ? `${base}: ${nombres.join(', ')}` : base
}

function valorDe(campo: CampoDef, opciones: Opcion[], v: unknown): ValorCelda {
  if (v === null || v === undefined || v === '') return null
  if (campo.tipo === 'lista') return resumenLista(campo, v)
  switch (campo.tipo) {
    case 'numero': return typeof v === 'number' ? v : null
    case 'fecha': return v instanceof Date ? v : null
    case 'booleano': return Boolean(v)
    case 'seleccion': return opciones.find((o) => o.valor === v)?.etiqueta ?? String(v)
    default: return String(v)
  }
}

export const ID_COLUMNA_ESTADO = 'estado_colaborador'
const CAMPO_COLABORADOR = 'colaborador_id'

// Clave de persistencia de la tabla de cada modulo
export const claveTablaModulo = (id: string) => `tabla-${id}`

export const tieneColaborador = (def: ModuloDef) => def.campos.some((c) => c.nombre === CAMPO_COLABORADOR)

// Estado derivado del colaborador referenciado, resuelto una vez por pagina en el mapa
function columnaEstado(activos: Map<string, boolean>): ColumnaTabla<Registro> {
  return {
    id: ID_COLUMNA_ESTADO, encabezado: 'Estado', tipo: 'categoria',
    valor: (r: Registro) => estadoDeColaborador(activos, r[CAMPO_COLABORADOR]),
  }
}

export function filtrosInicialesDeModulo(def: ModuloDef): Record<string, Filtro> | undefined {
  if (tieneColaborador(def)) return { [ID_COLUMNA_ESTADO]: FILTRO_ESTADO_ACTIVO }
  return def.id === 'colaboradores' ? { activo: FILTRO_ACTIVO_BOOLEANO } : undefined
}

export function columnasDeModulo(
  def: ModuloDef, opciones: Record<string, Opcion[]>, activos?: Map<string, boolean>,
): ColumnaTabla<Registro>[] {
  const columnas = def.columnas.map((nombre): ColumnaTabla<Registro> => {
    const campo = def.campos.find((c) => c.nombre === nombre)!
    const ops = opciones[nombre] ?? []
    return {
      id: nombre,
      encabezado: campo.etiqueta,
      tipo: TIPOS[campo.tipo],
      alinear: campo.tipo === 'numero' ? 'derecha' : 'izquierda',
      // Sin dato de activo cuenta como activo, igual que en el resto de la app
      valor: (r: Registro) => (def.id === 'colaboradores' && nombre === 'activo' ? r[nombre] !== false : valorDe(campo, ops, r[nombre])),
    }
  })
  if (!activos) return columnas
  const i = columnas.findIndex((c) => c.id === CAMPO_COLABORADOR)
  if (i < 0) return columnas
  return [...columnas.slice(0, i + 1), columnaEstado(activos), ...columnas.slice(i + 1)]
}
