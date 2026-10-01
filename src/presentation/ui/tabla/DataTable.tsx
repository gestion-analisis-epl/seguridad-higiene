'use client'

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Icono } from '../Icono'
import { usePersistente } from '../usePersistente'
import { EncabezadoColumna } from './EncabezadoColumna'
import {
  ANCHO_MAXIMO, ANCHO_MINIMO, anchosEfectivos, anchosValidos, aplicarFiltros, clamparAncho, filtroActivo,
  opcionesDeCategoria, ordenarFilas, siguienteOrden, textoVisible, type Filtro, type Orden,
} from './logica'
import type { ColumnaTabla, PropsDataTable } from './tipos'

export function DataTable<T>({
  columnas, filas, idFila, alSeleccionarFila, vacio, etiqueta, claveAnchos, densidad = 'normal',
  textoAccionFila = 'editar registro',
}: PropsDataTable<T>) {
  const [orden, setOrden] = useState<Orden | null>(null)
  const [filtros, setFiltros] = useState<Record<string, Filtro>>({})
  const [guardados, setGuardados] = usePersistente<Record<string, number>>(
    claveAnchos ? `anchos:${claveAnchos}` : null, {}, anchosValidos,
  )

  const anchos = useMemo(() => anchosEfectivos(columnas, guardados), [columnas, guardados])
  const hayFiltros = columnas.some((c) => filtros[c.id] && filtroActivo(filtros[c.id]))

  const visibles = useMemo(() => {
    const filtradas = aplicarFiltros(filas, columnas, filtros)
    const col = orden && columnas.find((c) => c.id === orden.id)
    return col && orden ? ordenarFilas(filtradas, col, orden.dir) : filtradas
  }, [filas, columnas, filtros, orden])

  const defs = useMemo<ColumnDef<T>[]>(() => columnas.map((c) => ({
    id: c.id,
    accessorFn: (fila) => c.valor(fila),
    header: c.encabezado,
    cell: ({ row }) => (c.celda ? c.celda(row.original) : textoVisible(c.valor(row.original))),
    minSize: c.anchoMinimo ?? ANCHO_MINIMO,
    maxSize: ANCHO_MAXIMO,
  })), [columnas])

  const tabla = useReactTable({
    data: visibles, columns: defs, getRowId: idFila, getCoreRowModel: getCoreRowModel(),
    state: { columnSizing: anchos }, enableColumnResizing: false,
  })

  const cambiarFiltro = (id: string, filtro: Filtro | null) =>
    setFiltros((previos) => {
      const siguientes = { ...previos }
      if (filtro && filtroActivo(filtro)) siguientes[id] = filtro
      else delete siguientes[id]
      return siguientes
    })

  const fijarAncho = (c: ColumnaTabla<T>, ancho: number) =>
    setGuardados((prev) => ({ ...prev, [c.id]: Math.round(clamparAncho(ancho, c.anchoMinimo ?? ANCHO_MINIMO)) }))

  const restablecerAncho = (c: ColumnaTabla<T>) =>
    setGuardados((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== c.id)))

  const filasRender = tabla.getRowModel().rows
  const celdaPad = densidad === 'compacta' ? '[&_td]:!py-1' : ''

  return (
    <div>
      <div className="mb-2 flex min-h-[2.5rem] flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-texto-suave">Mostrando {visibles.length} de {filas.length}</p>
        {hayFiltros && (
          <button type="button" onClick={() => setFiltros({})} className="boton-secundario min-h-[2rem] px-3 text-xs">
            <Icono nombre="cerrar" className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="contenedor-tabla">
        <table
          aria-label={etiqueta} aria-rowcount={visibles.length + 1} aria-colcount={columnas.length}
          className={`tabla !w-auto table-fixed ${celdaPad}`} style={{ width: tabla.getTotalSize() }}
        >
          <colgroup>
            {columnas.map((c) => <col key={c.id} style={{ width: anchos[c.id] }} />)}
          </colgroup>
          <thead>
            {tabla.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((h, i) => {
                  const c = columnas[i]
                  const filtro = filtros[c.id]
                  return (
                    <EncabezadoColumna
                      key={h.id} tipo={c.tipo} encabezado={c.encabezado}
                      derecha={c.alinear === 'derecha'}
                      dir={orden?.id === c.id ? orden.dir : null}
                      ordenable={c.ordenable !== false} filtrable={c.filtrable !== false}
                      filtro={filtro} filtroActivo={!!filtro && filtroActivo(filtro)}
                      opciones={c.tipo === 'categoria' ? opcionesDeCategoria(filas, c) : []}
                      ancho={anchos[c.id]} minimo={c.anchoMinimo ?? ANCHO_MINIMO}
                      alOrdenar={() => setOrden((o) => siguienteOrden(o, c.id))}
                      alFiltrar={(f) => cambiarFiltro(c.id, f)}
                      alAncho={(a) => fijarAncho(c, a)}
                      alRestablecerAncho={() => restablecerAncho(c)}
                    />
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {filasRender.length === 0 && (
              <tr><td colSpan={columnas.length} className="py-10 text-center text-texto-suave">{vacio}</td></tr>
            )}
            {filasRender.map((fila) => (
              <tr
                key={fila.id}
                onClick={alSeleccionarFila ? () => alSeleccionarFila(fila.original) : undefined}
                className={alSeleccionarFila ? 'cursor-pointer transition-colors hover:bg-superficie-2 focus-within:bg-superficie-2' : undefined}
              >
                {fila.getVisibleCells().map((celda, i) => {
                  const c = columnas[i]
                  const contenido = flexRender(celda.column.columnDef.cell, celda.getContext())
                  const titulo = textoVisible(c.valor(fila.original))
                  const alinear = c.alinear === 'derecha' ? 'text-right' : ''
                  return (
                    <td key={celda.id} title={titulo || undefined} className={`truncate ${alinear}`}>
                      {alSeleccionarFila && i === 0 ? (
                        <button type="button" className="inline-flex max-w-full items-center gap-2 rounded font-medium text-texto underline-offset-2 hover:underline">
                          <Icono nombre="editar" className="h-3.5 w-3.5 text-texto-suave" />
                          <span className="min-w-0 truncate">{contenido || 'Sin dato'}</span>
                          <span className="sr-only">, {textoAccionFila}</span>
                        </button>
                      ) : contenido}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
