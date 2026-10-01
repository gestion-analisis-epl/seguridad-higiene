'use client'

import type { Opcion } from '@/domain/modulos'
import { MultiSelect } from '@/presentation/ui'

export function FiltroCiudades({ opciones, seleccion, alCambiar }: {
  opciones: Opcion[]
  seleccion: string[]
  alCambiar: (seleccion: string[]) => void
}) {
  return (
    <div className="min-w-0 sm:max-w-xs sm:flex-1 sm:min-w-[14rem]">
      <MultiSelect etiqueta="Ciudades" opciones={opciones} seleccion={seleccion} alCambiar={alCambiar}
        textoTodos="Todas las ciudades" textoNinguno="Ninguna ciudad" buscable />
    </div>
  )
}

export function AvisoSinCiudades() {
  return <p role="status" className="aviso-info">Selecciona al menos una ciudad.</p>
}
