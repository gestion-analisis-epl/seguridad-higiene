'use client'

import { useMemo, useState } from 'react'
import { etiquetaColaboradorHoja, normalizarNombre, type ColaboradorHoja, type FilaEnlace } from '@/domain/colaboradores-hoja'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

const ETIQUETA_ESTADO = { exacta: 'Coincidencia exacta', ambigua: 'Ambigua', sin_coincidencia: 'Sin coincidencia' } as const

interface Props {
  filas: FilaEnlace[]
  hoja: ColaboradorHoja[]
  vincular: (uid: string, idInterno: string) => Promise<string | null>
  desvincular: (uid: string) => Promise<string | null>
  alCambiar: () => void
}

export function TablaEnlace({ filas, hoja, vincular, desvincular, alCambiar }: Props) {
  const [texto, setTexto] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [elegidos, setElegidos] = useState<Record<string, string>>({})

  const vinculadas = useMemo(() => new Set(filas.flatMap((f) => (f.id_interno ? [f.id_interno] : []))), [filas])
  const libres = useMemo(() => hoja.filter((h) => !vinculadas.has(h.id_interno)), [hoja, vinculadas])
  const opciones = useMemo(() => libres.map((h) => ({ valor: h.id_interno, etiqueta: etiquetaColaboradorHoja(h) })), [libres])
  const resumen = useMemo(() => ({
    vinculados: filas.filter((f) => f.id_interno).length,
    exactas: filas.filter((f) => f.sugerencia?.estado === 'exacta').length,
    ambiguas: filas.filter((f) => f.sugerencia?.estado === 'ambigua').length,
    sin: filas.filter((f) => f.sugerencia?.estado === 'sin_coincidencia').length,
  }), [filas])

  const visibles = useMemo(() => {
    const q = normalizarNombre(texto)
    return filas.filter((f) => (!soloPendientes || !f.id_interno) && (!q || normalizarNombre(f.nombre).includes(q)))
  }, [filas, texto, soloPendientes])

  async function ejecutar(uid: string, accion: () => Promise<string | null>) {
    setOcupado(uid)
    const fallo = await accion()
    setErrores((p) => {
      const siguiente = { ...p }
      delete siguiente[uid]
      return fallo ? { ...siguiente, [uid]: fallo } : siguiente
    })
    setOcupado(null)
    if (!fallo) alCambiar()
  }

  async function confirmarExactas() {
    setOcupado('todas')
    const nuevos: Record<string, string> = {}
    for (const f of filas.filter((x) => x.sugerencia?.estado === 'exacta')) {
      const fallo = await vincular(f.id, f.sugerencia!.candidatos[0].id_interno)
      if (fallo) nuevos[f.id] = fallo
    }
    setErrores(nuevos)
    setOcupado(null)
    alCambiar()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-texto-suave">
        {resumen.vinculados} vinculados · {resumen.exactas} con coincidencia exacta · {resumen.ambiguas} ambiguos · {resumen.sin} sin coincidencia
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar colaborador"
          aria-label="Buscar colaborador" className="control max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="casilla" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
          Solo sin vincular
        </label>
        <button type="button" onClick={() => void confirmarExactas()} disabled={resumen.exactas === 0 || ocupado !== null}
          className="boton-primario sm:ml-auto">
          {ocupado === 'todas' ? 'Vinculando...' : `Confirmar coincidencias exactas (${resumen.exactas})`}
        </button>
      </div>
      <ul className="tarjeta divide-y divide-borde">
        {visibles.length === 0 && <li className="p-4 text-sm text-texto-suave">No hay colaboradores para mostrar.</li>}
        {visibles.map((f) => {
          const sug = f.sugerencia
          const elegido = elegidos[f.id] ?? (sug?.estado === 'exacta' ? sug.candidatos[0].id_interno : '')
          return (
            <li key={f.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-medium">{f.nombre}</p>
                <p className="text-xs text-texto-suave">
                  {f.id_interno ? `Vinculado · id interno ${f.id_interno}` : sug ? ETIQUETA_ESTADO[sug.estado] : ''}
                </p>
              </div>
              {f.id_interno ? <span /> : (
                <SelectBuscable id={`enlace-${f.id}`} etiqueta={`Fila de la hoja para ${f.nombre}`} opciones={opciones}
                  valor={elegido} textoVacio="Selecciona" alCambiar={(v) => setElegidos((p) => ({ ...p, [f.id]: v }))} />
              )}
              {f.id_interno ? (
                <button type="button" disabled={ocupado !== null} onClick={() => void ejecutar(f.id, () => desvincular(f.id))}
                  className="boton-secundario">Desvincular</button>
              ) : (
                <button type="button" disabled={!elegido || ocupado !== null}
                  onClick={() => void ejecutar(f.id, () => vincular(f.id, elegido))} className="boton-primario">
                  {ocupado === f.id ? 'Vinculando...' : 'Vincular'}
                </button>
              )}
              {errores[f.id] && <div className="sm:col-span-3"><AvisoError>{errores[f.id]}</AvisoError></div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
