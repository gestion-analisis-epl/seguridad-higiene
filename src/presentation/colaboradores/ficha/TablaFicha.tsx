'use client'

import { useMemo } from 'react'
import type { ModuloDef } from '@/domain/modulos'
import { aOracion } from '@/domain/texto'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { columnasDeModulo } from '@/presentation/datos/columnas-modulo'
import { ordenarRegistros } from '@/presentation/datos/orden'
import { useOpcionesDeCampos } from '@/presentation/datos/useOpcionesDeCampos'
import { DataTable } from '@/presentation/ui/tabla'

const idRegistro = (r: Registro) => r.id

// Los registros de un módulo para un solo colaborador, sin la columna del colaborador
export function TablaFicha({ def, registros, alSeleccionar }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
}) {
  const campos = useMemo(() => def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!), [def])
  const opciones = useOpcionesDeCampos(campos)
  const columnas = useMemo(() => columnasDeModulo(def, opciones).filter((c) => c.id !== 'colaborador_id').map((c) => ({
    ...c, valor: (r: Registro) => { const v = c.valor(r); return typeof v === 'string' ? aOracion(v) : v },
  })), [def, opciones])
  const filas = useMemo(() => ordenarRegistros(def, registros, opciones), [def, registros, opciones])
  return (
    <DataTable columnas={columnas} filas={filas} idFila={idRegistro} alSeleccionarFila={alSeleccionar}
      vacio="Sin registros" etiqueta={def.titulo} claveAnchos={`ficha-${def.id}`} />
  )
}
