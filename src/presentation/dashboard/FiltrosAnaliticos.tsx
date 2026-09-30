'use client'

import { useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { anioDeTexto } from './formato'

export function FiltrosAnaliticos({ anio, ciudad, ciudades, alCambiarAnio, alCambiarCiudad }: {
  anio: number
  ciudad: string
  ciudades: Opcion[]
  alCambiarAnio: (anio: number) => void
  alCambiarCiudad: (ciudad: string) => void
}) {
  // Texto local para poder escribir el año; solo se publica cuando es válido.
  const [textoAnio, setTextoAnio] = useState(String(anio))
  const cambiarAnio = (texto: string) => {
    setTextoAnio(texto)
    const n = anioDeTexto(texto)
    if (n !== null) alCambiarAnio(n)
  }
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="min-w-0 sm:w-32">
        <label htmlFor="a-anio" className="etiqueta">Año</label>
        <input id="a-anio" type="number" inputMode="numeric" min={2000} value={textoAnio}
          onChange={(e) => cambiarAnio(e.target.value)} onBlur={() => setTextoAnio(String(anio))} className="control" />
      </div>
      <div className="min-w-0 flex-1 sm:min-w-[14rem] sm:max-w-xs">
        <label htmlFor="a-ciudad" className="etiqueta">Ciudad</label>
        <select id="a-ciudad" value={ciudad} onChange={(e) => alCambiarCiudad(e.target.value)} className="control">
          <option value="">Todas (consolidado)</option>
          {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
        </select>
      </div>
    </div>
  )
}
