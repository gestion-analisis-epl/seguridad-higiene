import type { CampoDef, ModuloDef, Opcion } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import type { ColumnaTabla, TipoColumna, ValorCelda } from '@/presentation/ui/tabla/tipos'

const TIPOS: Record<CampoDef['tipo'], TipoColumna> = {
  texto: 'texto', numero: 'numero', fecha: 'fecha', booleano: 'booleano', seleccion: 'categoria',
}

function valorDe(campo: CampoDef, opciones: Opcion[], v: unknown): ValorCelda {
  if (v === null || v === undefined || v === '') return null
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
