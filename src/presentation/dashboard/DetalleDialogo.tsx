'use client'

import { Dialogo } from '@/presentation/ui/Dialogo'
import { DataTable, type ColumnaTabla } from '@/presentation/ui'

// Los registros que suman en la barra o tarjeta elegida
export function DetalleDialogo<T>({ titulo, unidad, filas, columnas, idFila, alCerrar }: {
  titulo: string
  unidad: string
  filas: T[]
  columnas: ColumnaTabla<T>[]
  idFila: (fila: T) => string
  alCerrar: () => void
}) {
  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar}>
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <h3 className="text-base">{titulo} <span className="text-texto-suave">· {filas.length} {unidad}</span></h3>
        <button type="button" className="boton-secundario" onClick={alCerrar}>Cerrar</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <DataTable columnas={columnas} filas={filas} idFila={idFila} vacio="Sin registros." etiqueta={titulo} claveAnchos="dashboard-detalle" />
      </div>
    </Dialogo>
  )
}
