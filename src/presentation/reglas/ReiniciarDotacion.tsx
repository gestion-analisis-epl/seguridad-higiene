'use client'

import { useEffect, useState } from 'react'
import { ALCANCES, FRASE_CONFIRMACION, type AlcanceReinicio, type ConteoReinicio } from '@/application/reinicio-dotacion'
import { consultarReinicio, ejecutarReinicio, respaldoReinicio } from '@/infrastructure/api/dotacion'
import { AvisoError } from '@/presentation/ui/Estado'

const ORDEN: AlcanceReinicio[] = ['uniformes', 'epp', 'equipo']
const mensaje = (e: unknown, defecto: string) => (e instanceof Error ? e.message : defecto)

function descargar(nombre: string, datos: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

export function ReiniciarDotacion() {
  const [seleccion, setSeleccion] = useState<AlcanceReinicio[]>([])
  const [conteos, setConteos] = useState<ConteoReinicio[]>([])
  const [respaldoDe, setRespaldoDe] = useState('')
  const [frase, setFrase] = useState('')
  const [ocupado, setOcupado] = useState<'consultar' | 'respaldo' | 'borrar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ConteoReinicio[] | null>(null)

  const clave = ORDEN.filter((a) => seleccion.includes(a)).join(',')
  const alcances = clave ? (clave.split(',') as AlcanceReinicio[]) : []

  useEffect(() => {
    if (alcances.length === 0) { setConteos([]); return }
    let vigente = true
    setOcupado('consultar')
    setError(null)
    consultarReinicio(alcances)
      .then((r) => { if (vigente) setConteos(r.conteos) })
      .catch((e) => { if (vigente) setError(mensaje(e, 'No se pudo consultar lo que se borraría')) })
      .finally(() => { if (vigente) setOcupado(null) })
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  function alternar(a: AlcanceReinicio) {
    setSeleccion((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))
    setResultado(null)
    setFrase('')
  }

  async function descargarRespaldo() {
    setOcupado('respaldo')
    setError(null)
    try {
      descargar(`respaldo-dotacion-${new Date().toISOString().slice(0, 10)}.json`, await respaldoReinicio(alcances))
      setRespaldoDe(clave)
    } catch (e) {
      setError(mensaje(e, 'No se pudo generar el respaldo'))
    } finally {
      setOcupado(null)
    }
  }

  async function borrar() {
    setOcupado('borrar')
    setError(null)
    try {
      setResultado((await ejecutarReinicio(alcances, FRASE_CONFIRMACION)).conteos)
      setSeleccion([])
      setRespaldoDe('')
      setFrase('')
    } catch (e) {
      setError(mensaje(e, 'No se pudo reiniciar la dotación'))
    } finally {
      setOcupado(null)
    }
  }

  const fraseValida = frase.trim().toUpperCase() === FRASE_CONFIRMACION
  const faltan = [
    ...(alcances.length === 0 ? ['elige qué borrar'] : []),
    ...(alcances.length > 0 && respaldoDe !== clave ? ['descarga el respaldo (paso 1)'] : []),
    ...(!fraseValida ? [`escribe ${FRASE_CONFIRMACION} (paso 2)`] : []),
  ]
  const puedeBorrar = faltan.length === 0 && ocupado === null

  return (
    <div className="tarjeta space-y-4 p-4">
      <p className="text-sm text-texto-suave">
        Vacía el catálogo elegido, sus entregas y los artículos de la hoja que apuntan a él. Las entregas se pueden volver a traer
        sincronizando la hoja. No toca colaboradores ni reglas de dotación.
      </p>
      <fieldset className="space-y-2">
        <legend className="etiqueta">Qué borrar</legend>
        {ORDEN.map((a) => (
          <label key={a} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="casilla" checked={seleccion.includes(a)} onChange={() => alternar(a)} />
            {ALCANCES[a].etiqueta}
          </label>
        ))}
      </fieldset>
      {seleccion.includes('equipo') && (
        <p role="note" className="text-sm text-error">
          Sin tipos de equipo no se puede capturar equipo en las oficinas hasta que los repongas con «Cargar valores iniciales» en Catálogos.
        </p>
      )}
      {conteos.length > 0 && (
        <ul className="text-sm">
          {conteos.map((c) => (
            <li key={c.alcance}>
              <strong>{c.etiqueta}:</strong> {c.entradas} entradas de catálogo
              {ALCANCES[c.alcance].coleccion ? `, ${c.entregas} entregas` : ''}, {c.articulos} artículos de la hoja
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="boton-secundario" disabled={alcances.length === 0 || ocupado !== null}
          onClick={() => void descargarRespaldo()}>
          {ocupado === 'respaldo' ? 'Generando...' : respaldoDe === clave && clave ? 'Respaldo descargado' : '1. Descargar respaldo'}
        </button>
        <label className="flex items-center gap-2 text-sm">
          2. Escribe {FRASE_CONFIRMACION}
          <input aria-label="Frase de confirmación" className="control w-40" value={frase} onChange={(e) => setFrase(e.target.value)} />
        </label>
        <button type="button" className="boton-secundario border-error text-error" disabled={!puedeBorrar} onClick={() => void borrar()}>
          {ocupado === 'borrar' ? 'Borrando...' : '3. Borrar y reiniciar'}
        </button>
      </div>
      {!puedeBorrar && ocupado === null && <p className="text-xs text-texto-suave">Para borrar: {faltan.join(' y ')}.</p>}
      {error && <AvisoError>{error}</AvisoError>}
      {resultado && (
        <p role="status" className="text-sm">
          Listo. Se borró: {resultado.map((c) => `${c.etiqueta} (${c.entradas} entradas, ${c.entregas} entregas, ${c.articulos} artículos)`).join('; ')}.
        </p>
      )}
    </div>
  )
}
