'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ItemSubida } from '@/application/adjuntos-subida'
import { MAX_POR_REGISTRO, rutaAdjunto, type Adjunto, type ModuloAdjunto } from '@/domain/adjuntos'
import { mensajeDescarga } from '@/application/adjuntos-descarga-cliente'
import { descargarArchivo } from '@/infrastructure/storage/almacenamiento'
import { storage } from '@/infrastructure/storage/cliente'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { AvisoError } from '@/presentation/ui/Estado'
import { tamanoLegible } from './formato'
import { ListaAdjuntos } from './ListaAdjuntos'
import { useAdjuntos, useBorrarAdjunto } from './useAdjuntos'
import { useSubidor } from './useSubidor'
import { VisorPdf } from './VisorPdf'
import { ZonaSubida } from './ZonaSubida'

interface Props {
  modulo: ModuloAdjunto
  registroId: string
  colaboradorId: string
  soloLectura?: boolean
  alCambiarConteo?: (n: number) => void
}

function FilaSubida({ item, alReintentar, alCancelar }: {
  item: ItemSubida; alReintentar: () => void; alCancelar: () => void
}) {
  const pct = Math.round(item.progreso * 100)
  const enError = item.estado === 'error'
  return (
    <li className="rounded-lg border border-borde bg-superficie px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-texto" title={item.archivo.name}>{item.archivo.name}</p>
          <p className="font-mono text-xs text-texto-suave">{tamanoLegible(item.archivo.size)}</p>
        </div>
        <div className="flex gap-2">
          {enError && <button type="button" onClick={alReintentar} aria-label={`Reintentar ${item.archivo.name}`}
            className="boton-secundario min-h-[2.25rem] px-3">Reintentar</button>}
          <button type="button" onClick={alCancelar} aria-label={`${enError ? 'Descartar' : 'Cancelar'} ${item.archivo.name}`}
            className="boton-secundario min-h-[2.25rem] px-3">{enError ? 'Descartar' : 'Cancelar'}</button>
        </div>
      </div>
      {enError ? (
        <p className="mt-2 text-xs font-medium text-error">{item.motivo}</p>
      ) : (
        <div role="progressbar" aria-label={`Subiendo ${item.archivo.name}`} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={pct} className="mt-2 h-1.5 overflow-hidden rounded-full bg-borde">
          <div className="h-full bg-primario transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  )
}

function bucketDisponible(): boolean {
  try {
    storage()
    return true
  } catch {
    return false
  }
}

export function Adjuntos({ modulo, registroId, colaboradorId, soloLectura = false, alCambiarConteo }: Props) {
  const { uid } = useSesion()
  const { adjuntos, cargando, error } = useAdjuntos(modulo, registroId)
  const sinBucket = useMemo(() => !bucketDisponible(), [])
  const subidor = useSubidor({ colaborador_id: colaboradorId, modulo, registro_id: registroId }, uid ?? '', adjuntos)
  const borrar = useBorrarAdjunto(uid)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const [viendo, setViendo] = useState<Adjunto | null>(null)
  const disparador = useRef<HTMLElement | null>(null)

  useEffect(() => { alCambiarConteo?.(adjuntos.length) }, [adjuntos.length, alCambiarConteo])

  const visibles = subidor.items.filter((i) => i.estado === 'pendiente' || i.estado === 'subiendo' || i.estado === 'error')
  const listos = subidor.items.filter((i) => i.estado === 'listo').length
  useEffect(() => {
    if (listos > 0) setAnuncio(listos === 1 ? 'Archivo subido' : `${listos} archivos subidos`)
  }, [listos])

  async function descargar(a: Adjunto) {
    setOcupado(a.id)
    setFallo(null)
    try {
      await descargarArchivo(rutaAdjunto(a))
    } catch (e) {
      setFallo(mensajeDescarga(e))
    } finally {
      setOcupado(null)
    }
  }

  async function eliminar(a: Adjunto) {
    setOcupado(a.id)
    setFallo(null)
    try {
      await borrar(a)
      subidor.alBorrar(a.id)
      setAnuncio('Archivo eliminado')
    } catch {
      setFallo('No se pudo eliminar el archivo')
    } finally {
      setOcupado(null)
    }
  }

  const lectura = soloLectura || sinBucket
  return (
    <section aria-label="Archivos adjuntos" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="rotulo">Archivos adjuntos</h3>
        <span className="font-mono text-xs text-texto-suave">{adjuntos.length} / {MAX_POR_REGISTRO}</span>
      </div>
      {sinBucket && <AvisoError>El almacenamiento de archivos no está configurado. Contacta al administrador.</AvisoError>}
      {error && <AvisoError>{error}</AvisoError>}
      {!lectura && <ZonaSubida alElegir={subidor.agregar} deshabilitada={false} />}
      {visibles.length > 0 && (
        <ul className="space-y-2">
          {visibles.map((i) => (
            <FilaSubida key={i.clave} item={i} alReintentar={() => subidor.reintentar(i.clave)}
              alCancelar={() => subidor.cancelar(i.clave)} />
          ))}
        </ul>
      )}
      {fallo && <AvisoError>{fallo}</AvisoError>}
      {cargando ? <p className="text-sm text-texto-suave">Cargando archivos...</p> : (
        <ListaAdjuntos adjuntos={adjuntos} soloLectura={lectura} ocupado={ocupado}
          alVer={(a, el) => { disparador.current = el; setViendo(a) }} alDescargar={(a) => void descargar(a)} alBorrar={(a) => void eliminar(a)} />
      )}
      {viendo && <VisorPdf adjunto={viendo} retorno={disparador} alCerrar={() => setViendo(null)} alDescargar={() => void descargar(viendo)} />}
      <p role="status" aria-live="polite" className="sr-only">{anuncio}</p>
    </section>
  )
}
