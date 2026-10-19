'use client'

import { CATALOGO_CON_REGION, REGIONES_ANATOMICAS } from '@/domain/catalogos-iniciales'
import { CATALOGO_EMPRESAS } from '@/domain/empresas-nombre-corto'
import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { CeldaAcciones, CeldaEtiqueta, CeldaRegion, CeldaRiesgo, CeldaCorto, type ControlEdicion, type FilaCatalogo } from './celdas-catalogo'

export function TablaCatalogo({ filas, control, catalogo }: { filas: FilaCatalogo[]; control: ControlEdicion; catalogo: string }) {
  // Las columnas se recrean por render: DataTable solo usa ids y medidas para los anchos
  const columnas: ColumnaTabla<FilaCatalogo>[] = [
    {
      id: 'etiqueta', encabezado: 'Etiqueta', tipo: 'texto', valor: (f) => f.etiqueta, anchoInicial: 260,
      celda: (f) => <CeldaEtiqueta fila={f} control={control} />,
    },
    ...(catalogo === CATALOGO_CON_REGION ? [{
      id: 'region', encabezado: 'Región anatómica', tipo: 'texto' as const, anchoInicial: 220,
      valor: (f: FilaCatalogo) => REGIONES_ANATOMICAS.find((r) => r.valor === f.region)?.etiqueta ?? '',
      celda: (f: FilaCatalogo) => <CeldaRegion fila={f} control={control} />,
    }, {
      id: 'riesgo', encabezado: 'Tipo de riesgo', tipo: 'texto' as const, anchoInicial: 360, sinTruncar: true,
      valor: (f: FilaCatalogo) => f.riesgo ?? '',
      celda: (f: FilaCatalogo) => <CeldaRiesgo fila={f} control={control} />,
    }] : []),
    ...(catalogo === CATALOGO_EMPRESAS ? [{
      id: 'nombre_corto', encabezado: 'Nombre corto', tipo: 'texto' as const, anchoInicial: 160,
      valor: (f: FilaCatalogo) => f.nombre_corto ?? '',
      celda: (f: FilaCatalogo) => <CeldaCorto fila={f} control={control} />,
    }] : []),
    { id: 'uso', encabezado: 'Uso', tipo: 'numero', alinear: 'derecha', valor: (f) => f.uso.total, anchoInicial: 90 },
    {
      id: 'acciones', encabezado: 'Acciones', tipo: 'texto', valor: () => '', anchoInicial: 110, anchoMinimo: 100, sinTruncar: true,
      ordenable: false, filtrable: false, celda: (f) => <CeldaAcciones fila={f} control={control} />,
    },
  ]

  return (
    <DataTable columnas={columnas} filas={filas} idFila={(f) => f.valor}
      vacio="Este catálogo está vacío: agrega valores o impórtalos con la migración."
      etiqueta={`Valores del catálogo ${catalogo}`} claveAnchos="admin-catalogo" />
  )
}
