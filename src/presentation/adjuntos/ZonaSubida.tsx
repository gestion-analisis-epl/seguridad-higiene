'use client'

import { useId, useRef, useState, type DragEvent } from 'react'
import { EXTENSIONES, MAX_POR_REGISTRO, TIPOS_MIME } from '@/domain/adjuntos'
import { Icono } from '@/presentation/ui/Icono'

const ACEPTADOS = [...EXTENSIONES.map((e) => `.${e}`), ...TIPOS_MIME].join(',')

export function ZonaSubida({ alElegir, deshabilitada }: { alElegir: (archivos: File[]) => void; deshabilitada: boolean }) {
  const [encima, setEncima] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const idAyuda = useId()

  function soltar(e: DragEvent) {
    e.preventDefault()
    setEncima(false)
    if (!deshabilitada) alElegir(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!deshabilitada) setEncima(true) }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
      className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
        encima ? 'border-primario bg-superficie-2' : 'border-borde-fuerte bg-superficie-2/60'
      }`}
    >
      <Icono nombre="subir" className="h-6 w-6 text-texto-suave" />
      <p className="text-sm text-texto">Arrastra archivos aquí o</p>
      <button type="button" onClick={() => entrada.current?.click()} disabled={deshabilitada}
        aria-describedby={idAyuda} className="boton-secundario">
        <Icono nombre="clip" />
        Seleccionar archivos
      </button>
      <input ref={entrada} type="file" multiple accept={ACEPTADOS} tabIndex={-1} aria-label="Seleccionar archivos"
        className="sr-only" disabled={deshabilitada}
        onChange={(e) => { alElegir(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <p id={idAyuda} className="text-xs text-texto-suave">
        PDF, imágenes, Word o Excel. Hasta 10 MB por archivo y {MAX_POR_REGISTRO} por registro.
      </p>
    </div>
  )
}
