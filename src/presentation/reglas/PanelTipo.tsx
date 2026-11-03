'use client'

import type { Opcion } from '@/domain/modulos'
import type { ColaboradorRegla, CombinacionPendiente, Diagnostico, ReglaDotacion, TipoRegla } from '@/domain/reglas-dotacion'
import { EditorRegla, type BorradorRegla } from './EditorRegla'
import { ESTILO_TIPO } from './diagnostico-vista'
import { ImportarReglasEpp } from './ImportarReglasEpp'
import { ListaPorDefinir } from './ListaPorDefinir'
import { ListaReglas } from './ListaReglas'

const DESCRIPCION: Record<TipoRegla, string> = {
  uniforme: 'Prendas que cada puesto debe tener entregadas. Las excepciones por ciudad o área parten de la regla base del puesto.',
  epp: 'Equipo de protección personal por puesto. Las excepciones por ciudad o área parten de la regla base del puesto.',
}

interface Props {
  tipo: TipoRegla
  reglas: ReglaDotacion[]
  diagnosticos: Map<string, Diagnostico>
  pendientes: CombinacionPendiente[]
  colaboradores: ColaboradorRegla[]
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  catalogo: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  articulo: (valor: string) => string
  editor: BorradorRegla | null
  alNueva: (parcial?: Partial<BorradorRegla>) => void
  alDefinir: (p: CombinacionPendiente) => void
  alDefinirVarias: (ps: CombinacionPendiente[]) => void
  alEditar: (r: ReglaDotacion) => void
  alEliminar: (id: string) => Promise<void>
  alEliminarVarias: (ids: string[]) => Promise<void>
  alGuardar: (b: BorradorRegla) => Promise<void>
  alCancelar: () => void
  alAgregar: (texto: string) => Promise<string | null>
}

export function PanelTipo(p: Props) {
  const estilo = ESTILO_TIPO[p.tipo]
  const e = p.editor
  return (
    <div className="space-y-6">
      <p className="text-sm text-texto-suave">{DESCRIPCION[p.tipo]}</p>
      {e ? (
        <EditorRegla key={`${p.tipo}|${e.id ?? 'nueva'}|${e.linea_negocio}|${e.puesto_etiqueta}|${e.lote?.length ?? 0}`}
          tipo={p.tipo} inicial={e} reglas={p.reglas} diagnosticos={p.diagnosticos} colaboradores={p.colaboradores}
          lineas={p.lineas} ciudades={p.ciudades} areas={p.areas} catalogo={p.catalogo} etiquetaDe={p.etiquetaDe}
          articulo={p.articulo} alGuardar={p.alGuardar} alCancelar={p.alCancelar} alAgregar={p.alAgregar} />
      ) : (
        <button type="button" className="boton-primario" onClick={() => p.alNueva()}>Nueva regla de {estilo.singular}</button>
      )}
      <ListaPorDefinir pendientes={p.pendientes} lineas={p.lineas} ciudades={p.ciudades} etiquetaDe={p.etiquetaDe}
        rotulo={estilo.singular} alDefinir={p.alDefinir} alDefinirVarias={p.alDefinirVarias} />
      <ListaReglas tipo={p.tipo} reglas={p.reglas} diagnosticos={p.diagnosticos} lineas={p.lineas} ciudades={p.ciudades}
        areas={p.areas} etiquetaDe={p.etiquetaDe} articulo={p.articulo} alEditar={p.alEditar}
        alNueva={(puesto) => p.alNueva(puesto)} alEliminar={p.alEliminar} alEliminarVarias={p.alEliminarVarias} />
      {p.tipo === 'epp' && (
        <details>
          <summary className="cursor-pointer text-base">Importar EPP desde Excel</summary>
          <div className="mt-3">
            <ImportarReglasEpp reglas={p.reglas} lineas={p.lineas} ciudades={p.ciudades} areas={p.areas}
              tiposEpp={p.catalogo} etiquetaDe={p.etiquetaDe} />
          </div>
        </details>
      )}
    </div>
  )
}
