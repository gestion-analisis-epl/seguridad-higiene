'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { anioDeTexto } from './formato'

export function FiltrosAnaliticos({ anio, alCambiarAnio, children }: {
  anio: number
  alCambiarAnio: (anio: number) => void
  children?: ReactNode
}) {
  // Texto local para poder escribir el año; solo se publica cuando es válido.
  const [textoAnio, setTextoAnio] = useState(String(anio))
  // El año restaurado llega tras montar: se refleja si el texto escrito no lo representa
  useEffect(() => {
    setTextoAnio((t) => (anioDeTexto(t) === anio ? t : String(anio)))
  }, [anio])
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
      {children}
    </div>
  )
}
