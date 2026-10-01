'use client'

import { useMemo } from 'react'
import type { FilaEntrega } from '@/application/entregas-agrupar'
import type { Opcion } from '@/domain/modulos'
import { Icono } from '@/presentation/ui/Icono'
import { DataTable } from '@/presentation/ui/tabla'
import { FILTRO_ESTADO_ACTIVO } from '@/presentation/ui/tabla/filtros-estado'
import type { ColumnaTabla } from '@/presentation/ui/tabla'
import { CeldaEntrega } from './CeldaEntrega'
import { ID_COLUMNA_ESTADO_ENTREGAS, columnasDeEntregas } from './columnas-entregas'
import type { ConfiguracionPagina } from './configuraciones'

const FILTROS_INICIALES = { [ID_COLUMNA_ESTADO_ENTREGAS]: FILTRO_ESTADO_ACTIVO }
const idFila = (f: FilaEntrega) => f.colaborador.id

export function TablaEntregas({ cfg, filas, items, ciudades, alAbrir, alNueva }: {
  cfg: ConfiguracionPagina
  filas: FilaEntrega[]
  items: Opcion[]
  ciudades: Opcion[]
  alAbrir: (colaboradorId: string) => void
  alNueva?: (colaboradorId: string) => void
}) {
  const hoy = useMemo(() => new Date(), [])
  const columnas = useMemo(() => columnasDeEntregas(cfg.config, items, ciudades, hoy).map((c): ColumnaTabla<FilaEntrega> => {
    if (c.id === 'acciones') {
      return { ...c, celda: (f) => alNueva && (
        <button type="button" className="boton-secundario !min-h-[2rem] !px-3" onClick={() => alNueva(f.colaborador.id)}>
          <Icono nombre="mas" className="h-3.5 w-3.5" />
          Nueva entrega
          <span className="sr-only"> para {f.colaborador.nombre}</span>
        </button>
      ) }
    }
    if (items.some((i) => i.valor === c.id)) {
      return { ...c, celda: (f) => <CeldaEntrega config={cfg.config} registro={f.ultimas[c.id]} hoy={hoy} /> }
    }
    return c
  }), [cfg.config, items, ciudades, hoy, alNueva])
  return (
    <DataTable columnas={columnas} filas={filas} idFila={idFila} alSeleccionarFila={(f) => alAbrir(f.colaborador.id)}
      vacio="Sin colaboradores" etiqueta={cfg.titulo} claveAnchos={`tabla-entregas-${cfg.titulo}`}
      textoAccionFila="ver entregas" filtrosIniciales={FILTROS_INICIALES} />
  )
}
