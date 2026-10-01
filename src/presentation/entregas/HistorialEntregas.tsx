'use client'

import { useMemo } from 'react'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { CeldaEliminarEntrega } from './CeldaEliminarEntrega'
import { etiquetaDe } from './etiquetas'

const idRegistro = (r: RegistroEntrega) => r.id

export function HistorialEntregas({ config, registros, items, puedeEliminar }: {
  config: ConfigEntrega; registros: RegistroEntrega[]; items: Opcion[]; puedeEliminar: boolean
}) {
  const columnas = useMemo((): ColumnaTabla<RegistroEntrega>[] => {
    const lista: ColumnaTabla<RegistroEntrega>[] = [
      { id: 'fecha', encabezado: 'Fecha', tipo: 'fecha', anchoInicial: 130, valor: (r) => (r.fecha instanceof Date ? r.fecha : null) },
      { id: 'item', encabezado: 'Elemento', tipo: 'categoria', anchoInicial: 220, valor: (r) => etiquetaDe(items, r[config.campoItem]) },
      { id: 'detalle', encabezado: 'Detalle', tipo: 'texto', anchoInicial: 320, valor: (r) => config.detalle(r) },
    ]
    if (puedeEliminar) {
      lista.push({
        id: 'acciones', encabezado: 'Acciones', tipo: 'texto', anchoInicial: 260, anchoMinimo: 200, sinTruncar: true,
        ordenable: false, filtrable: false, valor: () => '',
        celda: (r) => <CeldaEliminarEntrega config={config} registro={r} etiqueta={etiquetaDe(items, r[config.campoItem])} />,
      })
    }
    return lista
  }, [config, items, puedeEliminar])

  return (
    <section aria-labelledby="titulo-historial">
      <h2 id="titulo-historial" className="mb-2 text-base">Historial de entregas ({registros.length})</h2>
      <DataTable columnas={columnas} filas={registros} idFila={idRegistro} vacio="Sin entregas registradas."
        etiqueta="Historial de entregas" claveAnchos={`historial-entregas-${config.coleccion}`} />
    </section>
  )
}
