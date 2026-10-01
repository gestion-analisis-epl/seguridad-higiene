import type { FilaComparativo } from '@/application/dashboard'
import type { ColumnaTabla } from '@/presentation/ui/tabla'
import { miles, num } from './formato'
import type { FilaMensual } from './mensual'
import { NIVELES } from './niveles'

type Etiqueta = (valor: string) => string

function numerica<T>(id: string, encabezado: string, valor: (f: T) => number | null, celda?: (f: T) => string): ColumnaTabla<T> {
  return { id, encabezado, tipo: 'numero', alinear: 'derecha', anchoInicial: 130, valor, celda }
}

export const atributosNivel = (f: { nivel: string }) => ({ 'data-nivel': f.nivel })

function columnaNivel<T extends { nivel: keyof typeof NIVELES }>(): ColumnaTabla<T> {
  return {
    id: 'nivel', encabezado: 'Nivel', tipo: 'categoria', valor: (f) => NIVELES[f.nivel],
  }
}

export function columnasComparativo(etiqueta: Etiqueta): ColumnaTabla<FilaComparativo>[] {
  return [
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (f) => etiqueta(f.ciudad) },
    numerica('hht', 'HHT', (f) => f.indices.hht, (f) => miles(f.indices.hht)),
    numerica('eventos', 'Eventos laborales', (f) => f.indices.eventos),
    numerica('if', 'IF', (f) => f.indices.indiceFrecuencia, (f) => num(f.indices.indiceFrecuencia)),
    numerica('is', 'IS', (f) => f.indices.indiceSeveridad, (f) => num(f.indices.indiceSeveridad)),
    numerica('ili', 'ILI', (f) => f.indices.ili, (f) => num(f.indices.ili, 3)),
    columnaNivel<FilaComparativo>(),
  ]
}

export const columnasMensual: ColumnaTabla<FilaMensual>[] = [
  { id: 'mes', encabezado: 'Mes', tipo: 'texto', valor: (f) => f.mes, anchoInicial: 90 },
  numerica<FilaMensual>('poblacion', 'Población', (f) => f.poblacion, (f) => miles(f.poblacion)),
  numerica<FilaMensual>('hht', 'HHT', (f) => f.hht, (f) => miles(f.hht)),
  numerica<FilaMensual>('eventos', 'Eventos laborales', (f) => f.eventos),
  numerica<FilaMensual>('dias', 'Días', (f) => f.dias),
  numerica<FilaMensual>('trayecto', 'Trayecto (informativo)', (f) => f.trayecto),
  numerica<FilaMensual>('if', 'IF', (f) => f.indiceFrecuencia, (f) => num(f.indiceFrecuencia)),
  numerica<FilaMensual>('is', 'IS', (f) => f.indiceSeveridad, (f) => num(f.indiceSeveridad)),
  numerica<FilaMensual>('ili', 'ILI', (f) => f.ili, (f) => num(f.ili, 3)),
  columnaNivel<FilaMensual>(),
]
