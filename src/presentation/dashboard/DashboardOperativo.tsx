'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { alertasVencimiento, evaluacionColaboradores, type Alerta, type Pendiente, pendientesPorColaborador, resumenGlobal, resumenPorCiudad } from '@/application/dashboard'
import type { Opcion } from '@/domain/modulos'
import { filtrarPorCiudades } from '@/application/dashboard-filtro'
import { faltantesPorArticulo, pendientesDeFaltante, poblacionDeIndicador, type Faltante, type Indicador } from '@/application/dashboard-graficas'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { DataTable } from '@/presentation/ui/tabla'
import { columnasAlertas, atributosAlerta, columnasPendientes, columnasPorCiudad } from './columnas-operativo'
import { celdasAlertas, celdasPendientes, conCeldas } from './celdas'
import { DetalleDialogo } from './DetalleDialogo'
import { AvisoSinCiudades, FiltroCiudades } from './FiltroCiudades'
import { BarrasCiudad } from './graficas/BarrasCiudad'
import { TopFaltantes } from './graficas/TopFaltantes'
import { TarjetasResumen, type TarjetaElegida } from './TarjetasResumen'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
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
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const areas = useCatalogo('areas')
  const cuadrillas = useCatalogo('cuadrillas')
  const [detalle, setDetalle] = useState<{ titulo: string; filas: Pendiente[] } | { titulo: string; filas?: undefined } | null>(null)
  const hoy = useMemo(() => new Date(), [])
  const etiquetaArticulo = useCallback(
    (valor: string) => [...prendas, ...tiposEpp].find((o) => o.valor === valor)?.etiqueta ?? valor.replace(/-/g, ' '),
    [prendas, tiposEpp],
  )

  const datos = useMemo(() => filtrarPorCiudades(todos, ciudades), [todos, ciudades])
  const resumen = useMemo(() => resumenGlobal(datos, hoy, reglas), [datos, hoy, reglas])
  const porCiudad = useMemo(() => resumenPorCiudad(datos, hoy, reglas), [datos, hoy, reglas])
  const alertas = useMemo(() => alertasVencimiento(datos, hoy).map((a, i) => ({ ...a, id: String(i) })), [datos, hoy])
  const pendientes = useMemo(() => pendientesPorColaborador(datos, hoy, reglas), [datos, hoy, reglas])
  const evaluacion = useMemo(() => evaluacionColaboradores(datos, hoy, reglas), [datos, hoy, reglas])
  const faltantes = useMemo(() => faltantesPorArticulo(pendientes), [pendientes])
  const colsAlertas =useMemo(() => conCeldas(columnasAlertas<Alerta & { id: string }>(etiqueta), celdasAlertas), [etiqueta])
  const etiquetaDe = useCallback(
    (opciones: Opcion[]) => (valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor,
    [],
  )
  const colsPendientes = useMemo(() => conCeldas(
    columnasPendientes(etiqueta, { articulo: etiquetaArticulo, area: etiquetaDe(areas), cuadrilla: etiquetaDe(cuadrillas) }), celdasPendientes,
  ), [etiqueta, etiquetaArticulo, etiquetaDe, areas, cuadrillas])
  const colsCiudad = useMemo(() => columnasPorCiudad(etiqueta), [etiqueta])

  const verFaltante = (f: Faltante) => setDetalle({ titulo: etiquetaArticulo(f.articulo), filas: pendientesDeFaltante(pendientes, f) })
  const verIndicador = (titulo: string, indicador: Indicador, ciudad?: string) => setDetalle({
    titulo, filas: poblacionDeIndicador(evaluacion, indicador).filter((e) => ciudad === undefined || e.colaborador.ciudad === ciudad),
  })
  const verTarjeta = (t: TarjetaElegida) => {
    if (t === 'vencimientos') setDetalle({ titulo: 'Vencimientos próximos' })
    else if (t === 'activos') setDetalle({ titulo: 'Colaboradores activos', filas: evaluacion })
    else if (t === 'sinRegla') setDetalle({ titulo: 'Sin regla de dotación', filas: evaluacion.filter((e) => e.sinRegla) })
    else verIndicador({ capacitacion: 'Capacitación vigente', uniforme: 'Uniforme completo', epp: 'EPP completo' }[t], t)
  }

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
      {!sinCiudades && <TarjetasResumen resumen={resumen} alertas={alertas} alElegir={verTarjeta} />}
      {sinCiudades ? <AvisoSinCiudades /> : (
        <>
          <div className="mb-2 grid gap-3 lg:grid-cols-2">
            <BarrasCiudad filas={porCiudad} etiqueta={etiqueta}
              alElegir={(ciudad, i) => verIndicador(`${i.texto} · ${etiqueta(ciudad)}`, i.poblacion, ciudad)} />
            <TopFaltantes faltantes={faltantes} etiquetaArticulo={etiquetaArticulo} alElegir={verFaltante} />
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
      {detalle && (detalle.filas ? (
        <DetalleDialogo titulo={detalle.titulo} unidad="colaboradores" filas={detalle.filas} columnas={colsPendientes}
          idFila={(p) => p.colaborador.id} alCerrar={() => setDetalle(null)} />
      ) : (
        <DetalleDialogo titulo={detalle.titulo} unidad="vencimientos" filas={alertas} columnas={colsAlertas}
          idFila={(a) => a.id} alCerrar={() => setDetalle(null)} />
      ))}
    </div>
  )
}
