'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { TablaEnlace } from '@/presentation/colaboradores/TablaEnlace'
import { useEnlace } from '@/presentation/colaboradores/useEnlace'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'

function Enlace() {
  const { filas, hoja, cargando, error, recargar, vincular, desvincular } = useEnlace()
  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Administración" titulo="Enlace de colaboradores"
        detalle="Vincula a los colaboradores actuales con su fila de la hoja; no se modifica ningún registro existente."
        acciones={<button type="button" onClick={() => void recargar(true)} disabled={cargando} className="boton-secundario">Recargar</button>} />
      {error && <div className="mb-4"><AvisoError>{error}</AvisoError></div>}
      {cargando && filas.length === 0 ? <Cargando /> : (
        <TablaEnlace filas={filas} hoja={hoja} vincular={vincular} desvincular={desvincular} alCambiar={() => void recargar()} />
      )}
    </section>
  )
}

export default function ColaboradoresEnlacePage() {
  return <RequireAcceso accion="administrar"><Enlace /></RequireAcceso>
}
