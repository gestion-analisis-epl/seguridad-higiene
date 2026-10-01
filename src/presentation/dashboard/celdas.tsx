import type { ReactNode } from 'react'
import type { Alerta, Pendiente } from '@/application/dashboard'
import { Icono } from '@/presentation/ui/Icono'
import type { ColumnaTabla } from '@/presentation/ui/tabla'
import { columnasMensual } from './columnas-analitico'
import { textoEstado, textoOrigen } from './columnas-operativo'
import type { FilaMensual } from './mensual'
import { NIVELES } from './niveles'

// Reemplaza la celda de columnas puras por su versión visual (el texto sigue siendo el valor)
export function conCeldas<T>(columnas: ColumnaTabla<T>[], celdas: Record<string, (fila: T) => ReactNode>): ColumnaTabla<T>[] {
  return columnas.map((c) => (celdas[c.id] ? { ...c, celda: celdas[c.id] } : c))
}

export const celdasAlertas = {
  estado: (a: Alerta) => (
    <span className={a.estado === 'vencido' ? 'insignia-vencido' : 'insignia-por-vencer'}>
      <Icono nombre="alerta" className="h-3.5 w-3.5" />
      {textoEstado(a)}
    </span>
  ),
  origen: (a: Alerta) => <span className="capitalize">{textoOrigen(a)}</span>,
}

export const celdasPendientes = {
  capacitacion: (p: Pendiente) => (
    <span className={p.capacitacionPendiente ? 'insignia-vencido' : 'insignia-vigente'}>
      {p.capacitacionPendiente ? 'Pendiente' : 'Vigente'}
    </span>
  ),
}

export const celdaNivel = { nivel: (f: { nivel: keyof typeof NIVELES }) => <span className="nivel-etiqueta">{NIVELES[f.nivel]}</span> }

export const columnasMensualUi = conCeldas<FilaMensual>(columnasMensual, celdaNivel)
