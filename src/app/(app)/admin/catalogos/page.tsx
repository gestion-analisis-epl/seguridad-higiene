'use client'

import { useState, type FormEvent } from 'react'
import { CATALOGOS_INICIALES, CATALOGO_CON_REGION, REGIONES_ANATOMICAS } from '@/domain/catalogos-iniciales'
import { aplicarNombresCortos, CATALOGO_EMPRESAS } from '@/domain/empresas-nombre-corto'
import { guardarCatalogo, sembrarValoresIniciales } from '@/infrastructure/firestore/catalogos'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { TablaCatalogo } from '@/presentation/catalogos/TablaCatalogo'
import { errorExtra, useEdicionCatalogo } from '@/presentation/catalogos/useEdicionCatalogo'
import { UnirEntradas } from '@/presentation/catalogos/UnirEntradas'
import { useUsoCatalogo } from '@/presentation/catalogos/useUsoCatalogo'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { AvisoError } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'

const IDS = Object.keys(CATALOGOS_INICIALES)
const OPCIONES_CATALOGO = IDS.map((c) => ({ valor: c, etiqueta: c }))

function Catalogos() {
  const { uid } = useSesion()
  const [id, setId] = useState(IDS[0])
  const [etiqueta, setEtiqueta] = useState('')
  const [region, setRegion] = useState('')
  const [riesgo, setRiesgo] = useState('')
  const [corto, setCorto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const pideRegion = id === CATALOGO_CON_REGION
  const pideCorto = id === CATALOGO_EMPRESAS
  const items = useCatalogo(id, true)
  const { cargando, error: usoError, usoDe } = useUsoCatalogo(id)
  const edicion = useEdicionCatalogo(id, items, uid, usoDe, !cargando && !usoError, pideRegion)
  const { control, error } = edicion
  const filas = items.map((i) => ({ ...i, uso: usoDe(i.valor) }))

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const extra = pideRegion ? { region, riesgo } : pideCorto ? { nombre_corto: corto } : {}
    const falta = pideRegion ? errorExtra(extra) : pideCorto && !corto.trim() ? 'Escribe el nombre corto.' : null
    if (falta) { edicion.fallar(falta); return }
    if (await edicion.agregar(etiqueta, extra)) { setEtiqueta(''); setRegion(''); setRiesgo(''); setCorto('') }
  }

  async function aplicarCortos() {
    if (!uid) return
    setOcupado(true)
    setAviso(null)
    try {
      const r = aplicarNombresCortos(items)
      if (r.aplicados > 0) await guardarCatalogo(id, r.items, uid)
      const faltan = r.sinCoincidencia.length ? ` Sin coincidencia: ${r.sinCoincidencia.join(', ')}.` : ''
      setAviso(`Nombres cortos aplicados: ${r.aplicados}.${faltan}`)
    } catch (e) {
      edicion.fallar(e instanceof Error ? e.message : 'No se pudo guardar el catálogo.')
    } finally { setOcupado(false) }
  }

  async function sembrar() {
    if (!uid) return
    setOcupado(true)
    try { await sembrarValoresIniciales(uid) } finally { setOcupado(false) }
  }

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Administración" titulo="Catálogos"
        detalle="Valores que alimentan las listas de selección de los formularios."
        acciones={(
          <button type="button" onClick={() => void sembrar()} disabled={ocupado} className="boton-secundario">
            {ocupado ? 'Cargando...' : 'Cargar valores iniciales'}
          </button>
        )} />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <div>
            <label id="catalogo-et" htmlFor="catalogo" className="etiqueta">Catálogo</label>
            <SelectBuscable id="catalogo" etiqueta="Catálogo" etiquetaId="catalogo-et" opciones={OPCIONES_CATALOGO}
              valor={id} alCambiar={(nuevo) => { setId(nuevo); setAviso(null); edicion.reiniciar() }} />
          </div>
          {pideCorto && (
            <button type="button" onClick={() => void aplicarCortos()} disabled={ocupado || !uid} className="boton-secundario w-full">
              Aplicar nombres cortos
            </button>
          )}
          <UnirEntradas key={id} catalogo={id} items={items} />
          <form onSubmit={agregar} className="space-y-3">
            <div>
              <label htmlFor="nuevo-item" className="etiqueta">Nuevo valor</label>
              <input id="nuevo-item" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className="control" />
              <p className="mt-1 text-xs text-texto-suave">El valor interno se genera de la etiqueta y no se puede cambiar después.</p>
            </div>
            {pideCorto && (
              <div>
                <label htmlFor="nuevo-corto" className="etiqueta">Nombre corto</label>
                <input id="nuevo-corto" value={corto} onChange={(e) => setCorto(e.target.value)} className="control" />
              </div>
            )}
            {pideRegion && (
              <>
              <div>
                <label htmlFor="nueva-region" className="etiqueta">Región anatómica</label>
                <select id="nueva-region" value={region} onChange={(e) => setRegion(e.target.value)} className="control">
                  <option value="">Selecciona</option>
                  {REGIONES_ANATOMICAS.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="nuevo-riesgo" className="etiqueta">Tipo de riesgo</label>
                <textarea id="nuevo-riesgo" value={riesgo} onChange={(e) => setRiesgo(e.target.value)} rows={4} className="control" />
              </div>
              </>
            )}
            <button type="submit" className="boton-primario w-full">
              <Icono nombre="mas" />
              Agregar
            </button>
          </form>
        </div>
        <div className="min-w-0">
          {aviso && pideCorto && <p role="status" className="mb-3 text-sm text-texto-suave">{aviso}</p>}
          {error && <div className="mb-3"><AvisoError>{error}</AvisoError></div>}
          {usoError && <div className="mb-3"><AvisoError>{usoError}</AvisoError></div>}
          <TablaCatalogo filas={filas} control={control} catalogo={id} />
        </div>
      </div>
    </section>
  )
}

export default function CatalogosPage() {
  return <RequireAcceso accion="administrar"><Catalogos /></RequireAcceso>
}
