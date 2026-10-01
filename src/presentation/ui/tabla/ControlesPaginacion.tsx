'use client'

import { useId } from 'react'
import { Icono, type NombreIcono } from '../Icono'
import { TAMANOS_PAGINA, type Pagina } from './paginacion'

const BOTON = 'boton-secundario !min-h-[2.5rem] !px-3 disabled:cursor-not-allowed disabled:opacity-50'

export function ControlesPaginacion({ etiqueta, pagina, tamano, alTamano, alPagina }: {
  etiqueta: string
  pagina: Pagina<unknown>
  tamano: number
  alTamano: (tamano: number) => void
  alPagina: (pagina: number) => void
}) {
  const id = useId()
  const { pagina: actual, paginas } = pagina
  const boton = (icono: NombreIcono, texto: string, destino: number, apagado: boolean) => (
    <button type="button" className={BOTON} disabled={apagado} onClick={() => alPagina(destino)}
      aria-label={texto} title={texto}>
      <Icono nombre={icono} className="h-4 w-4" />
    </button>
  )
  return (
    <nav aria-label={`Paginación de ${etiqueta}`} className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={`${id}-tam`} className="text-texto-suave">Filas por página</label>
        <select id={`${id}-tam`} value={tamano} onChange={(e) => alTamano(Number(e.target.value))}
          className="control !w-auto !min-h-[2.5rem]">
          {TAMANOS_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        {boton('pag-primera', 'Primera página', 1, actual <= 1)}
        {boton('pag-anterior', 'Página anterior', actual - 1, actual <= 1)}
        <span role="status" aria-live="polite" className="px-2 text-sm tabular-nums text-texto-suave">
          Página {actual} de {paginas}
        </span>
        {boton('pag-siguiente', 'Página siguiente', actual + 1, actual >= paginas)}
        {boton('pag-ultima', 'Última página', paginas, actual >= paginas)}
      </div>
    </nav>
  )
}
