import { formatearValor, type CampoDef, type ModuloDef, type Opcion, type Valor } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
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

export function columnasDeModulo(def: ModuloDef, opciones: Record<string, Opcion[]>): ColumnaTabla<Registro>[] {
  return def.columnas.map((nombre) => {
    const campo = def.campos.find((c) => c.nombre === nombre)!
    const ops = opciones[nombre] ?? []
    return {
      id: nombre,
      encabezado: campo.etiqueta,
      tipo: TIPOS[campo.tipo],
      alinear: campo.tipo === 'numero' ? 'derecha' : 'izquierda',
      valor: (r: Registro) => valorDe(campo, ops, r[nombre]),
    }
  })
}
