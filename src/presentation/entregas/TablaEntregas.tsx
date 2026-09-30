'use client'

import { useMemo } from 'react'
import type { FilaEntrega } from '@/application/entregas-agrupar'
import type { Opcion } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'
import { CeldaEntrega } from './CeldaEntrega'
import type { ConfiguracionPagina } from './configuraciones'
import { etiquetaDe } from './etiquetas'

const PEGADA = 'sticky left-0 z-[1] border-r border-borde'

export function TablaEntregas({ cfg, filas, items, ciudades, alAbrir, alNueva }: {
  cfg: ConfiguracionPagina
  filas: FilaEntrega[]
  items: Opcion[]
  ciudades: Opcion[]
  alAbrir: (colaboradorId: string) => void
  alNueva?: (colaboradorId: string) => void
}) {
  const hoy = useMemo(() => new Date(), [])
  const columnas = 3 + items.length
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col" className={`${PEGADA} !bg-superficie-2`}>Colaborador</th>
            <th scope="col">Ciudad</th>
            {items.map((i) => <th key={i.valor} scope="col">{i.etiqueta}</th>)}
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={columnas} className="py-10 text-center text-texto-suave">Sin colaboradores</td></tr>
          )}
          {filas.map(({ colaborador: c, ultimas, cantidadEntregas }) => (
            <tr key={c.id} onClick={() => alAbrir(c.id)}
              className="group cursor-pointer transition-colors hover:bg-superficie-2 focus-within:bg-superficie-2">
              <td className={`${PEGADA} whitespace-nowrap bg-superficie group-hover:bg-superficie-2 group-focus-within:bg-superficie-2`}>
                <button type="button" className="inline-flex items-center gap-2 rounded font-medium text-texto underline-offset-2 hover:underline">
                  <Icono nombre="editar" className="h-3.5 w-3.5 text-texto-suave" />
                  <span>{c.nombre}</span>
                  <span className="sr-only">, ver entregas ({cantidadEntregas})</span>
                </button>
              </td>
              <td className="whitespace-nowrap">{etiquetaDe(ciudades, c.ciudad)}</td>
              {items.map((i) => (
                <CeldaEntrega key={i.valor} config={cfg.config} registro={ultimas[i.valor]} hoy={hoy} />
              ))}
              <td className="whitespace-nowrap text-right">
                {alNueva && (
                  <button type="button" className="boton-secundario !min-h-[2rem] !px-3"
                    onClick={(e) => { e.stopPropagation(); alNueva(c.id) }}>
                    <Icono nombre="mas" className="h-3.5 w-3.5" />
                    Nueva entrega
                    <span className="sr-only"> para {c.nombre}</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
