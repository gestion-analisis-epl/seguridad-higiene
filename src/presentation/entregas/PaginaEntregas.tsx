'use client'

import { useMemo, useState } from 'react'
import { filtrarFilas } from '@/application/entregas-agrupar'
import { puede } from '@/domain/permisos'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { SelectorColaboradorHoja } from '@/presentation/colaboradores/SelectorColaboradorHoja'
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

export function PaginaEntregas({ cfg }: { cfg: ConfiguracionPagina }) {
  const { usuario } = useSesion()
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
  const capturista = puede(usuario, 'capturar')

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
        <PanelEntrega cfg={cfg} fila={fila} items={items} registros={registros} puedeCapturar={capturista}
          puedeEliminar={puede(usuario, 'administrar')} alTerminar={() => setAbierto(null)} />
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
            {capturista && (
              <div className="tarjeta max-w-xl p-4">
                <label id="entrega-colaborador-et" htmlFor="entrega-colaborador" className="etiqueta">
                  Registrar a un colaborador de la hoja
                </label>
                <SelectorColaboradorHoja id="entrega-colaborador" etiquetaId="entrega-colaborador-et" valor=""
                  alCambiar={(uid) => { if (uid) setAbierto(uid) }} />
              </div>
            )}
            <FiltrosEntregas filtro={filtro} ciudades={ciudades} alCambiar={setFiltro} />
            <TablaEntregas cfg={cfg} filas={visibles} items={items} ciudades={ciudades}
              alAbrir={setAbierto} alNueva={capturista ? setAbierto : undefined} />
          </>
        )}
      </div>
    </section>
  )
}
