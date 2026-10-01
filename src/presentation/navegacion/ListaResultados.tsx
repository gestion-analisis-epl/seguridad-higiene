import type { ReactNode } from 'react'
import { segmentosResaltados, type ColaboradorBusqueda, type ResultadosBusqueda, type SeccionBusqueda } from './busqueda'

export type OpcionBusqueda =
  | { tipo: 'seccion'; seccion: SeccionBusqueda }
  | { tipo: 'colaborador'; colaborador: ColaboradorBusqueda }

export const opcionesDe = (r: ResultadosBusqueda): OpcionBusqueda[] => [
  ...r.secciones.map((seccion): OpcionBusqueda => ({ tipo: 'seccion', seccion })),
  ...r.colaboradores.map((colaborador): OpcionBusqueda => ({ tipo: 'colaborador', colaborador })),
]

function Resaltado({ texto, consulta }: { texto: string; consulta: string }) {
  return (
    <>
      {segmentosResaltados(texto, consulta).map((s, i) => s.resaltado
        ? <mark key={i} className="bg-transparent font-semibold text-texto underline decoration-acento decoration-2 underline-offset-2">{s.texto}</mark>
        : <span key={i}>{s.texto}</span>)}
    </>
  )
}

function Opcion({ id, activa, alElegir, alApuntar, children }: {
  id: string; activa: boolean; alElegir: () => void; alApuntar: () => void; children: ReactNode
}) {
  return (
    <div id={id} role="option" aria-selected={activa} onClick={alElegir} onMouseMove={alApuntar}
      className={`flex min-h-[2.5rem] cursor-pointer items-center justify-between gap-3 px-3 py-1.5 ${activa ? 'bg-superficie-2' : ''}`}>
      {children}
    </div>
  )
}

function Grupo({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} className="px-3 pb-1 pt-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-texto-suave">{titulo}</div>
      {children}
    </div>
  )
}

export function ListaResultados({ id, idOpcion, resultados, consulta, activo, alElegir, alApuntar }: {
  id: string
  idOpcion: (i: number) => string
  resultados: ResultadosBusqueda
  consulta: string
  activo: number
  alElegir: (o: OpcionBusqueda) => void
  alApuntar: (i: number) => void
}) {
  const nSecciones = resultados.secciones.length
  return (
    <div id={id} role="listbox" aria-label="Resultados de búsqueda" onMouseDown={(e) => e.preventDefault()}
      className="min-h-0 flex-1 overflow-y-auto py-1">
      {nSecciones > 0 && (
        <Grupo id={`${id}-secciones`} titulo="Secciones">
          {resultados.secciones.map((s, i) => (
            <Opcion key={s.href} id={idOpcion(i)} activa={i === activo}
              alElegir={() => alElegir({ tipo: 'seccion', seccion: s })} alApuntar={() => alApuntar(i)}>
              <span className="min-w-0 truncate"><Resaltado texto={s.titulo} consulta={consulta} /></span>
              <span className="shrink-0 text-xs text-texto-suave">{s.grupo}</span>
            </Opcion>
          ))}
        </Grupo>
      )}
      {resultados.colaboradores.length > 0 && (
        <Grupo id={`${id}-colaboradores`} titulo="Colaboradores">
          {resultados.colaboradores.map((c, j) => (
            <Opcion key={c.id} id={idOpcion(nSecciones + j)} activa={nSecciones + j === activo}
              alElegir={() => alElegir({ tipo: 'colaborador', colaborador: c })} alApuntar={() => alApuntar(nSecciones + j)}>
              <span className="min-w-0">
                <span className="block truncate"><Resaltado texto={c.nombre} consulta={consulta} /></span>
                {c.ciudad !== '' && <span className="block truncate text-xs text-texto-suave">{c.ciudad}</span>}
              </span>
              {!c.activo && (
                <span className="shrink-0 rounded border border-borde-fuerte px-1.5 text-[0.6875rem] text-texto-suave">Inactivo</span>
              )}
            </Opcion>
          ))}
        </Grupo>
      )}
    </div>
  )
}
