import type { Opcion } from '@/domain/modulos'

export interface ValoresFiltro { ciudad: string; area: string; cuadrilla: string }

function Selector({ id, rotulo, valor, opciones, alCambiar }: {
  id: string; rotulo: string; valor: string; opciones: Opcion[]; alCambiar: (v: string) => void
}) {
  return (
    <div className="min-w-0 flex-1 sm:min-w-[11rem]">
      <label htmlFor={id} className="etiqueta">{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} className="control">
        <option value="">Todas</option>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    </div>
  )
}

const comoOpciones = (lista: string[]): Opcion[] => lista.map((v) => ({ valor: v, etiqueta: v }))

export function FiltrosPendientes({ valores, ciudades, areas, cuadrillas, alCambiar }: {
  valores: ValoresFiltro
  ciudades: Opcion[]
  areas: string[]
  cuadrillas: string[]
  alCambiar: (campo: keyof ValoresFiltro, valor: string) => void
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Selector id="f-ciudad" rotulo="Ciudad" valor={valores.ciudad} opciones={ciudades}
        alCambiar={(v) => alCambiar('ciudad', v)} />
      <Selector id="f-area" rotulo="Área" valor={valores.area} opciones={comoOpciones(areas)}
        alCambiar={(v) => alCambiar('area', v)} />
      <Selector id="f-cuadrilla" rotulo="Cuadrilla" valor={valores.cuadrilla} opciones={comoOpciones(cuadrillas)}
        alCambiar={(v) => alCambiar('cuadrilla', v)} />
    </div>
  )
}
