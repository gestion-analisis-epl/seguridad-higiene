'use client'

import type { ConfigEntrega } from '@/application/entregas-config'
import type { Modo, RegistroEntrega } from '@/application/entregas-tipos'
import { formatearFecha } from '@/domain/fechas'
import type { Opcion, Valor, Valores } from '@/domain/modulos'
import { CampoEntrada } from '@/presentation/datos/CampoEntrada'

export function FilaItemEntrega({ item, config, modo, valores, errores, ultima, alCambiar }: {
  item: Opcion
  config: ConfigEntrega
  modo: Modo
  valores: Valores
  errores: Record<string, string> | undefined
  ultima: RegistroEntrega | undefined
  alCambiar: (campo: string, valor: Valor) => void
}) {
  const campos = config.campos.filter((c) => modo === 'corregir' || c.nombre !== 'fecha')
  const previa = ultima && modo === 'nueva'
    ? `Última entrega: ${formatearFecha(ultima.fecha instanceof Date ? ultima.fecha : null)}, ${config.detalle(ultima).toLowerCase()}`
    : null
  return (
    <fieldset className="min-w-0 border-t border-borde px-4 py-3 sm:px-6">
      <legend className="float-left mb-2 w-full p-0 text-sm font-semibold text-texto">{item.etiqueta}</legend>
      {previa && <p className="clear-both mb-2 text-xs text-texto-suave">{previa}</p>}
      <div className="clear-both grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campos.map((c) => (
          <CampoEntrada key={c.nombre} campo={{ ...c, requerido: false }} prefijo={`${item.valor}-`}
            valor={valores[c.nombre]} error={errores?.[c.nombre]}
            alCambiar={(v) => alCambiar(c.nombre, v)} />
        ))}
      </div>
    </fieldset>
  )
}
