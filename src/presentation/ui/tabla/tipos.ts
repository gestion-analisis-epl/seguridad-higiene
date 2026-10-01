import type { ReactNode } from 'react'
import type { ColumnaLogica, Filtro } from './logica'

export type { TipoColumna, ValorCelda } from './logica'

export interface ColumnaTabla<T> extends ColumnaLogica<T> {
  encabezado: string
  celda?: (fila: T) => ReactNode
  anchoInicial?: number
  anchoMinimo?: number
  ordenable?: boolean
  filtrable?: boolean
  alinear?: 'izquierda' | 'derecha'
  // Celdas con controles: no se truncan con puntos suspensivos
  sinTruncar?: boolean
}

export interface PropsDataTable<T> {
  columnas: ColumnaTabla<T>[]
  filas: T[]
  idFila: (fila: T) => string
  alSeleccionarFila?: (fila: T) => void
  vacio: string
  etiqueta: string
  claveAnchos?: string
  // Filtros con que arranca la tabla si no hay estado guardado; deben ser una referencia estable
  filtrosIniciales?: Record<string, Filtro>
  densidad?: 'normal' | 'compacta'
  textoAccionFila?: string
  atributosFila?: (fila: T) => Record<string, string>
}
