'use client'

import { useMemo, useState } from 'react'
import { resolverEntradaCatalogo } from '@/domain/colaboradores-hoja'
import type { Opcion } from '@/domain/modulos'
import {
  combinacionesSinRegla, normalizarPuesto, type ColaboradorRegla, type CombinacionPendiente, type ReglaDotacion,
} from '@/domain/reglas-dotacion'
import { guardarCatalogo } from '@/infrastructure/firestore/catalogos'
import { eliminarRegla, guardarRegla } from '@/infrastructure/firestore/reglas'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useReglas } from '@/presentation/datos/useReglas'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { EditorRegla, type BorradorRegla } from './EditorRegla'
import { ListaPorDefinir } from './ListaPorDefinir'
import { ListaReglas } from './ListaReglas'
import { ReiniciarDotacion } from './ReiniciarDotacion'

const etiquetaDe = (opciones: Opcion[], valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor
const VACIO: BorradorRegla = { id: null, linea_negocio: '', puesto_etiqueta: '', ciudad: null, prendas: [], tipos_epp: [] }

export function ReglasDotacion() {
  const { uid } = useSesion()
  const { reglas, cargando, error } = useReglas()
  const personas = useColeccion('colaboradores')
  const lineas = useCatalogo('lineas_negocio')
  const ciudades = useCatalogo('ciudades')
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const [editor, setEditor] = useState<BorradorRegla | null>(null)

  const colaboradores = personas.registros as unknown as ColaboradorRegla[]

  const { pendientes, sinDatos } = useMemo(() => combinacionesSinRegla(colaboradores, reglas), [colaboradores, reglas])

  const definir = (p: CombinacionPendiente) => setEditor({ ...VACIO, linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta })
  function definirVarias(ps: CombinacionPendiente[]) {
    const unicos = new Map(ps.map((p) => [`${p.linea_negocio}|${p.puesto}`, { linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta }]))
    setEditor({ ...VACIO, lote: Array.from(unicos.values()) })
  }

  async function agregarEntrada(catalogo: 'prendas' | 'tipos_epp', texto: string): Promise<string | null> {
    const items = catalogo === 'prendas' ? prendas : tiposEpp
    const entrada = resolverEntradaCatalogo(items, texto)
    if (!entrada) return null
    if (entrada.nueva) await guardarCatalogo(catalogo, [...items, { valor: entrada.valor, etiqueta: entrada.etiqueta }], uid ?? '')
    return entrada.valor
  }

  async function guardar(b: BorradorRegla) {
    const nombres = b.id === null && !b.lote && b.puestos ? b.puestos : [b.puesto_etiqueta]
    const unicos = new Map(nombres.map((p) => [normalizarPuesto(p), p]))
    unicos.delete('')
    const destinos = b.lote ?? Array.from(unicos.values(), (p) => ({ linea_negocio: b.linea_negocio, puesto_etiqueta: p }))
    for (const d of destinos) {
      await guardarRegla({ ...d, ciudad: b.lote ? null : b.ciudad, prendas: b.prendas, tipos_epp: b.tipos_epp }, uid ?? '')
    }
    setEditor(null)
  }

  const editar = (r: ReglaDotacion) => setEditor({
    id: r.id, linea_negocio: r.linea_negocio, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad,
    prendas: r.prendas, tipos_epp: r.tipos_epp,
  })

  if (cargando || personas.cargando) return <Cargando />
  const fallo = error ?? personas.error

  return (
    <div className="space-y-6">
      {fallo && <AvisoError>{fallo}</AvisoError>}
      {sinDatos > 0 && (
        <p className="text-sm text-texto-suave">
          {sinDatos} colaboradores activos no tienen puesto o empresa en la hoja; no se les puede asignar regla.
        </p>
      )}
      {editor ? (
        <EditorRegla key={`${editor.id ?? 'nueva'}|${editor.linea_negocio}|${editor.puesto_etiqueta}|${editor.lote?.length ?? 0}`}
          inicial={editor} reglas={reglas} colaboradores={colaboradores} lineas={lineas} ciudades={ciudades}
          prendas={prendas} tiposEpp={tiposEpp} etiquetaDe={etiquetaDe} alGuardar={guardar}
          alCancelar={() => setEditor(null)} alAgregar={agregarEntrada} />
      ) : (
        <button type="button" className="boton-primario" onClick={() => setEditor(VACIO)}>Nueva regla</button>
      )}
      <ListaPorDefinir pendientes={pendientes} lineas={lineas} ciudades={ciudades} etiquetaDe={etiquetaDe}
        alDefinir={definir} alDefinirVarias={definirVarias} />
      <ListaReglas reglas={reglas} lineas={lineas} ciudades={ciudades} prendas={prendas} tiposEpp={tiposEpp}
        etiquetaDe={etiquetaDe} alEditar={editar} alEliminar={eliminarRegla} />
      <details>
        <summary className="cursor-pointer text-base">Reiniciar dotación</summary>
        <div className="mt-3"><ReiniciarDotacion /></div>
      </details>
    </div>
  )
}
