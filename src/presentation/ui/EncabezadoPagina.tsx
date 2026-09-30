import type { ReactNode } from 'react'

export function EncabezadoPagina({ rotulo, titulo, detalle, acciones }: {
  rotulo: string; titulo: string; detalle?: ReactNode; acciones?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-borde pb-4">
      <div className="min-w-0">
        <p className="rotulo">{rotulo}</p>
        <h1 className="titulo-pagina mt-1 break-words">{titulo}</h1>
        {detalle && <p className="mt-1 text-sm text-texto-suave">{detalle}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}
