'use client'

import { useMemo } from 'react'
import { acumuladoAnual, comparativoCiudades, serieMensual } from '@/application/dashboard'
import type { Accidente, Poblacion } from '@/domain/entidades'
import { clasificarIli } from '@/domain/indicadores'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useConfigIndicadores } from '@/presentation/datos/useConfigIndicadores'
import { GraficaBarrasApiladas } from '@/presentation/graficas/GraficaBarrasApiladas'
import { GraficaLinea } from '@/presentation/graficas/GraficaLinea'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { DataTable } from '@/presentation/ui/tabla'
import { atributosNivel, columnasComparativo } from './columnas-analitico'
import { celdaNivel, columnasMensualUi, conCeldas } from './celdas'
import { AvisoSinCiudades, FiltroCiudades } from './FiltroCiudades'
import { FiltrosAnaliticos } from './FiltrosAnaliticos'
import { MESES } from './formato'
import { filasMensuales } from './mensual'
import { TarjetasIndicadores } from './TarjetasIndicadores'
import { useFiltroCiudades } from './useFiltroCiudades'
import { usePersistente } from '@/presentation/ui/usePersistente'
import { CLAVE_ANIO, anioGuardadoValido } from './anio-guardado'

export function DashboardAnalitico() {
  const cfg = useConfigIndicadores()
  const filtro = useFiltroCiudades()
  const { ciudades, etiqueta } = filtro
  const accidentesFuente = useColeccion('accidentes')
  const poblacionesFuente = useColeccion('indicadores_mensuales')
  const [anioGuardado, setAnio] = usePersistente<number | null>(CLAVE_ANIO, null, anioGuardadoValido, 'sesion')
  const anio = anioGuardado ?? new Date().getFullYear()

  const accidentes = accidentesFuente.registros as unknown as Accidente[]
  const poblaciones = poblacionesFuente.registros as unknown as Poblacion[]
  const serie = useMemo(() => serieMensual(accidentes, poblaciones, cfg, anio, ciudades), [accidentes, poblaciones, cfg, anio, ciudades])
  const anual = useMemo(() => acumuladoAnual(serie, cfg), [serie, cfg])
  const comparativo = useMemo(
    () => comparativoCiudades(accidentes, poblaciones, cfg, anio, filtro.seleccion),
    [accidentes, poblaciones, cfg, anio, filtro.seleccion],
  )
  const filasMes = useMemo(() => filasMensuales(serie, cfg), [serie, cfg])
  const colsComparativo = useMemo(() => conCeldas(columnasComparativo(etiqueta), celdaNivel), [etiqueta])
  const nivel = clasificarIli(anual.ili, cfg)

  if (accidentesFuente.cargando || poblacionesFuente.cargando) return <Cargando />
  const error = accidentesFuente.error ?? poblacionesFuente.error
  if (error) return <AvisoError>{error}</AvisoError>

  return (
    <div className="aparecer">
      <EncabezadoPagina rotulo="Analítico" titulo="Accidentabilidad" />
      <FiltrosAnaliticos anio={anio} alCambiarAnio={setAnio}>
        <FiltroCiudades opciones={filtro.opciones} seleccion={filtro.seleccion} alCambiar={filtro.cambiar} />
      </FiltrosAnaliticos>
      {ciudades !== undefined && ciudades.length === 0 ? <AvisoSinCiudades /> : <>
      <TarjetasIndicadores anual={anual} nivel={nivel} />

      <div className="grid gap-3 lg:grid-cols-2">
        <GraficaBarrasApiladas
          titulo="Accidentes por mes"
          datos={serie.map((p, i) => ({ etiqueta: MESES[i], valores: [p.laboral, p.trayecto] }))}
          series={[
            { etiqueta: 'Laboral (entra al ILI)', color: 'var(--serie-laboral)' },
            { etiqueta: 'Trayecto (informativo)', color: 'var(--serie-trayecto)' },
          ]}
        />
        <GraficaLinea
          titulo="ILI mensual"
          etiquetas={MESES}
          valores={serie.map((p) => p.ili)}
          decimales={3}
          referencias={[
            { valor: cfg.umbralMeta, etiqueta: 'Meta' },
            { valor: cfg.referenciaInterpretacion, etiqueta: 'Interpretación' },
          ]}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-base">Detalle mensual ({anio})</h2>
        <p className="mb-3 text-sm text-texto-suave">Los índices consideran solo accidentes laborales; trayecto es informativo.</p>
        <DataTable columnas={columnasMensualUi} filas={filasMes} idFila={(f) => f.periodo} atributosFila={atributosNivel}
          vacio="Sin datos" etiqueta="Detalle mensual" claveAnchos="dashboard-mensual" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base">Comparativo entre ciudades ({anio})</h2>
        <DataTable columnas={colsComparativo} filas={comparativo} idFila={(f) => f.ciudad} atributosFila={atributosNivel}
          vacio="Sin ciudades" etiqueta="Comparativo entre ciudades" claveAnchos="dashboard-comparativo" />
      </section>
      </>}
    </div>
  )
}
