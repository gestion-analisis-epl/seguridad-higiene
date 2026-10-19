'use client'

import { useMemo, type ReactNode } from 'react'
import { alertasVencimiento, type Alerta, pendientesPorColaborador, resumenGlobal, resumenPorCiudad } from '@/application/dashboard'
import { filtrarPorCiudades } from '@/application/dashboard-filtro'
import { faltantesPorArticulo } from '@/application/dashboard-graficas'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { DataTable } from '@/presentation/ui/tabla'
import { columnasAlertas, atributosAlerta, columnasPendientes, columnasPorCiudad } from './columnas-operativo'
import { celdasAlertas, celdasPendientes, conCeldas } from './celdas'
import { AvisoSinCiudades, FiltroCiudades } from './FiltroCiudades'
import { BarrasCiudad } from './graficas/BarrasCiudad'
import { TopFaltantes } from './graficas/TopFaltantes'
import { TarjetasResumen } from './TarjetasResumen'
import { useReglas } from '@/presentation/datos/useReglas'
import { useDatosOperativos } from './useDatosOperativos'
import { useFiltroCiudades } from './useFiltroCiudades'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base">{titulo}</h2>
      {children}
    </section>
  )
}

export function DashboardOperativo() {
  const { cargando, error, datos: todos } = useDatosOperativos()
  const filtro = useFiltroCiudades()
  const { etiqueta, ciudades } = filtro
  const { reglas, cargando: cargandoReglas, error: errorReglas } = useReglas()
  const hoy = useMemo(() => new Date(), [])

  const datos = useMemo(() => filtrarPorCiudades(todos, ciudades), [todos, ciudades])
  const resumen = useMemo(() => resumenGlobal(datos, hoy, reglas), [datos, hoy, reglas])
  const porCiudad = useMemo(() => resumenPorCiudad(datos, hoy, reglas), [datos, hoy, reglas])
  const alertas = useMemo(() => alertasVencimiento(datos, hoy).map((a, i) => ({ ...a, id: String(i) })), [datos, hoy])
  const pendientes = useMemo(() => pendientesPorColaborador(datos, hoy, reglas), [datos, hoy, reglas])
  const faltantes = useMemo(() => faltantesPorArticulo(pendientes), [pendientes])
  const colsAlertas =useMemo(() => conCeldas(columnasAlertas<Alerta & { id: string }>(etiqueta), celdasAlertas), [etiqueta])
  const colsPendientes = useMemo(() => conCeldas(columnasPendientes(etiqueta), celdasPendientes), [etiqueta])
  const colsCiudad = useMemo(() => columnasPorCiudad(etiqueta), [etiqueta])

  if (cargando || cargandoReglas) return <Cargando />
  const fallo = error ?? errorReglas
  if (fallo) return <AvisoError>{fallo}</AvisoError>

  const sinCiudades = ciudades !== undefined && ciudades.length === 0

  return (
    <div className="aparecer">
      <EncabezadoPagina rotulo="Operativo" titulo="Estado operativo" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <FiltroCiudades opciones={filtro.opciones} seleccion={filtro.seleccion} alCambiar={filtro.cambiar} />
      </div>
      {!sinCiudades && <TarjetasResumen resumen={resumen} alertas={alertas} />}
      {sinCiudades ? <AvisoSinCiudades /> : (
        <>
          <div className="mb-2 grid gap-3 lg:grid-cols-2">
            <BarrasCiudad filas={porCiudad} etiqueta={etiqueta} />
            <TopFaltantes faltantes={faltantes} />
          </div>
          <Seccion titulo="Vencimientos en los próximos 30 días">
            <DataTable columnas={colsAlertas} filas={alertas} idFila={(a) => a.id}
              atributosFila={atributosAlerta} vacio="Sin vencimientos próximos." etiqueta="Vencimientos próximos" claveAnchos="dashboard-alertas" />
          </Seccion>
          <Seccion titulo="Colaboradores con pendientes">
            <DataTable columnas={colsPendientes} filas={pendientes} idFila={(p) => p.colaborador.id}
              vacio="Sin pendientes." etiqueta="Colaboradores con pendientes" claveAnchos="dashboard-pendientes" />
          </Seccion>
          <details className="mt-8">
            <summary className="cursor-pointer text-base">Detalle por ciudad</summary>
            <div className="mt-3">
              <DataTable columnas={colsCiudad} filas={porCiudad} idFila={(r) => r.ciudad}
                vacio="Sin colaboradores activos." etiqueta="Cumplimiento por ciudad" claveAnchos="dashboard-por-ciudad" />
            </div>
          </details>
        </>
      )}
    </div>
  )
}
