'use client'

import { useMemo, useState } from 'react'
import { etiquetaColaboradorHoja } from '@/domain/colaboradores-hoja'
import { asegurarColaborador } from '@/infrastructure/api/colaboradores'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { useColaboradoresHoja } from './useColaboradoresHoja'

const PREFIJO_UID = 'uid:'

export function SelectorColaboradorHoja({ id, etiquetaId, valor, deshabilitado = false, alCambiar, ...aria }: {
  id: string
  etiquetaId?: string
  valor: string
  deshabilitado?: boolean
  alCambiar: (uid: string) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}) {
  const { filas, cargando, error, desactualizado, actualizar } = useColaboradoresHoja()
  const { registros } = useColeccion('colaboradores')
  const [asegurando, setAsegurando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const actual = registros.find((r) => r.id === valor)
  const idActual = typeof actual?.id_interno === 'string' ? actual.id_interno : null

  const { opciones, seleccionado } = useMemo(() => {
    const lista = filas.filter((f) => !f.fecha_baja).map((f) => ({ valor: f.id_interno, etiqueta: etiquetaColaboradorHoja(f) }))
    if (!actual) return { opciones: lista, seleccionado: '' }
    if (idActual && lista.some((o) => o.valor === idActual)) return { opciones: lista, seleccionado: idActual }
    const sufijo = cargando ? '' : idActual ? ' (baja)' : ' (sin enlazar)'
    const propio = { valor: `${PREFIJO_UID}${actual.id}`, etiqueta: `${String(actual.nombre ?? actual.id)}${sufijo}` }
    return { opciones: [...lista, propio], seleccionado: propio.valor }
  }, [filas, actual, idActual, cargando])

  async function elegir(v: string) {
    setFallo(null)
    if (v === '') return alCambiar('')
    if (v.startsWith(PREFIJO_UID)) return alCambiar(v.slice(PREFIJO_UID.length))
    setAsegurando(true)
    try {
      alCambiar((await asegurarColaborador(v)).uid)
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo registrar al colaborador')
    } finally {
      setAsegurando(false)
    }
  }

  return (
    <>
      <SelectBuscable id={id} etiqueta="Colaborador" etiquetaId={etiquetaId} opciones={opciones} valor={seleccionado}
        textoVacio={cargando && filas.length === 0 ? 'Cargando lista...' : 'Selecciona'}
        deshabilitado={deshabilitado || asegurando} alCambiar={(v) => void elegir(v)} {...aria} />
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
        {asegurando && <span>Registrando colaborador...</span>}
        {desactualizado && <span>La lista puede estar desactualizada</span>}
        <button type="button" onClick={actualizar} disabled={cargando || asegurando} className="underline">
          Actualizar lista
        </button>
      </div>
      {(error || fallo) && <div className="mt-2"><AvisoError>{fallo ?? error}</AvisoError></div>}
    </>
  )
}
