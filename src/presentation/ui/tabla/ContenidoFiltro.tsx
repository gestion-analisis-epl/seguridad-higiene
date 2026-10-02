'use client'

import { useId } from 'react'
import { InputFecha } from '../InputFecha'
import { PanelOpciones } from '../PanelOpciones'
import type { OpcionSeleccion } from '../seleccion'
import type { Filtro, TipoColumna } from './logica'

interface Props {
  tipo: TipoColumna
  encabezado: string
  filtro: Filtro | undefined
  opciones: OpcionSeleccion[]
  alCambiar: (filtro: Filtro | null) => void
}

const aNumero = (texto: string) => (texto.trim() === '' || Number.isNaN(Number(texto)) ? null : Number(texto))

function BotonLimpiar({ alLimpiar }: { alLimpiar: () => void }) {
  return (
    <button type="button" onClick={alLimpiar} className="self-start rounded px-1 py-1.5 text-xs font-medium underline underline-offset-2 hover:bg-superficie-2">
      Limpiar
    </button>
  )
}

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      {children}
    </div>
  )
}

export function ContenidoFiltro({ tipo, encabezado, filtro, opciones, alCambiar }: Props) {
  const id = useId()
  const limpiar = () => alCambiar(null)

  const ocultos = filtro?.tipo === 'categoria' || filtro?.tipo === 'texto' ? filtro.ocultos ?? [] : []
  const lista = (enfocar: boolean) => (
    <PanelOpciones
      etiqueta={encabezado} opciones={opciones}
      seleccion={opciones.filter((o) => !ocultos.includes(o.valor)).map((o) => o.valor)}
      buscarSelecciona textoMarcar="Mostrar todo" textoDesmarcar="Ocultar todo" enfocar={enfocar}
      alCambiar={(sel) => {
        const nuevos = opciones.filter((o) => !sel.includes(o.valor)).map((o) => o.valor)
        alCambiar(tipo === 'texto'
          ? { tipo: 'texto', texto: filtro?.tipo === 'texto' ? filtro.texto : '', ocultos: nuevos }
          : { tipo: 'categoria', ocultos: nuevos })
      }}
    />
  )

  if (tipo === 'categoria') return lista(true)

  if (tipo === 'texto') {
    return (
      <div className="flex min-h-0 flex-col">
        <div className="flex flex-col gap-1 border-b border-borde p-3">
          <Campo id={`${id}-t`} etiqueta="Contiene">
            <input
              id={`${id}-t`} type="search" autoFocus autoComplete="off" className="control"
              value={filtro?.tipo === 'texto' ? filtro.texto : ''}
              onChange={(e) => alCambiar({ tipo: 'texto', texto: e.target.value, ocultos })}
            />
          </Campo>
          <BotonLimpiar alLimpiar={limpiar} />
        </div>
        {lista(false)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      {tipo === 'numero' && (() => {
        const f = filtro?.tipo === 'numero' ? filtro : { tipo: 'numero' as const, min: null, max: null }
        return (
          <div className="grid grid-cols-2 gap-2">
            <Campo id={`${id}-min`} etiqueta="Mínimo">
              <input id={`${id}-min`} type="number" inputMode="decimal" autoFocus className="control" value={f.min ?? ''}
                onChange={(e) => alCambiar({ ...f, min: aNumero(e.target.value) })} />
            </Campo>
            <Campo id={`${id}-max`} etiqueta="Máximo">
              <input id={`${id}-max`} type="number" inputMode="decimal" className="control" value={f.max ?? ''}
                onChange={(e) => alCambiar({ ...f, max: aNumero(e.target.value) })} />
            </Campo>
          </div>
        )
      })()}
      {tipo === 'fecha' && (() => {
        const f = filtro?.tipo === 'fecha' ? filtro : { tipo: 'fecha' as const, desde: '', hasta: '' }
        return (
          <div className="grid gap-2 min-[400px]:grid-cols-2">
            <Campo id={`${id}-d`} etiqueta="Desde">
              <InputFecha id={`${id}-d`} autoFocus className="control" valor={f.desde}
                alCambiar={(t) => alCambiar({ ...f, desde: t })} />
            </Campo>
            <Campo id={`${id}-h`} etiqueta="Hasta">
              <InputFecha id={`${id}-h`} className="control" valor={f.hasta}
                alCambiar={(t) => alCambiar({ ...f, hasta: t })} />
            </Campo>
          </div>
        )
      })()}
      {tipo === 'booleano' && (
        <fieldset className="flex flex-col gap-1">
          <legend className="etiqueta">Mostrar</legend>
          {([['todos', 'Todos'], ['si', 'Sí'], ['no', 'No']] as const).map(([clave, texto]) => {
            const actual = filtro?.tipo === 'booleano' ? (filtro.valor ? 'si' : 'no') : 'todos'
            return (
              <label key={clave} className="flex min-h-[2.5rem] cursor-pointer items-center gap-3 rounded px-1 hover:bg-superficie-2">
                <input
                  type="radio" name={`${id}-b`} autoFocus={actual === clave} className="casilla"
                  checked={actual === clave}
                  onChange={() => alCambiar(clave === 'todos' ? null : { tipo: 'booleano', valor: clave === 'si' })}
                />
                {texto}
              </label>
            )
          })}
        </fieldset>
      )}
      {tipo !== 'booleano' && <BotonLimpiar alLimpiar={limpiar} />}
    </div>
  )
}
