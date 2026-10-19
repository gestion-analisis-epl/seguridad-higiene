'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { CATALOGO_NO_UNIBLE } from '@/application/union-catalogos'
import { unirEntradas, type ResumenUnion } from '@/infrastructure/api/catalogos'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

const mensaje = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo unir las entradas')

export function UnirEntradas({ catalogo, items }: { catalogo: string; items: Opcion[] }) {
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [resumen, setResumen] = useState<ResumenUnion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)

  const opciones = useMemo(
    () => items.map((i) => ({ valor: i.valor, etiqueta: i.nombre_corto ? `${i.etiqueta} (${i.nombre_corto})` : i.etiqueta })),
    [items],
  )
  const nombre = (valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor
  if (catalogo === CATALOGO_NO_UNIBLE) return null

  const reiniciar = () => { setResumen(null); setError(null); setListo(null) }

  async function ejecutar(confirmar: boolean) {
    setOcupado(true)
    setError(null)
    try {
      const r = await unirEntradas(catalogo, origen, destino, confirmar)
      if (confirmar) {
        setListo(`Listo. «${nombre(origen)}» se unió a «${nombre(destino)}»: ${r.registros} registros reasignados.`)
        setOrigen('')
        setDestino('')
        setResumen(null)
      } else setResumen(r)
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setOcupado(false)
    }
  }

  const puedeRevisar = origen !== '' && destino !== '' && origen !== destino && !ocupado
  const bloqueado = (resumen?.bloqueos.length ?? 0) > 0

  return (
    <details className="space-y-3">
      <summary className="cursor-pointer text-sm font-medium">Unir entradas duplicadas</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-texto-suave">
          Reasigna los registros de una entrada a otra y elimina la primera. Los datos que falten en la segunda se copian de la primera.
        </p>
        <div>
          <label id="unir-origen-et" htmlFor="unir-origen" className="etiqueta">Entrada a eliminar</label>
          <SelectBuscable id="unir-origen" etiqueta="Entrada a eliminar" etiquetaId="unir-origen-et" opciones={opciones}
            valor={origen} textoVacio="Selecciona" alCambiar={(v) => { setOrigen(v); reiniciar() }} />
        </div>
        <div>
          <label id="unir-destino-et" htmlFor="unir-destino" className="etiqueta">Se une a</label>
          <SelectBuscable id="unir-destino" etiqueta="Se une a" etiquetaId="unir-destino-et" opciones={opciones}
            valor={destino} textoVacio="Selecciona" alCambiar={(v) => { setDestino(v); reiniciar() }} />
        </div>
        {resumen === null ? (
          <button type="button" className="boton-secundario w-full" disabled={!puedeRevisar} onClick={() => void ejecutar(false)}>
            {ocupado ? 'Revisando...' : 'Revisar unión'}
          </button>
        ) : (
          <div className="space-y-2">
            <p role="status" className="text-sm">
              Se reasignarán {resumen.registros} registros de «{nombre(origen)}» a «{nombre(destino)}» y se eliminará «{nombre(origen)}».
            </p>
            {bloqueado && (
              <AvisoError>Hay {resumen.bloqueos.join(' y ')} con «{nombre(origen)}»; edítalos o elimínalos antes de unir.</AvisoError>
            )}
            <button type="button" className="boton-secundario w-full border-error text-error" disabled={bloqueado || ocupado}
              onClick={() => void ejecutar(true)}>
              {ocupado ? 'Uniendo...' : 'Confirmar unión'}
            </button>
          </div>
        )}
        {error && <AvisoError>{error}</AvisoError>}
        {listo && <p role="status" className="text-sm text-texto-suave">{listo}</p>}
      </div>
    </details>
  )
}
