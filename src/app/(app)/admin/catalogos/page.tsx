'use client'

import { useState, type FormEvent } from 'react'
import { CATALOGOS_INICIALES, unirItems } from '@/domain/catalogos-iniciales'
import { slug } from '@/domain/slug'
import { guardarCatalogo, sembrarValoresIniciales } from '@/infrastructure/firestore/catalogos'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { Icono } from '@/presentation/ui/Icono'

const IDS = Object.keys(CATALOGOS_INICIALES)

function Catalogos() {
  const { uid } = useSesion()
  const [id, setId] = useState(IDS[0])
  const [etiqueta, setEtiqueta] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const items = useCatalogo(id)

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const valor = slug(etiqueta)
    if (!valor || !uid) return
    await guardarCatalogo(id, unirItems(items, [{ valor, etiqueta: etiqueta.trim() }]), uid)
    setEtiqueta('')
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
            <label htmlFor="catalogo" className="etiqueta">Catálogo</label>
            <select id="catalogo" value={id} onChange={(e) => setId(e.target.value)} className="control">
              {IDS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <form onSubmit={agregar} className="space-y-3">
            <div>
              <label htmlFor="nuevo-item" className="etiqueta">Nuevo valor</label>
              <input id="nuevo-item" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className="control" />
            </div>
            <button type="submit" className="boton-primario w-full">
              <Icono nombre="mas" />
              Agregar
            </button>
          </form>
        </div>
        <div className="tarjeta min-w-0">
          <p className="rotulo border-b border-borde px-4 py-2">
            {items.length === 1 ? '1 valor' : `${items.length} valores`}
          </p>
          {items.length === 0 && (
            <p className="px-4 py-3 text-sm text-texto-suave">
              Este catálogo está vacío: agrega valores o impórtalos con la migración.
            </p>
          )}
          <ul className="divide-y divide-borde">
            {items.map((i) => (
              <li key={i.valor} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2 text-sm">
                <span className="text-texto">{i.etiqueta}</span>
                <span className="break-all font-mono text-xs text-texto-suave">{i.valor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default function CatalogosPage() {
  return <RequireAcceso accion="administrar"><Catalogos /></RequireAcceso>
}
