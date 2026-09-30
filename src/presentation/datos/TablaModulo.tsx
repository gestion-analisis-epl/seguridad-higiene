'use client'

import { useMemo } from 'react'
import { formatearValor, type CampoDef, type ModuloDef, type Opcion, type Valor } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { Icono } from '@/presentation/ui/Icono'
import { ordenarRegistros } from './orden'
import { useOpcionesDeCampos } from './useOpcionesDeCampos'

function Celda({ campo, valor, opciones, editable }: {
  campo: CampoDef; valor: unknown; opciones: Opcion[]; editable: boolean
}) {
  const texto = formatearValor(campo, valor as Valor, opciones)
  const alinear = campo.tipo === 'numero' ? 'text-right' : ''
  if (!editable) return <td className={`whitespace-nowrap ${alinear}`}>{texto}</td>
  // El clic del botón (ratón, Enter o Espacio) burbujea al onClick de la fila
  return (
    <td className="whitespace-nowrap">
      <button type="button" className="inline-flex items-center gap-2 rounded font-medium text-texto underline-offset-2 hover:underline">
        <Icono nombre="editar" className="h-3.5 w-3.5 text-texto-suave" />
        <span>{texto || 'Sin dato'}</span>
        <span className="sr-only">, editar registro</span>
      </button>
    </td>
  )
}

export function TablaModulo({ def, registros, alSeleccionar }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
}) {
  const campos = useMemo(() => def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!), [def])
  const opciones = useOpcionesDeCampos(campos)
  const filas = useMemo(() => ordenarRegistros(def, registros, opciones), [def, registros, opciones])
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            {campos.map((c) => (
              <th key={c.nombre} scope="col" className={c.tipo === 'numero' ? 'text-right' : ''}>{c.etiqueta}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={campos.length} className="py-10 text-center text-texto-suave">Sin registros</td></tr>
          )}
          {filas.map((r) => (
            <tr key={r.id} onClick={alSeleccionar ? () => alSeleccionar(r) : undefined}
              className={alSeleccionar
                ? 'cursor-pointer transition-colors hover:bg-superficie-2 focus-within:bg-superficie-2'
                : undefined}>
              {campos.map((c, i) => (
                <Celda key={c.nombre} campo={c} valor={r[c.nombre]} opciones={opciones[c.nombre] ?? []}
                  editable={!!alSeleccionar && i === 0} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
