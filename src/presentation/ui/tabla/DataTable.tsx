'use client'

import { useMemo, useState } from 'react'
import { Icono } from '../Icono'
import { usePersistente } from '../usePersistente'
import { EncabezadoColumna } from './EncabezadoColumna'
import { esControlInteractivo } from './interaccion'
import {
  ANCHO_MINIMO, anchosEfectivos, anchosValidos, aplicarFiltros, clamparAncho, filtroActivo,
  opcionesDeCategoria, ordenarFilas, siguienteOrden, textoVisible, type Filtro, type Orden,
} from './logica'
import type { ColumnaTabla, PropsDataTable } from './tipos'

// columnas debe ser una referencia estable (modulo o useMemo); los anchos solo dependen de ids y medidas
export function DataTable<T>({
  columnas, filas, idFila, alSeleccionarFila, vacio, etiqueta, claveAnchos, densidad = 'normal',
  textoAccionFila = 'editar registro',
}: PropsDataTable<T>) {
  const [orden, setOrden] = useState<Orden | null>(null)
  const [filtros, setFiltros] = useState<Record<string, Filtro>>({})
  const [enVivo, setEnVivo] = useState<{ id: string; ancho: number } | null>(null)
  const [guardados, setGuardados] = usePersistente<Record<string, number>>(
    claveAnchos ? `anchos:${claveAnchos}` : null, {}, anchosValidos,
  )

  const claveMedidas = columnas.map((c) => `${c.id}:${c.anchoInicial ?? ''}:${c.anchoMinimo ?? ''}`).join('|')
  const base = useMemo(
    () => anchosEfectivos(columnas, guardados),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claveMedidas, guardados],
  )
  const anchos = enVivo ? { ...base, [enVivo.id]: enVivo.ancho } : base
  const anchoTotal = columnas.reduce((suma, c) => suma + anchos[c.id], 0)
  const hayFiltros = columnas.some((c) => filtros[c.id] && filtroActivo(filtros[c.id]))

  const visibles = useMemo(() => {
    const filtradas = aplicarFiltros(filas, columnas, filtros)
    const col = orden && columnas.find((c) => c.id === orden.id)
    return col && orden ? ordenarFilas(filtradas, col, orden.dir) : filtradas
  }, [filas, columnas, filtros, orden])

  const cambiarFiltro = (id: string, filtro: Filtro | null) =>
    setFiltros((previos) => {
      const siguientes = { ...previos }
      if (filtro && filtroActivo(filtro)) siguientes[id] = filtro
      else delete siguientes[id]
      return siguientes
    })

  const minimoDe = (c: ColumnaTabla<T>) => c.anchoMinimo ?? ANCHO_MINIMO
  const arrastrarAncho = (c: ColumnaTabla<T>, ancho: number) =>
    setEnVivo({ id: c.id, ancho: Math.round(clamparAncho(ancho, minimoDe(c))) })
  const confirmarAncho = (c: ColumnaTabla<T>, ancho: number) => {
    setEnVivo(null)
    setGuardados((prev) => ({ ...prev, [c.id]: Math.round(clamparAncho(ancho, minimoDe(c))) }))
  }
  const restablecerAncho = (c: ColumnaTabla<T>) => {
    setEnVivo(null)
    setGuardados((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== c.id)))
  }

  const alClicFila = (e: React.MouseEvent, fila: T) => {
    if (!esControlInteractivo(e.target as Element)) alSeleccionarFila?.(fila)
  }

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
          className={`tabla !w-auto table-fixed ${densidad === 'compacta' ? '[&_td]:!py-1' : ''}`}
          style={{ width: anchoTotal }}
        >
          <colgroup>
            {columnas.map((c) => <col key={c.id} style={{ width: anchos[c.id] }} />)}
          </colgroup>
          <thead>
            <tr>
              {columnas.map((c) => {
                const filtro = filtros[c.id]
                return (
                  <EncabezadoColumna
                    key={c.id} tipo={c.tipo} encabezado={c.encabezado}
                    derecha={c.alinear === 'derecha'}
                    dir={orden?.id === c.id ? orden.dir : null}
                    ordenable={c.ordenable !== false} filtrable={c.filtrable !== false}
                    filtro={filtro} filtroActivo={!!filtro && filtroActivo(filtro)}
                    opciones={c.tipo === 'categoria' ? opcionesDeCategoria(filas, c) : []}
                    ancho={anchos[c.id]} minimo={minimoDe(c)}
                    alOrdenar={() => setOrden((o) => siguienteOrden(o, c.id))}
                    alFiltrar={(f) => cambiarFiltro(c.id, f)}
                    alArrastrarAncho={(a) => arrastrarAncho(c, a)}
                    alConfirmarAncho={(a) => confirmarAncho(c, a)}
                    alRestablecerAncho={() => restablecerAncho(c)}
                  />
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr><td colSpan={columnas.length} className="py-10 text-center text-texto-suave">{vacio}</td></tr>
            )}
            {visibles.map((fila) => (
              <tr
                key={idFila(fila)}
                onClick={alSeleccionarFila ? (e) => alClicFila(e, fila) : undefined}
                className={alSeleccionarFila ? 'cursor-pointer transition-colors hover:bg-superficie-2 focus-within:bg-superficie-2' : undefined}
              >
                {columnas.map((c, i) => {
                  const contenido = c.celda ? c.celda(fila) : textoVisible(c.valor(fila))
                  return (
                    <td key={c.id} title={textoVisible(c.valor(fila)) || undefined} className={`truncate ${c.alinear === 'derecha' ? 'text-right' : ''}`}>
                      {alSeleccionarFila && i === 0 ? (
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); alSeleccionarFila(fila) }}
                          className="inline-flex max-w-full items-center gap-2 rounded font-medium text-texto underline-offset-2 hover:underline"
                        >
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
