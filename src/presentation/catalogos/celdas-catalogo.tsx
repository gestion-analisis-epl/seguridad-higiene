'use client'

import type { FormEvent } from 'react'
import { REGIONES_ANATOMICAS } from '@/domain/catalogos-iniciales'
import type { UsoCatalogo } from '@/domain/catalogos-edicion'
import type { Opcion } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'

export interface FilaCatalogo extends Opcion { uso: UsoCatalogo }

export interface ControlEdicion {
  editando: { valor: string; texto: string; region: string; riesgo: string; nombre_corto: string } | null
  confirmando: string | null
  ocupado: boolean
  usoListo: boolean
  cambiarTexto: (texto: string) => void
  cambiarRegion: (region: string) => void
  cambiarRiesgo: (riesgo: string) => void
  cambiarCorto: (nombre_corto: string) => void
  iniciarEdicion: (f: FilaCatalogo) => void
  cancelar: () => void
  guardarEdicion: () => void
  pedirEliminar: (f: FilaCatalogo) => void
  confirmarEliminar: (f: FilaCatalogo) => void
}

export function CeldaEtiqueta({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor !== fila.valor) return <>{fila.etiqueta}</>
  const enviar = (e: FormEvent) => { e.preventDefault(); c.guardarEdicion() }
  return (
    <form onSubmit={enviar} onKeyDown={(e) => { if (e.key === 'Escape') c.cancelar() }}>
      <label htmlFor="editar-etiqueta" className="sr-only">Etiqueta de {fila.valor}</label>
      <input id="editar-etiqueta" value={c.editando.texto} onChange={(e) => c.cambiarTexto(e.target.value)}
        autoFocus className="control !min-h-[2rem] !py-1" />
    </form>
  )
}

export function CeldaRegion({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor !== fila.valor) return <>{REGIONES_ANATOMICAS.find((r) => r.valor === fila.region)?.etiqueta ?? ''}</>
  return (
    <>
      <label htmlFor="editar-region" className="sr-only">Región anatómica de {fila.etiqueta}</label>
      <select id="editar-region" value={c.editando.region} onChange={(e) => c.cambiarRegion(e.target.value)}
        className="control !min-h-[2rem] !py-1">
        <option value="">Selecciona</option>
        {REGIONES_ANATOMICAS.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
      </select>
    </>
  )
}

export function CeldaRiesgo({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor !== fila.valor) return <span className="whitespace-pre-line">{fila.riesgo ?? ''}</span>
  return (
    <>
      <label htmlFor="editar-riesgo" className="sr-only">Tipo de riesgo de {fila.etiqueta}</label>
      <textarea id="editar-riesgo" value={c.editando.riesgo} onChange={(e) => c.cambiarRiesgo(e.target.value)} rows={3}
        className="control !py-1" />
    </>
  )
}

export function CeldaCorto({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor !== fila.valor) return <>{fila.nombre_corto ?? ''}</>
  return (
    <>
      <label htmlFor="editar-corto" className="sr-only">Nombre corto de {fila.etiqueta}</label>
      <input id="editar-corto" value={c.editando.nombre_corto} onChange={(e) => c.cambiarCorto(e.target.value)}
        className="control !min-h-[2rem] !py-1" />
    </>
  )
}

const BOTON = 'boton-secundario !min-h-[2rem] !px-2'

export function CeldaAcciones({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor === fila.valor) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={c.guardarEdicion} disabled={c.ocupado} className={BOTON}
          aria-label={`Guardar ${fila.etiqueta}`} title="Guardar">
          <Icono nombre="check" className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={c.cancelar} disabled={c.ocupado} className={BOTON}
          aria-label="Cancelar" title="Cancelar">
          <Icono nombre="cerrar" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  if (c.confirmando === fila.valor) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => c.confirmarEliminar(fila)} disabled={c.ocupado}
          className={`${BOTON} border-error text-error`} aria-label={`Confirmar eliminación de ${fila.etiqueta}`} title="Confirmar eliminación">
          <Icono nombre="alerta" className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={c.cancelar} disabled={c.ocupado} className={BOTON}
          aria-label="Cancelar" title="Cancelar">
          <Icono nombre="cerrar" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => c.iniciarEdicion(fila)} disabled={c.ocupado} className={BOTON}
        aria-label={`Editar ${fila.etiqueta}`} title="Editar">
        <Icono nombre="editar" className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => c.pedirEliminar(fila)} disabled={c.ocupado || !c.usoListo}
        className={`${BOTON} text-error`} aria-label={`Eliminar ${fila.etiqueta}`} title="Eliminar">
        <Icono nombre="basura" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
