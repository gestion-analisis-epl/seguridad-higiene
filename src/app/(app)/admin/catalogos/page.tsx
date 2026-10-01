'use client'

import { useState, type FormEvent } from 'react'
import { CATALOGOS_INICIALES } from '@/domain/catalogos-iniciales'
import { sembrarValoresIniciales } from '@/infrastructure/firestore/catalogos'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { TablaCatalogo } from '@/presentation/catalogos/TablaCatalogo'
import { useEdicionCatalogo } from '@/presentation/catalogos/useEdicionCatalogo'
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
  const [ocupado, setOcupado] = useState(false)
  const items = useCatalogo(id)
  const { cargando, error: usoError, usoDe } = useUsoCatalogo(id)
  const edicion = useEdicionCatalogo(id, items, uid, usoDe, !cargando && !usoError)
  const { control, error } = edicion
  const filas = items.map((i) => ({ ...i, uso: usoDe(i.valor) }))

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (await edicion.agregar(etiqueta)) setEtiqueta('')
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
              valor={id} alCambiar={(nuevo) => { setId(nuevo); edicion.reiniciar() }} />
          </div>
          <form onSubmit={agregar} className="space-y-3">
            <div>
              <label htmlFor="nuevo-item" className="etiqueta">Nuevo valor</label>
              <input id="nuevo-item" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className="control" />
              <p className="mt-1 text-xs text-texto-suave">El valor interno se genera de la etiqueta y no se puede cambiar después.</p>
            </div>
            <button type="submit" className="boton-primario w-full">
              <Icono nombre="mas" />
              Agregar
            </button>
          </form>
        </div>
        <div className="min-w-0">
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
