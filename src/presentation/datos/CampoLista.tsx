'use client'

import { useEffect, useRef } from 'react'
import type { CampoDef, Item, Valor } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'
import { CampoEntrada } from './CampoEntrada'

const itemVacio = (subcampos: CampoDef[]): Item =>
  Object.fromEntries(subcampos.map((s) => [s.nombre, null]))

export function CampoLista({ campo, valor, errores, deshabilitado = false, alCambiar }: {
  campo: CampoDef; valor: Valor | undefined; errores: Record<string, string>
  deshabilitado?: boolean; alCambiar: (v: Item[]) => void
}) {
  const subcampos = campo.subcampos ?? []
  const items: Item[] = Array.isArray(valor) ? valor : []
  const enfocar = useRef<number | null>(null)
  const idCampo = (fila: number, nombre: string) => `campo-${campo.nombre}-${fila}-${nombre}`

  useEffect(() => {
    if (enfocar.current === null) return
    document.getElementById(idCampo(enfocar.current, subcampos[0]?.nombre ?? ''))?.focus()
    enfocar.current = null
  })

  const cambiar = (fila: number, nombre: string, v: Valor) =>
    alCambiar(items.map((it, i) => (i === fila ? { ...it, [nombre]: v as Item[string] } : it)))
  const agregar = () => {
    enfocar.current = items.length
    alCambiar([...items, itemVacio(subcampos)])
  }
  const quitar = (fila: number) => alCambiar(items.filter((_, i) => i !== fila))

  return (
    <fieldset className="col-span-full min-w-0">
      <legend className="etiqueta">{campo.etiqueta}</legend>
      {items.length === 0 && <p className="mb-2 text-sm text-texto-suave">Sin ítems registrados.</p>}
      <ul className="space-y-3">
        {items.map((item, fila) => (
          <li key={fila} className="rounded border border-borde bg-superficie-2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Ítem {fila + 1}</span>
              <button type="button" onClick={() => quitar(fila)} disabled={deshabilitado}
                aria-label={`Quitar ítem ${fila + 1}`} className="boton-secundario text-error">Quitar</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {subcampos.map((s) => (
                <CampoEntrada key={s.nombre} campo={s} valor={item[s.nombre]} prefijo={`${campo.nombre}-${fila}-`}
                  error={errores[`${campo.nombre}.${fila}.${s.nombre}`]} deshabilitado={deshabilitado}
                  alCambiar={(v) => cambiar(fila, s.nombre, v)} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={agregar} disabled={deshabilitado}
        aria-label={`Agregar ítem a ${campo.etiqueta}`} className="boton-secundario mt-3">
        <Icono nombre="mas" />
        Agregar ítem
      </button>
    </fieldset>
  )
}
