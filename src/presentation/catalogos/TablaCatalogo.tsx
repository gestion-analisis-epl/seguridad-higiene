'use client'

import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { CeldaAcciones, CeldaEtiqueta, type ControlEdicion, type FilaCatalogo } from './celdas-catalogo'

export function TablaCatalogo({ filas, control, catalogo }: { filas: FilaCatalogo[]; control: ControlEdicion; catalogo: string }) {
  // Las columnas se recrean por render: DataTable solo usa ids y medidas para los anchos
  const columnas: ColumnaTabla<FilaCatalogo>[] = [
    {
      id: 'etiqueta', encabezado: 'Etiqueta', tipo: 'texto', valor: (f) => f.etiqueta, anchoInicial: 260,
      celda: (f) => <CeldaEtiqueta fila={f} control={control} />,
    },
    { id: 'valor', encabezado: 'Valor interno (solo lectura)', tipo: 'texto', valor: (f) => f.valor, anchoInicial: 220 },
    { id: 'uso', encabezado: 'Uso', tipo: 'numero', alinear: 'derecha', valor: (f) => f.uso.total, anchoInicial: 90 },
    {
      id: 'acciones', encabezado: 'Acciones', tipo: 'texto', valor: () => '', anchoInicial: 300, anchoMinimo: 220, sinTruncar: true,
      ordenable: false, filtrable: false, celda: (f) => <CeldaAcciones fila={f} control={control} />,
    },
  ]

  return (
    <DataTable columnas={columnas} filas={filas} idFila={(f) => f.valor}
      vacio="Este catálogo está vacío: agrega valores o impórtalos con la migración."
      etiqueta={`Valores del catálogo ${catalogo}`} claveAnchos="admin-catalogo" />
  )
}
