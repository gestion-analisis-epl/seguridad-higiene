'use client'

import type { Modo } from '@/application/entregas-tipos'
import { Icono } from '@/presentation/ui/Icono'

const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: 'nueva', etiqueta: 'Nueva entrega' },
  { valor: 'corregir', etiqueta: 'Corregir' },
]

const AYUDA: Record<Modo, string> = {
  nueva: 'Registra una entrega nueva de lo que marques. Las entregas anteriores se conservan.',
  corregir: 'Corrige la última entrega de cada artículo. Las entregas anteriores no cambian.',
}

export function SelectorModo({ modo, puedeCorregir, alCambiar }: {
  modo: Modo; puedeCorregir: boolean; alCambiar: (m: Modo) => void
}) {
  return (
    <fieldset className="px-4 pt-4 sm:px-6">
      <legend className="etiqueta">Tipo de captura</legend>
      <div className="inline-flex max-w-full overflow-hidden rounded border border-borde-control">
        {MODOS.map((m) => {
          const deshabilitado = m.valor === 'corregir' && !puedeCorregir
          const activo = modo === m.valor
          return (
            <label key={m.valor}
              className={`flex min-h-[2.5rem] items-center gap-2 px-4 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-foco ${
                activo ? 'bg-primario text-primario-texto' : 'bg-superficie text-texto hover:bg-superficie-2'
              } ${deshabilitado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input type="radio" name="modo-entrega" className="sr-only" checked={activo}
                disabled={deshabilitado} onChange={() => alCambiar(m.valor)} />
              {activo && <Icono nombre="check" className="h-3.5 w-3.5" />}
              {m.etiqueta}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-texto-suave">
        {AYUDA[modo]}{!puedeCorregir && ' Corregir se habilita cuando hay entregas registradas.'}
      </p>
    </fieldset>
  )
}
