'use client'

import { useMemo } from 'react'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { etiquetaDe } from './etiquetas'

const idRegistro = (r: RegistroEntrega) => r.id

export function HistorialEntregas({ config, registros, items }: {
  config: ConfigEntrega; registros: RegistroEntrega[]; items: Opcion[]
}) {
  const columnas = useMemo((): ColumnaTabla<RegistroEntrega>[] => {
    const lista: ColumnaTabla<RegistroEntrega>[] = [
      { id: 'fecha', encabezado: 'Fecha', tipo: 'fecha', anchoInicial: 130, valor: (r) => (r.fecha instanceof Date ? r.fecha : null) },
      { id: 'item', encabezado: 'Elemento', tipo: 'categoria', anchoInicial: 220, valor: (r) => etiquetaDe(items, r[config.campoItem]) },
      { id: 'articulo', encabezado: 'Artículo', tipo: 'texto', anchoInicial: 240, valor: (r) => (typeof r.articulo === 'string' ? r.articulo : '') },
      { id: 'detalle', encabezado: 'Detalle', tipo: 'texto', anchoInicial: 260, valor: (r) => config.detalle(r) },
      { id: 'monto', encabezado: 'Monto', tipo: 'numero', anchoInicial: 110, alinear: 'derecha', valor: (r) => (typeof r.monto === 'number' ? r.monto : null) },
      { id: 'observaciones', encabezado: 'Observaciones', tipo: 'texto', anchoInicial: 240, valor: (r) => (typeof r.observaciones === 'string' ? r.observaciones : '') },
    ]
    return lista
  }, [config, items])

  return (
    <section aria-labelledby="titulo-historial">
      <h2 id="titulo-historial" className="mb-2 text-base">Historial de entregas ({registros.length})</h2>
      <DataTable columnas={columnas} filas={registros} idFila={idRegistro} vacio="Sin entregas registradas."
        etiqueta="Historial de entregas" claveAnchos={`historial-entregas-${config.coleccion}`} />
    </section>
  )
}
