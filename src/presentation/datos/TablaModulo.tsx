'use client'

import { useMemo } from 'react'
import type { ModuloDef } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { DataTable } from '@/presentation/ui/tabla'
import { columnasDeModulo } from './columnas-modulo'
import { ordenarRegistros } from './orden'
import { useOpcionesDeCampos } from './useOpcionesDeCampos'

const idRegistro = (r: Registro) => r.id

export function TablaModulo({ def, registros, alSeleccionar }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
}) {
  const campos = useMemo(() => def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!), [def])
  const opciones = useOpcionesDeCampos(campos)
  const columnas = useMemo(() => columnasDeModulo(def, opciones), [def, opciones])
  const filas = useMemo(() => ordenarRegistros(def, registros, opciones), [def, registros, opciones])
  return (
    <DataTable columnas={columnas} filas={filas} idFila={idRegistro} alSeleccionarFila={alSeleccionar}
      vacio="Sin registros" etiqueta={def.titulo} claveAnchos={`tabla-${def.id}`} />
  )
}
