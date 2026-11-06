'use client'

import { useId, useMemo } from 'react'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import { aOracion } from '@/domain/texto'
import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { etiquetaDe } from './etiquetas'

const idRegistro = (r: RegistroEntrega) => r.id

export function HistorialEntregas({ config, registros, items, titulo = 'Historial de entregas' }: {
  config: ConfigEntrega; registros: RegistroEntrega[]; items: Opcion[]; titulo?: string
}) {
  const idTitulo = useId()
  const columnas = useMemo((): ColumnaTabla<RegistroEntrega>[] => {
    const lista: ColumnaTabla<RegistroEntrega>[] = [
      { id: 'registro', encabezado: 'Registro', tipo: 'fecha', anchoInicial: 130, valor: (r) => (r.fecha_registro instanceof Date ? r.fecha_registro : null) },
      { id: 'fecha', encabezado: 'Entrega', tipo: 'fecha', anchoInicial: 130, valor: (r) => (r.fecha instanceof Date ? r.fecha : null) },
      { id: 'item', encabezado: 'Elemento', tipo: 'categoria', anchoInicial: 220, valor: (r) => aOracion(etiquetaDe(items, r[config.campoItem])) },
      { id: 'articulo', encabezado: 'Artículo', tipo: 'texto', anchoInicial: 240, valor: (r) => (typeof r.articulo === 'string' ? aOracion(r.articulo) : '') },
      { id: 'detalle', encabezado: 'Detalle', tipo: 'texto', anchoInicial: 260, valor: (r) => config.detalle(r) },
      { id: 'monto', encabezado: 'Monto', tipo: 'numero', anchoInicial: 110, alinear: 'derecha', valor: (r) => (typeof r.monto === 'number' ? r.monto : null) },
      { id: 'observaciones', encabezado: 'Observaciones', tipo: 'texto', anchoInicial: 240, valor: (r) => (typeof r.observaciones === 'string' ? r.observaciones : '') },
    ]
    return lista
  }, [config, items])

  return (
    <section aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="mb-2 text-base">{titulo} ({registros.length})</h2>
      <DataTable columnas={columnas} filas={registros} idFila={idRegistro} vacio="Sin entregas registradas."
        etiqueta="Historial de entregas" claveAnchos={`historial-entregas-${config.coleccion}`} />
    </section>
  )
}
