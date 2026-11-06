'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { filtrarFilas } from '@/application/entregas-agrupar'
import { rutaColaborador } from '@/presentation/navegacion/enlaces'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { usePersistente } from '@/presentation/ui/usePersistente'
import type { ConfiguracionPagina } from './configuraciones'
import { FiltrosEntregas } from './FiltrosEntregas'
import {
  claveFiltroEntregas, filtroEntregasEfectivo, filtroEntregasValido, filtroEntregasVacio,
} from './filtro-guardado'
import { TablaEntregas } from './TablaEntregas'
import { useEntregas } from './useEntregas'

// Solo consulta: las entregas llegan de la hoja y el detalle de cada persona está en su ficha
export function PaginaEntregas({ cfg }: { cfg: ConfiguracionPagina }) {
  const router = useRouter()
  const { cargando, error, filas, items, ciudades } = useEntregas(cfg)
  const [guardado, setFiltro] = usePersistente(
    claveFiltroEntregas(cfg.catalogo), filtroEntregasVacio, filtroEntregasValido, 'sesion',
  )
  const filtro = useMemo(
    () => filtroEntregasEfectivo(guardado, ciudades.map((c) => c.valor)), [guardado, ciudades],
  )
  const visibles = filtrarFilas(filas, filtro)

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Registros" titulo={cfg.titulo}
        detalle={cargando ? undefined : `${visibles.length} de ${filas.length} colaboradores`} />
      <div className="space-y-4">
        {error && <AvisoError>{error}</AvisoError>}
        {cargando ? <Cargando /> : (
          <>
            <FiltrosEntregas filtro={filtro} ciudades={ciudades} alCambiar={setFiltro} />
            <TablaEntregas cfg={cfg} filas={visibles} items={items} ciudades={ciudades}
              alAbrir={(id) => router.push(rutaColaborador(id))} />
          </>
        )}
      </div>
    </section>
  )
}
