'use client'

import { useMemo } from 'react'
import type { Opcion } from '@/domain/modulos'
import { agruparPorRegion } from '@/domain/epp-regiones'
import { MultiSelect } from '@/presentation/ui/MultiSelect'

interface Props {
  tiposEpp: Opcion[]
  marcadas: string[]
  alCambiar: (valores: string[]) => void
}

export function EppPorRegion({ tiposEpp, marcadas, alCambiar }: Props) {
  const grupos = useMemo(() => agruparPorRegion(tiposEpp), [tiposEpp])
  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="etiqueta">EPP obligatorio</legend>
      {grupos.length === 0 && <p className="text-sm text-texto-suave">El catálogo de EPP está vacío; agrégalo en Catálogos.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((g) => (
          <MultiSelect key={g.region} etiqueta={g.titulo} opciones={g.opciones}
            seleccion={marcadas.filter((v) => g.items.some((i) => i.valor === v))}
            alCambiar={(sel) => alCambiar([...marcadas.filter((v) => !g.items.some((i) => i.valor === v)), ...sel])}
            textoTodos="Todos" textoNinguno="Ninguno" />
        ))}
      </div>
    </fieldset>
  )
}
