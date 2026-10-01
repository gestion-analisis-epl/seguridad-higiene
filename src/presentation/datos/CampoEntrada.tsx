'use client'

import { aTextoIso, deTextoIso } from '@/domain/fechas'
import type { CampoDef, Valor } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { InputFecha } from '@/presentation/ui/InputFecha'
import { useOpciones } from './useOpciones'

export function CampoEntrada({ campo, valor, error, deshabilitado = false, prefijo = '', alCambiar }: {
  campo: CampoDef; valor: Valor | undefined; error?: string; deshabilitado?: boolean
  prefijo?: string; alCambiar: (v: Valor) => void
}) {
  const opciones = useOpciones(campo, typeof valor === 'string' ? valor : null)
  const id = `campo-${prefijo}${campo.nombre}`
  const idError = `${id}-error`
  const aria = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? idError : undefined,
    'aria-required': campo.requerido ? true : undefined,
  }
  const mensaje = error && (
    <p id={idError} role="alert" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-error">
      <Icono nombre="alerta" className="h-3.5 w-3.5" />
      {error}
    </p>
  )
  const requerido = campo.requerido && <span className="ml-0.5 text-error" aria-hidden="true">*</span>
  if (campo.tipo === 'booleano') {
    return (
      <div className="flex flex-col justify-end">
        <label htmlFor={id} className="flex min-h-[2.5rem] cursor-pointer items-center gap-3 rounded border border-borde bg-superficie-2 px-3 text-sm">
          <input id={id} type="checkbox" className="casilla" checked={valor === true} disabled={deshabilitado}
            onChange={(e) => alCambiar(e.target.checked)} {...aria} />
          <span>{campo.etiqueta}{requerido}</span>
        </label>
        {mensaje}
      </div>
    )
  }
  let control
  if (campo.tipo === 'seleccion') {
    control = (
      <SelectBuscable id={id} etiqueta={campo.etiqueta} etiquetaId={`${id}-et`} opciones={opciones}
        valor={typeof valor === 'string' ? valor : ''} textoVacio="Selecciona" deshabilitado={deshabilitado}
        alCambiar={(v) => alCambiar(v || null)} {...aria} />
    )
  } else if (campo.tipo === 'fecha') {
    control = <InputFecha id={id} className="control" valor={valor instanceof Date ? aTextoIso(valor) : ''}
      disabled={deshabilitado} alCambiar={(t) => alCambiar(deTextoIso(t))} {...aria} />
  } else if (campo.tipo === 'numero') {
    control = <input id={id} type="number" inputMode="decimal" className="control tabular-nums" min={0} step="any"
      value={typeof valor === 'number' ? valor : ''} disabled={deshabilitado}
      onChange={(e) => alCambiar(e.target.value === '' ? null : Number(e.target.value))} {...aria} />
  } else {
    control = <input id={id} type="text" className="control" value={typeof valor === 'string' ? valor : ''}
      disabled={deshabilitado} onChange={(e) => alCambiar(e.target.value)} {...aria} />
  }
  return (
    <div className="min-w-0">
      <label id={`${id}-et`} htmlFor={id} className="etiqueta">{campo.etiqueta}{requerido}</label>
      {control}
      {mensaje}
    </div>
  )
}
