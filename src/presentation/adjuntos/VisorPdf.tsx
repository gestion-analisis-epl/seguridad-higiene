'use client'

import { useEffect, useState, type RefObject } from 'react'
import { mensajeDescarga } from '@/application/adjuntos-descarga-cliente'
import { rutaAdjunto, type Adjunto } from '@/domain/adjuntos'
import { obtenerUrlArchivo } from '@/infrastructure/storage/almacenamiento'
import { Dialogo } from '@/presentation/ui/Dialogo'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'

interface Props {
  adjunto: Adjunto
  retorno: RefObject<HTMLElement>
  alCerrar: () => void
  alDescargar: () => void
}

// El enlace vive solo en el estado de este componente; nunca se guarda ni se registra.
export function VisorPdf({ adjunto, retorno, alCerrar, alDescargar }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let vigente = true
    obtenerUrlArchivo(rutaAdjunto(adjunto))
      .then((u) => { if (vigente) setUrl(u) })
      .catch((e) => { if (vigente) setError(mensajeDescarga(e)) })
    return () => { vigente = false }
  }, [adjunto])

  return (
    <Dialogo titulo={adjunto.nombre} alCerrar={alCerrar} retorno={retorno}>
      <div className="flex flex-wrap items-center gap-2 border-b border-borde px-3 py-2.5">
        <p className="min-w-0 flex-1 basis-40 truncate text-sm font-medium" title={adjunto.nombre}>{adjunto.nombre}</p>
        <div className="flex flex-wrap items-center gap-2">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="boton-secundario min-h-[2.5rem] px-3">
              <Icono nombre="nueva-pestana" />
              Abrir en pestaña nueva
            </a>
          ) : (
            <span aria-disabled="true" className="boton-secundario min-h-[2.5rem] px-3 opacity-60">
              <Icono nombre="nueva-pestana" />
              Abrir en pestaña nueva
            </span>
          )}
          <button type="button" onClick={alDescargar} className="boton-secundario min-h-[2.5rem] px-3">
            <Icono nombre="descargar" />
            Descargar
          </button>
          <button type="button" onClick={alCerrar} className="boton-primario min-h-[2.5rem] px-3">
            <Icono nombre="cerrar" />
            Cerrar
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-superficie-2">
        {error && (
          <div className="p-4">
            <AvisoError>{error}. Prueba con Descargar.</AvisoError>
          </div>
        )}
        {!error && !listo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Cargando texto="Cargando PDF..." />
          </div>
        )}
        {url && (
          <iframe src={url} title={adjunto.nombre} referrerPolicy="no-referrer" onLoad={() => setListo(true)}
            className="h-full w-full border-0" />
        )}
      </div>
      <p className="border-t border-borde px-3 py-2 text-xs text-texto-suave">
        Si el PDF no se muestra en este dispositivo, usa Abrir en pestaña nueva o Descargar.
      </p>
    </Dialogo>
  )
}
