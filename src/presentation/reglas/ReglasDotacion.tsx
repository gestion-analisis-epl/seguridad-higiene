'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { resolverEntradaCatalogo } from '@/domain/colaboradores-hoja'
import type { Opcion } from '@/domain/modulos'
import {
  aDelta, combinacionesSinRegla, diagnosticar, normalizarPuesto, padreEfectivo, redundantesEliminables,
  type ColaboradorRegla, type CombinacionPendiente, type ReglaDotacion, type TipoRegla,
} from '@/domain/reglas-dotacion'
import { guardarCatalogo } from '@/infrastructure/firestore/catalogos'
import { eliminarRegla, guardarRegla } from '@/infrastructure/firestore/reglas'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useDotacion, useReglasAnteriores } from '@/presentation/datos/useDotacion'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { ESTILO_TIPO, etiquetaAlcance, problemasDe, type ContextoTexto } from './diagnostico-vista'
import type { BorradorRegla } from './EditorRegla'
import { MigrarReglas } from './MigrarReglas'
import { PanelTipo } from './PanelTipo'
import { ReiniciarDotacion } from './ReiniciarDotacion'
import { Revision, type ItemRevision } from './Revision'

type Pestana = TipoRegla | 'revision'
const PESTANAS: Pestana[] = ['uniforme', 'epp', 'revision']
const TIPOS: TipoRegla[] = ['uniforme', 'epp']

const etiquetaDe = (opciones: Opcion[], valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor
const VACIO: BorradorRegla = { id: null, linea_negocio: '', puesto_etiqueta: '', ciudad: null, area: null, articulos: null }

export function ReglasDotacion() {
  const { uid } = useSesion()
  const { dotacion, cargando, error } = useDotacion()
  const anteriores = useReglasAnteriores()
  const personas = useColeccion('colaboradores')
  const lineas = useCatalogo('lineas_negocio')
  const ciudades = useCatalogo('ciudades')
  const areas = useCatalogo('areas')
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const [pestana, setPestana] = useState<Pestana>('uniforme')
  const [editor, setEditor] = useState<{ tipo: TipoRegla; borrador: BorradorRegla } | null>(null)
  const botones = useRef<Record<string, HTMLButtonElement | null>>({})

  const colaboradores = personas.registros as unknown as ColaboradorRegla[]
  const catalogos: Record<TipoRegla, Opcion[]> = { uniforme: prendas, epp: tiposEpp }

  const diagnosticos = useMemo(() => ({
    uniforme: diagnosticar(dotacion.uniforme, colaboradores), epp: diagnosticar(dotacion.epp, colaboradores),
  }), [dotacion, colaboradores])
  const pendientes = useMemo(() => ({
    uniforme: combinacionesSinRegla(colaboradores, dotacion.uniforme), epp: combinacionesSinRegla(colaboradores, dotacion.epp),
  }), [colaboradores, dotacion])

  const articulo = (tipo: TipoRegla) => (valor: string) => etiquetaDe(catalogos[tipo], valor)
  const contexto = (tipo: TipoRegla): ContextoTexto => ({
    articulo: articulo(tipo), alcance: (r) => etiquetaAlcance(r, ciudades, areas, etiquetaDe),
    regla: (id) => dotacion[tipo].find((r) => r.id === id),
  })

  const items = useMemo<ItemRevision[]>(() => TIPOS.flatMap((tipo) =>
    Array.from(diagnosticos[tipo].values()).flatMap((diagnostico) =>
      problemasDe(diagnostico).map((hallazgo) => ({ tipo, diagnostico, hallazgo })))), [diagnosticos])

  const redundantes = useMemo(() => ({
    uniforme: redundantesEliminables(diagnosticos.uniforme), epp: redundantesEliminables(diagnosticos.epp),
  }), [diagnosticos])
  const eliminarVarias = async (tipo: TipoRegla, ids: string[]) => { await Promise.all(ids.map((id) => eliminarRegla(tipo, id))) }

  const abrir = (tipo: TipoRegla, borrador: BorradorRegla) => { setPestana(tipo); setEditor({ tipo, borrador }) }
  const nueva = (tipo: TipoRegla, parcial: Partial<BorradorRegla> = {}) => abrir(tipo, { ...VACIO, ...parcial })
  const definir = (tipo: TipoRegla, p: CombinacionPendiente) => nueva(tipo, { linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta })
  function definirVarias(tipo: TipoRegla, ps: CombinacionPendiente[]) {
    const unicos = new Map(ps.map((p) => [`${p.linea_negocio}|${p.puesto}`, { linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta }]))
    nueva(tipo, { lote: Array.from(unicos.values()) })
  }
  const editar = (tipo: TipoRegla, r: ReglaDotacion) => abrir(tipo, {
    id: r.id, linea_negocio: r.linea_negocio, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area,
    articulos: diagnosticos[tipo].get(r.id)?.efectivos ?? r.agrega,
  })

  async function agregarEntrada(tipo: TipoRegla, texto: string): Promise<string | null> {
    const catalogo = tipo === 'uniforme' ? 'prendas' : 'tipos_epp'
    const entrada = resolverEntradaCatalogo(catalogos[tipo], texto)
    if (!entrada) return null
    if (entrada.nueva) await guardarCatalogo(catalogo, [...catalogos[tipo], { valor: entrada.valor, etiqueta: entrada.etiqueta }], uid ?? '')
    return entrada.valor
  }

  // Cada destino guarda solo lo que cambia frente a lo que hereda de las reglas más generales de su puesto
  async function guardar(tipo: TipoRegla, b: BorradorRegla) {
    const destinos = b.destinos ?? b.lote ?? [{ linea_negocio: b.linea_negocio, puesto_etiqueta: b.puesto_etiqueta }]
    const ciudad = b.lote ? null : b.ciudad
    const area = b.lote ? null : b.area
    for (const d of destinos) {
      const padre = padreEfectivo(dotacion[tipo], { linea_negocio: d.linea_negocio, puesto: normalizarPuesto(d.puesto_etiqueta), ciudad, area })
      await guardarRegla(tipo, { ...d, ciudad, area, ...aDelta(padre, b.articulos ?? padre) }, uid ?? '')
    }
    setEditor(null)
  }

  function teclado(e: KeyboardEvent, actual: Pestana) {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (paso === 0) return
    e.preventDefault()
    const siguiente = PESTANAS[(PESTANAS.indexOf(actual) + paso + PESTANAS.length) % PESTANAS.length]
    setPestana(siguiente)
    botones.current[siguiente]?.focus()
  }

  if (cargando || personas.cargando) return <Cargando />
  const fallo = error ?? personas.error
  const sinDatos = pendientes.uniforme.sinDatos
  const errores = items.filter((i) => i.hallazgo.gravedad === 'error').length

  const rotulo = (p: Pestana) => p === 'revision' ? 'Revisión' : ESTILO_TIPO[p].rotulo
  const conteo = (p: Pestana) => p === 'revision' ? items.length : dotacion[p].length

  return (
    <div className="space-y-5">
      {fallo && <AvisoError>{fallo}</AvisoError>}
      <MigrarReglas cantidad={anteriores.cantidad} pendiente={!anteriores.cargando && anteriores.cantidad > 0 && dotacion.uniforme.length + dotacion.epp.length === 0} />
      {sinDatos > 0 && (
        <p className="text-sm text-texto-suave">
          {sinDatos} colaboradores activos no tienen puesto o empresa en la hoja; no se les puede asignar regla.
        </p>
      )}
      <div role="tablist" aria-label="Tipo de regla" className="flex flex-wrap gap-1 border-b border-borde">
        {PESTANAS.map((p) => {
          const activa = pestana === p
          const marca = p === 'revision' ? (errores > 0 ? 'bg-error' : 'bg-estado-por-vencer') : ESTILO_TIPO[p].fondo
          return (
            <button key={p} ref={(el) => { botones.current[p] = el }} type="button" role="tab" id={`pestana-${p}`}
              aria-selected={activa} aria-controls={`panel-${p}`} tabIndex={activa ? 0 : -1}
              onClick={() => setPestana(p)} onKeyDown={(e) => teclado(e, p)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activa ? 'border-primario text-texto' : 'border-transparent text-texto-suave hover:text-texto'}`}>
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${p === 'revision' && items.length === 0 ? 'bg-estado-vigente' : marca}`} />
              {rotulo(p)}
              <span className="insignia-neutra">{conteo(p)}</span>
            </button>
          )
        })}
      </div>

      {TIPOS.map((tipo) => (
        <div key={tipo} role="tabpanel" id={`panel-${tipo}`} aria-labelledby={`pestana-${tipo}`} hidden={pestana !== tipo}>
          <PanelTipo tipo={tipo} reglas={dotacion[tipo]} diagnosticos={diagnosticos[tipo]} pendientes={pendientes[tipo].pendientes}
            colaboradores={colaboradores} lineas={lineas} ciudades={ciudades} areas={areas} catalogo={catalogos[tipo]}
            etiquetaDe={etiquetaDe} articulo={articulo(tipo)} editor={editor?.tipo === tipo ? editor.borrador : null}
            alNueva={(parcial) => nueva(tipo, parcial)} alDefinir={(p) => definir(tipo, p)} alDefinirVarias={(ps) => definirVarias(tipo, ps)}
            alEditar={(r) => editar(tipo, r)} alEliminar={(id) => eliminarRegla(tipo, id)}
            alEliminarVarias={(ids) => eliminarVarias(tipo, ids)}
            alGuardar={(b) => guardar(tipo, b)} alCancelar={() => setEditor(null)} alAgregar={(t) => agregarEntrada(tipo, t)} />
        </div>
      ))}
      <div role="tabpanel" id="panel-revision" aria-labelledby="pestana-revision" hidden={pestana !== 'revision'}>
        <Revision items={items} lineas={lineas} ciudades={ciudades} areas={areas} etiquetaDe={etiquetaDe}
          contexto={{ uniforme: contexto('uniforme'), epp: contexto('epp') }} alEditar={editar} alEliminar={eliminarRegla}
          redundantes={{ uniforme: redundantes.uniforme.length, epp: redundantes.epp.length }} alEliminarVarias={eliminarVarias}
          idsRedundantes={(tipo) => redundantes[tipo].map((r) => r.id)} />
      </div>

      <details className="border-t border-borde pt-4">
        <summary className="cursor-pointer text-base text-error">Reiniciar dotación (zona de riesgo)</summary>
        <div className="mt-3"><ReiniciarDotacion /></div>
      </details>
    </div>
  )
}
