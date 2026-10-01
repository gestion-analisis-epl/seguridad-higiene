'use client'

import { useMemo, useState } from 'react'
import { acumuladoAnual, comparativoCiudades, serieMensual } from '@/application/dashboard'
import type { Accidente, Poblacion } from '@/domain/entidades'
import { clasificarIli } from '@/domain/indicadores'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useConfigIndicadores } from '@/presentation/datos/useConfigIndicadores'
import { GraficaBarrasApiladas } from '@/presentation/graficas/GraficaBarrasApiladas'
import { GraficaLinea } from '@/presentation/graficas/GraficaLinea'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { FiltrosAnaliticos } from './FiltrosAnaliticos'
import { MESES } from './formato'
import { TablaComparativo } from './TablaComparativo'
import { TablaMensual } from './TablaMensual'
import { TarjetasIndicadores } from './TarjetasIndicadores'

export function DashboardAnalitico() {
  const cfg = useConfigIndicadores()
  const ciudades = useCatalogo('ciudades')
  const accidentesFuente = useColeccion('accidentes')
  const poblacionesFuente = useColeccion('indicadores_mensuales')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [ciudad, setCiudad] = useState('')

  const accidentes = accidentesFuente.registros as unknown as Accidente[]
  const poblaciones = poblacionesFuente.registros as unknown as Poblacion[]
  const serie = useMemo(() => serieMensual(accidentes, poblaciones, cfg, anio, ciudad ? [ciudad] : undefined), [accidentes, poblaciones, cfg, anio, ciudad])
  const anual = useMemo(() => acumuladoAnual(serie, cfg), [serie, cfg])
  const comparativo = useMemo(
    () => comparativoCiudades(accidentes, poblaciones, cfg, anio, ciudades.map((c) => c.valor)),
    [accidentes, poblaciones, cfg, anio, ciudades],
  )
  const etiqueta = (valor: string) => ciudades.find((c) => c.valor === valor)?.etiqueta ?? valor
  const nivel = clasificarIli(anual.ili, cfg)

  if (accidentesFuente.cargando || poblacionesFuente.cargando) return <Cargando />
  const error = accidentesFuente.error ?? poblacionesFuente.error
  if (error) return <AvisoError>{error}</AvisoError>

  return (
    <div className="aparecer">
      <EncabezadoPagina rotulo="Analítico" titulo="Accidentabilidad" />
      <FiltrosAnaliticos anio={anio} ciudad={ciudad} ciudades={ciudades} alCambiarAnio={setAnio} alCambiarCiudad={setCiudad} />
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
        <TablaMensual serie={serie} cfg={cfg} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base">Comparativo entre ciudades ({anio})</h2>
        <TablaComparativo filas={comparativo} etiqueta={etiqueta} />
      </section>
    </div>
  )
}
