'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { aTitulo } from '@/domain/texto'
import {
  colaboradoresAbarcados, idRegla, normalizarPuesto, puestosDeEmpresa, type ColaboradorRegla, type ReglaDotacion,
} from '@/domain/reglas-dotacion'
import { EppPorRegion } from './EppPorRegion'
import { AvisoError } from '@/presentation/ui/Estado'
import { MultiSelect } from '@/presentation/ui/MultiSelect'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

export interface BorradorRegla {
  id: string | null
  linea_negocio: string
  puesto_etiqueta: string
  ciudad: string | null
  prendas: string[]
  tipos_epp: string[]
  // Varios puestos de la misma empresa en una regla nueva; se guarda una regla por puesto
  puestos?: string[]
  // Varias combinaciones empresa x puesto a la vez; siempre para todas las plazas
  lote?: { linea_negocio: string; puesto_etiqueta: string }[]
}

interface CasillasProps {
  titulo: string
  opciones: Opcion[]
  marcadas: string[]
  alCambiar: (valores: string[]) => void
  alAgregar: (texto: string) => Promise<string | null>
}

function Casillas({ titulo, opciones, marcadas, alCambiar, alAgregar }: CasillasProps) {
  const [nuevo, setNuevo] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)

  async function agregar() {
    setFallo(null)
    try {
      const valor = await alAgregar(nuevo)
      if (valor) {
        if (!marcadas.includes(valor)) alCambiar([...marcadas, valor])
        setNuevo('')
      }
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo agregar al catálogo')
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="etiqueta">{titulo}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {opciones.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="casilla" checked={marcadas.includes(o.valor)}
              onChange={(e) => alCambiar(e.target.checked ? [...marcadas, o.valor] : marcadas.filter((v) => v !== o.valor))} />
            {o.etiqueta}
          </label>
        ))}
        {opciones.length === 0 && <p className="text-sm text-texto-suave">El catálogo está vacío; agrega la primera entrada abajo.</p>}
      </div>
      <div className="flex gap-2">
        <input aria-label={`Nueva entrada de ${titulo}`} className="control" value={nuevo}
          onChange={(e) => setNuevo(e.target.value)} placeholder="Agregar al catálogo" />
        <button type="button" className="boton-secundario" disabled={!nuevo.trim()} onClick={() => void agregar()}>Agregar</button>
      </div>
      {fallo && <AvisoError>{fallo}</AvisoError>}
    </fieldset>
  )
}

interface Props {
  inicial: BorradorRegla
  reglas: ReglaDotacion[]
  colaboradores: ColaboradorRegla[]
  lineas: Opcion[]
  ciudades: Opcion[]
  prendas: Opcion[]
  tiposEpp: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alGuardar: (borrador: BorradorRegla) => Promise<void>
  alCancelar: () => void
  alAgregar: (catalogo: 'prendas' | 'tipos_epp', texto: string) => Promise<string | null>
}

export function EditorRegla({
  inicial, reglas, colaboradores, lineas, ciudades, prendas, tiposEpp, etiquetaDe, alGuardar, alCancelar, alAgregar,
}: Props) {
  const [b, setB] = useState<BorradorRegla>(() => ({ ...inicial, puestos: inicial.puestos ?? (inicial.puesto_etiqueta ? [inicial.puesto_etiqueta] : []) }))
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editando = inicial.id !== null
  const lote = b.lote !== undefined
  // Solo empresas con colaboradores activos; el catálogo conserva las de bajas y entradas viejas
  const empresas = useMemo(() => {
    const enUso = new Set(colaboradores.filter((c) => c.activo !== false).map((c) => c.linea_negocio))
    return lineas.filter((l) => enUso.has(l.valor))
  }, [lineas, colaboradores])
  const [extras, setExtras] = useState<string[]>(() => (inicial.puesto_etiqueta ? [inicial.puesto_etiqueta] : []))
  const [nuevoPuesto, setNuevoPuesto] = useState('')
  const elegidos = useMemo(() => (editando ? [b.puesto_etiqueta] : b.puestos ?? []), [editando, b.puesto_etiqueta, b.puestos])
  const opcionesPuesto = useMemo(() => {
    const deEmpresa = puestosDeEmpresa(colaboradores, b.linea_negocio)
    const claves = new Set(deEmpresa.map(normalizarPuesto))
    return [...deEmpresa, ...extras.filter((p) => !claves.has(normalizarPuesto(p)))].map((p) => ({ valor: p, etiqueta: p }))
  }, [colaboradores, b.linea_negocio, extras])
  const completa = lote || (b.linea_negocio !== '' && elegidos.some((p) => normalizarPuesto(p) !== ''))

  function agregarPuesto() {
    const texto = aTitulo(nuevoPuesto.trim())
    if (!normalizarPuesto(texto)) return
    const existente = opcionesPuesto.find((o) => normalizarPuesto(o.valor) === normalizarPuesto(texto))?.valor
    if (!existente) setExtras([...extras, texto])
    const valor = existente ?? texto
    if (!elegidos.includes(valor)) setB({ ...b, puestos: [...elegidos, valor] })
    setNuevoPuesto('')
  }

  const abarcados = useMemo(() => {
    if (lote || !completa) return null
    return elegidos.filter((p) => normalizarPuesto(p) !== '').reduce((total, p) => total + colaboradoresAbarcados({
      id: idRegla(b.linea_negocio, p, b.ciudad), linea_negocio: b.linea_negocio,
      puesto: normalizarPuesto(p), puesto_etiqueta: p, ciudad: b.ciudad, prendas: b.prendas, tipos_epp: b.tipos_epp,
    }, reglas, colaboradores), 0)
  }, [b, elegidos, lote, completa, reglas, colaboradores])

  async function guardar() {
    setOcupado(true)
    setError(null)
    try { await alGuardar(b) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setOcupado(false) }
  }

  const descripcion = (r: ReglaDotacion) =>
    `${etiquetaDe(lineas, r.linea_negocio)} · ${r.puesto_etiqueta} · ${r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las plazas'}`

  return (
    <section className="tarjeta space-y-4 p-4" aria-label="Editor de regla">
      <h2 className="text-base">{editando ? 'Editar regla' : lote ? `Definir ${b.lote!.length} combinaciones` : 'Nueva regla'}</h2>
      {lote ? (
        <p className="text-sm text-texto-suave">
          Se guardará una regla por cada empresa y puesto seleccionados, para todas las plazas: {b.lote!.map((d) => `${etiquetaDe(lineas, d.linea_negocio)} · ${d.puesto_etiqueta}`).join('; ')}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label id="regla-empresa-et" htmlFor="regla-empresa" className="etiqueta">Empresa</label>
            {editando ? <p className="text-sm">{etiquetaDe(lineas, b.linea_negocio)}</p> : (
              <SelectBuscable id="regla-empresa" etiqueta="Empresa" etiquetaId="regla-empresa-et" opciones={empresas}
                valor={b.linea_negocio} textoVacio="Selecciona" alCambiar={(v) => { setExtras([]); setB({ ...b, linea_negocio: v, puesto_etiqueta: '', puestos: [] }) }} />
            )}
          </div>
          <div>
            {editando ? (
              <>
                <span className="etiqueta">Puesto</span>
                <p className="text-sm">{b.puesto_etiqueta}</p>
              </>
            ) : (
              <>
                {b.linea_negocio ? (
                  <MultiSelect etiqueta="Puestos" opciones={opcionesPuesto} seleccion={elegidos}
                    alCambiar={(sel) => setB({ ...b, puestos: sel })} textoTodos="Todos" textoNinguno="Selecciona" />
                ) : (
                  <>
                    <span className="etiqueta">Puestos</span>
                    <p className="control text-texto-suave">Primero elige la empresa</p>
                  </>
                )}
                {b.linea_negocio && (
                  <div className="mt-2 flex gap-2">
                    <input aria-label="Escribir otro puesto" className="control" value={nuevoPuesto} placeholder="Escribir otro puesto"
                      onChange={(e) => setNuevoPuesto(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarPuesto() } }} />
                    <button type="button" className="boton-secundario" disabled={!nuevoPuesto.trim()} onClick={agregarPuesto}>Agregar</button>
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label htmlFor="regla-ciudad" className="etiqueta">Ciudad</label>
            {editando ? <p className="text-sm">{b.ciudad ? etiquetaDe(ciudades, b.ciudad) : 'Todas las plazas'}</p> : (
              <select id="regla-ciudad" className="control" value={b.ciudad ?? ''}
                onChange={(e) => setB({ ...b, ciudad: e.target.value || null })}>
                <option value="">Todas las plazas</option>
                {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
              </select>
            )}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="regla-copiar" className="etiqueta">Copiar artículos de otra regla</label>
        <select id="regla-copiar" className="control" value=""
          onChange={(e) => {
            const r = reglas.find((x) => x.id === e.target.value)
            if (r) setB({ ...b, prendas: r.prendas, tipos_epp: r.tipos_epp })
          }}>
          <option value="">Copiar de…</option>
          {reglas.map((r) => <option key={r.id} value={r.id}>{descripcion(r)}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Casillas titulo="Uniforme obligatorio" opciones={prendas} marcadas={b.prendas}
          alCambiar={(prendasNuevas) => setB({ ...b, prendas: prendasNuevas })} alAgregar={(t) => alAgregar('prendas', t)} />
        <EppPorRegion tiposEpp={tiposEpp} marcadas={b.tipos_epp} alCambiar={(eppNuevo) => setB({ ...b, tipos_epp: eppNuevo })} />
      </div>
      {abarcados !== null && (
        <p role="status" className="text-sm text-texto-suave">Esta regla aplicaría a {abarcados} colaboradores activos.</p>
      )}
      {error && <AvisoError>{error}</AvisoError>}
      <div className="flex gap-2">
        <button type="button" className="boton-primario" disabled={!completa || ocupado} onClick={() => void guardar()}>
          {ocupado ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="boton-secundario" disabled={ocupado} onClick={alCancelar}>Cancelar</button>
      </div>
    </section>
  )
}
