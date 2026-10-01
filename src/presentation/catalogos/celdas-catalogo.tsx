'use client'

import type { FormEvent } from 'react'
import type { UsoCatalogo } from '@/domain/catalogos-edicion'
import type { Opcion } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'

export interface FilaCatalogo extends Opcion { uso: UsoCatalogo }

export interface ControlEdicion {
  editando: { valor: string; texto: string } | null
  confirmando: string | null
  ocupado: boolean
  usoListo: boolean
  cambiarTexto: (texto: string) => void
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

const BOTON = 'boton-secundario !min-h-[2rem] !px-3'

export function CeldaAcciones({ fila, control: c }: { fila: FilaCatalogo; control: ControlEdicion }) {
  if (c.editando?.valor === fila.valor) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={c.guardarEdicion} disabled={c.ocupado} className={BOTON}>
          {c.ocupado ? 'Guardando...' : 'Guardar'}<span className="sr-only"> etiqueta de {fila.etiqueta}</span>
        </button>
        <button type="button" onClick={c.cancelar} disabled={c.ocupado} className={BOTON}>Cancelar</button>
      </div>
    )
  }
  if (c.confirmando === fila.valor) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => c.confirmarEliminar(fila)} disabled={c.ocupado}
          className={`${BOTON} border-error text-error`}>
          <Icono nombre="alerta" className="h-3.5 w-3.5" />
          {c.ocupado ? 'Eliminando...' : 'Confirmar eliminación'}
        </button>
        <button type="button" onClick={c.cancelar} disabled={c.ocupado} className={BOTON}>Cancelar</button>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => c.iniciarEdicion(fila)} disabled={c.ocupado} className={BOTON}>
        <Icono nombre="editar" className="h-3.5 w-3.5" />
        Editar<span className="sr-only"> {fila.etiqueta}</span>
      </button>
      <button type="button" onClick={() => c.pedirEliminar(fila)} disabled={c.ocupado || !c.usoListo}
        className={`${BOTON} text-error`}>
        Eliminar<span className="sr-only"> {fila.etiqueta}</span>
      </button>
    </div>
  )
}
