'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { alertasVencimiento, pendientesPorColaborador, resumenPorCiudad } from '@/application/dashboard'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { FiltrosPendientes, type ValoresFiltro } from './FiltrosPendientes'
import { TablaAlertas } from './TablaAlertas'
import { TablaPendientes } from './TablaPendientes'
import { TarjetasCiudad } from './TarjetasCiudad'
import { useDatosOperativos } from './useDatosOperativos'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8 first-of-type:mt-0">
      <h2 className="mb-3 text-base">{titulo}</h2>
      {children}
    </section>
  )
}

export function DashboardOperativo() {
  const { cargando, error, datos } = useDatosOperativos()
  const ciudades = useCatalogo('ciudades')
  const [filtro, setFiltro] = useState<ValoresFiltro>({ ciudad: '', area: '', cuadrilla: '' })
  const etiqueta = (valor: string) => ciudades.find((c) => c.valor === valor)?.etiqueta ?? valor
  const hoy = useMemo(() => new Date(), [])

  const resumen = useMemo(() => resumenPorCiudad(datos, hoy), [datos, hoy])
  const alertas = useMemo(() => alertasVencimiento(datos, hoy), [datos, hoy])
  const pendientes = useMemo(
    () => pendientesPorColaborador(datos, hoy).filter((p) =>
      (!filtro.ciudad || p.colaborador.ciudad === filtro.ciudad)
      && (!filtro.area || p.colaborador.area === filtro.area)
      && (!filtro.cuadrilla || p.colaborador.cuadrilla === filtro.cuadrilla)),
    [datos, hoy, filtro],
  )
  const areas = Array.from(new Set(datos.colaboradores.map((c) => c.area).filter(Boolean))) as string[]
  const cuadrillas = Array.from(new Set(datos.colaboradores.map((c) => c.cuadrilla).filter(Boolean))) as string[]

  if (cargando) return <Cargando />
  if (error) return <AvisoError>{error}</AvisoError>

  return (
    <div className="aparecer">
      <EncabezadoPagina rotulo="Operativo" titulo="Estado operativo" />

      <Seccion titulo="Cumplimiento por ciudad">
        <TarjetasCiudad resumen={resumen} etiqueta={etiqueta} />
      </Seccion>

      <Seccion titulo="Vencimientos en los próximos 30 días">
        <TablaAlertas alertas={alertas} etiqueta={etiqueta} />
      </Seccion>

      <Seccion titulo="Colaboradores con pendientes">
        <FiltrosPendientes valores={filtro} ciudades={ciudades} areas={areas} cuadrillas={cuadrillas}
          alCambiar={(campo, valor) => setFiltro((f) => ({ ...f, [campo]: valor }))} />
        <TablaPendientes pendientes={pendientes} etiqueta={etiqueta} />
      </Seccion>
    </div>
  )
}
