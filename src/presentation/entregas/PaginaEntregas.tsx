'use client'

import { useMemo, useState } from 'react'
import { filtrarFilas } from '@/application/entregas-agrupar'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { usePersistente } from '@/presentation/ui/usePersistente'
import type { ConfiguracionPagina } from './configuraciones'
import { etiquetaDe } from './etiquetas'
import { FiltrosEntregas } from './FiltrosEntregas'
import {
  claveFiltroEntregas, filtroEntregasEfectivo, filtroEntregasValido, filtroEntregasVacio,
} from './filtro-guardado'
import { PanelEntrega } from './PanelEntrega'
import { TablaEntregas } from './TablaEntregas'
import { useEntregas } from './useEntregas'

// Solo consulta: las entregas llegan de la hoja y se sincronizan desde Administración
export function PaginaEntregas({ cfg }: { cfg: ConfiguracionPagina }) {
  const { cargando, error, registros, filas, items, ciudades } = useEntregas(cfg)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [guardado, setFiltro] = usePersistente(
    claveFiltroEntregas(cfg.catalogo), filtroEntregasVacio, filtroEntregasValido, 'sesion',
  )
  const filtro = useMemo(
    () => filtroEntregasEfectivo(guardado, ciudades.map((c) => c.valor)), [guardado, ciudades],
  )
  const visibles = filtrarFilas(filas, filtro)
  const fila = abierto ? filas.find((f) => f.colaborador.id === abierto) : undefined

  const volver = (
    <button type="button" onClick={() => setAbierto(null)} className="boton-secundario">
      <Icono nombre="volver" />
      Volver a la lista
    </button>
  )

  if (fila) {
    return (
      <section className="aparecer">
        <EncabezadoPagina rotulo={cfg.titulo} titulo={fila.colaborador.nombre}
          detalle={`${etiquetaDe(ciudades, fila.colaborador.ciudad)}, ${fila.cantidadEntregas === 1 ? '1 entrega' : `${fila.cantidadEntregas} entregas`}`}
          acciones={volver} />
        <PanelEntrega cfg={cfg} fila={fila} items={items} registros={registros} />
      </section>
    )
  }

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
              alAbrir={setAbierto} />
          </>
        )}
      </div>
    </section>
  )
}
