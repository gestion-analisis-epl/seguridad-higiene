'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { aTitulo } from '@/domain/texto'
import {
  aDelta, colaboradoresAlcanzados, diagnosticar, idRegla, normalizarPuesto, padreEfectivo, puestosDeEmpresa, reglasPrevias,
  type ColaboradorRegla, type Diagnostico, type ReglaDotacion, type TipoRegla,
} from '@/domain/reglas-dotacion'
import { EppPorRegion } from './EppPorRegion'
import { AvisoError } from '@/presentation/ui/Estado'
import { MultiSelect } from '@/presentation/ui/MultiSelect'
import { CambiosArticulos, ESTILO_TIPO, etiquetaAlcance, FichasArticulos, InsigniaHallazgo, textoHallazgo } from './diagnostico-vista'

export interface BorradorRegla {
  id: string | null
  linea_negocio: string
  puesto_etiqueta: string
  ciudad: string | null
  area: string | null
  // null: sin tocar, recibe lo heredado; con lista: lo que recibirán en total
  articulos: string[] | null
  // Varias empresas en una regla nueva; se guarda una regla por empresa y puesto
  lineas?: string[]
  // Varios puestos en una regla nueva; se guarda una regla por empresa que los tenga
  puestos?: string[]
  // Lo que se guardará, calculado por el editor
  destinos?: { linea_negocio: string; puesto_etiqueta: string }[]
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
  tipo: TipoRegla
  inicial: BorradorRegla
  reglas: ReglaDotacion[]
  diagnosticos: Map<string, Diagnostico>
  colaboradores: ColaboradorRegla[]
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  catalogo: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  articulo: (valor: string) => string
  alGuardar: (borrador: BorradorRegla) => Promise<void>
  alCancelar: () => void
  alAgregar: (texto: string) => Promise<string | null>
}

const firma = (l: string[]) => [...l].sort().join('|')

const alcanceDe = (d: { linea_negocio: string; puesto_etiqueta: string; ciudad: string | null; area: string | null }) =>
  ({ linea_negocio: d.linea_negocio, puesto: normalizarPuesto(d.puesto_etiqueta), ciudad: d.ciudad, area: d.area })

export function EditorRegla({
  tipo, inicial, reglas, diagnosticos, colaboradores, lineas, ciudades, areas, catalogo, etiquetaDe, articulo, alGuardar, alCancelar, alAgregar,
}: Props) {
  const estilo = ESTILO_TIPO[tipo]
  const titulo = useRef<HTMLHeadingElement>(null)
  const [b, setB] = useState<BorradorRegla>(() => ({
    ...inicial, lineas: inicial.lineas ?? (inicial.linea_negocio ? [inicial.linea_negocio] : []),
    puestos: inicial.puestos ?? (inicial.puesto_etiqueta ? [inicial.puesto_etiqueta] : []),
  }))
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
  const seleccionadas = useMemo(() => b.lineas ?? [], [b.lineas])
  const puestosPorEmpresa = useMemo(() => new Map(seleccionadas.map((l) => [l, new Set(puestosDeEmpresa(colaboradores, l).map(normalizarPuesto))])), [seleccionadas, colaboradores])
  const opcionesPuesto = useMemo(() => {
    const porClave = new Map<string, string>()
    for (const l of seleccionadas) for (const p of puestosDeEmpresa(colaboradores, l)) if (!porClave.has(normalizarPuesto(p))) porClave.set(normalizarPuesto(p), p)
    for (const p of extras) if (!porClave.has(normalizarPuesto(p))) porClave.set(normalizarPuesto(p), p)
    return Array.from(porClave.values()).sort((a, c) => a.localeCompare(c, 'es')).map((p) => ({ valor: p, etiqueta: p }))
  }, [colaboradores, seleccionadas, extras])
  const completa = lote || (editando ? b.linea_negocio !== '' : seleccionadas.length > 0) && elegidos.some((p) => normalizarPuesto(p) !== '')

  function agregarPuesto() {
    const texto = aTitulo(nuevoPuesto.trim())
    if (!normalizarPuesto(texto)) return
    const existente = opcionesPuesto.find((o) => normalizarPuesto(o.valor) === normalizarPuesto(texto))?.valor
    if (!existente) setExtras([...extras, texto])
    const valor = existente ?? texto
    if (!elegidos.includes(valor)) setB({ ...b, puestos: [...elegidos, valor] })
    setNuevoPuesto('')
  }

  // Cada destino es una regla que se guardará: empresa y puesto, con la ciudad y el área del borrador
  const destinos = useMemo(() => {
    if (b.lote) return b.lote.map((d) => ({ ...d, ciudad: null, area: null }))
    if (!completa) return []
    const puestos = elegidos.filter((p) => normalizarPuesto(p) !== '')
    if (editando) return puestos.map((p) => ({ linea_negocio: b.linea_negocio, puesto_etiqueta: p, ciudad: b.ciudad, area: b.area }))
    const escritos = new Set(extras.map(normalizarPuesto))
    return seleccionadas.flatMap((l) => puestos
      .filter((p) => escritos.has(normalizarPuesto(p)) || puestosPorEmpresa.get(l)?.has(normalizarPuesto(p)))
      .map((p) => ({ linea_negocio: l, puesto_etiqueta: p, ciudad: b.ciudad, area: b.area })))
  }, [b.lote, b.linea_negocio, b.ciudad, b.area, completa, elegidos, editando, extras, seleccionadas, puestosPorEmpresa])

  const padres = useMemo(() => destinos.map((d) => padreEfectivo(reglas, alcanceDe(d))), [destinos, reglas])
  const heredados = padres[0] ?? []
  const padresDistintos = padres.some((p) => firma(p) !== firma(heredados))
  const deseados = b.articulos ?? heredados
  const cambio = aDelta(heredados, deseados)

  // Lo que quedaría guardado, para avisar antes de guardar
  const candidatas = useMemo<ReglaDotacion[]>(() => destinos.map((d, i) => ({
    id: idRegla(d.linea_negocio, d.puesto_etiqueta, d.ciudad, d.area), linea_negocio: d.linea_negocio,
    puesto: normalizarPuesto(d.puesto_etiqueta), puesto_etiqueta: aTitulo(d.puesto_etiqueta), ciudad: d.ciudad, area: d.area,
    ...aDelta(padres[i], deseados),
  })), [destinos, padres, deseados])
  const avisos = useMemo(() => {
    if (candidatas.length === 0) return []
    const ids = new Set(candidatas.map((c) => c.id))
    const todas = diagnosticar([...reglas.filter((r) => !ids.has(r.id)), ...candidatas], colaboradores)
    return candidatas.flatMap((c) => (todas.get(c.id)?.hallazgos ?? []).map((h) => ({ regla: c, h })))
  }, [candidatas, reglas, colaboradores])
  const alcanzados = useMemo(
    () => destinos.reduce((total, d) => total + colaboradoresAlcanzados(alcanceDe(d), colaboradores), 0),
    [destinos, colaboradores],
  )

  const contexto = useMemo(() => ({
    articulo, alcance: (r: ReglaDotacion) => etiquetaAlcance(r, ciudades, areas, etiquetaDe),
    regla: (id: string) => candidatas.find((c) => c.id === id) ?? reglas.find((r) => r.id === id),
  }), [articulo, ciudades, areas, etiquetaDe, candidatas, reglas])

  const heredaDe = useMemo(() => {
    const d = destinos[0]
    if (!d) return []
    return reglasPrevias(reglas, alcanceDe(d))
  }, [destinos, reglas])

  // El editor se monta al pulsar Editar o Definir; se lleva a la vista y el foco avisa que se abrió
  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    titulo.current?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
    titulo.current?.focus({ preventScroll: true })
  }, [])

  async function guardar() {
    setOcupado(true)
    setError(null)
    try { await alGuardar({ ...b, articulos: deseados, destinos: destinos.map(({ linea_negocio, puesto_etiqueta }) => ({ linea_negocio, puesto_etiqueta })) }) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setOcupado(false) }
  }

  const copiables = useMemo(() => reglas.map((r) => ({ r, texto: `${r.puesto_etiqueta} · ${etiquetaDe(lineas, r.linea_negocio)} · ${etiquetaAlcance(r, ciudades, areas, etiquetaDe)}` }))
    .sort((a, c) => a.texto.localeCompare(c.texto, 'es')), [reglas, lineas, ciudades, areas, etiquetaDe])

  const nivelEsBase = !b.ciudad && !b.area

  return (
    <section className={`tarjeta space-y-4 border-l-4 p-4 ${estilo.franja}`} aria-label={`Editor de regla de ${estilo.singular}`}>
      <h2 ref={titulo} tabIndex={-1} className="scroll-mt-4 text-base outline-none">{editando
        ? `Editar regla de ${estilo.singular}: ${etiquetaDe(lineas, b.linea_negocio)} · ${b.puesto_etiqueta}`
        : lote ? `Definir ${b.lote!.length} combinaciones de ${estilo.singular}` : `Nueva regla de ${estilo.singular}`}</h2>

      <div className="space-y-2">
        <h3 className="rotulo">1 · ¿A quién aplica?</h3>
        {lote ? (
          <p className="text-sm text-texto-suave">
            Se guardará una regla base por cada empresa y puesto seleccionados, para todas las plazas: {b.lote!.map((d) => `${etiquetaDe(lineas, d.linea_negocio)} · ${d.puesto_etiqueta}`).join('; ')}.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              {editando ? (
                <>
                  <span className="etiqueta">Empresa</span>
                  <p className="text-sm">{etiquetaDe(lineas, b.linea_negocio)}</p>
                </>
              ) : (
                <MultiSelect etiqueta="Empresas" opciones={empresas.map((l) => ({ valor: l.valor, etiqueta: l.etiqueta }))} seleccion={seleccionadas}
                  alCambiar={(sel) => setB({ ...b, lineas: sel })} textoTodos="Todas" textoNinguno="Selecciona" />
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
                  {seleccionadas.length > 0 ? (
                    <MultiSelect etiqueta="Puestos" opciones={opcionesPuesto} seleccion={elegidos}
                      alCambiar={(sel) => setB({ ...b, puestos: sel })} textoTodos="Todos" textoNinguno="Selecciona" />
                  ) : (
                    <>
                      <span className="etiqueta">Puestos</span>
                      <p className="control text-texto-suave">Primero elige las empresas</p>
                    </>
                  )}
                  {seleccionadas.length > 0 && (
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
            <div>
              <label htmlFor="regla-area" className="etiqueta">Área</label>
              {editando ? <p className="text-sm">{b.area ? etiquetaDe(areas, b.area) : 'Todas las áreas'}</p> : (
                <select id="regla-area" className="control" value={b.area ?? ''}
                  onChange={(e) => setB({ ...b, area: e.target.value || null })}>
                  <option value="">Todas las áreas</option>
                  {areas.map((a) => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
                </select>
              )}
            </div>
          </div>
        )}
        {destinos.length > 0 && (
          <p role="status" className="text-sm text-texto-suave">
            Alcanza a {alcanzados} colaboradores activos.{' '}
            {nivelEsBase
              ? 'Es la regla base del puesto: las excepciones por ciudad o área parten de ella.'
              : heredaDe.length > 0
                ? `Parte de: ${heredaDe.map((r) => etiquetaAlcance(r, ciudades, areas, etiquetaDe)).join(' + ')}.`
                : 'No hay regla base para este puesto: solo recibirá lo que marques aquí.'}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="rotulo">2 · ¿Qué reciben? ({estilo.singular})</h3>
          <div className="min-w-0 sm:w-72">
            <label htmlFor="regla-copiar" className="sr-only">Copiar de otra regla</label>
            <select id="regla-copiar" className="control" value=""
              onChange={(e) => {
                const d = diagnosticos.get(e.target.value)
                if (d) setB({ ...b, articulos: d.efectivos })
              }}>
              <option value="">Copiar lo que recibe otra regla…</option>
              {copiables.map(({ r, texto }) => <option key={r.id} value={r.id}>{texto}</option>)}
            </select>
          </div>
        </div>
        {tipo === 'uniforme' ? (
          <Casillas titulo="Uniforme obligatorio" opciones={catalogo} marcadas={deseados}
            alCambiar={(nuevas) => setB({ ...b, articulos: nuevas })} alAgregar={alAgregar} />
        ) : (
          <EppPorRegion tiposEpp={catalogo} marcadas={deseados} alCambiar={(nuevas) => setB({ ...b, articulos: nuevas })} />
        )}
        {destinos.length > 0 && (
          <div className="space-y-2 rounded border border-borde bg-superficie-2 p-3 text-sm">
            {nivelEsBase ? (
              <p><span className="font-medium">Resultado:</span> <FichasArticulos articulos={deseados} articulo={articulo} vacio="Sin artículos obligatorios" /></p>
            ) : (
              <>
                <p className="flex flex-wrap items-center gap-2"><span className="font-medium">Hereda ({heredados.length}):</span> <FichasArticulos articulos={heredados} articulo={articulo} vacio="Nada" /></p>
                <p className="flex flex-wrap items-center gap-2"><span className="font-medium">Cambios de esta regla:</span> <CambiosArticulos agrega={cambio.agrega} quita={cambio.quita} articulo={articulo} /></p>
              </>
            )}
            {padresDistintos && <p className="text-xs text-texto-suave">Los puestos elegidos heredan listas distintas; se guarda el cambio de cada uno para que reciban esta lista.</p>}
          </div>
        )}
      </div>

      {avisos.length > 0 && (
        <div className="space-y-1">
          <h3 className="rotulo">3 · Revisión antes de guardar</h3>
          <ul className="space-y-1 text-sm">
            {avisos.slice(0, 8).map(({ regla, h }, i) => (
              <li key={`${regla.id}${h.codigo}${i}`} className="flex flex-wrap items-center gap-2">
                <InsigniaHallazgo codigo={h.codigo} gravedad={h.gravedad} />
                <span className="text-texto-suave">{candidatas.length > 1 ? `${regla.puesto_etiqueta}: ` : ''}{textoHallazgo(h, contexto)}</span>
              </li>
            ))}
            {avisos.length > 8 && <li className="text-xs text-texto-suave">Y {avisos.length - 8} avisos más.</li>}
          </ul>
        </div>
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
