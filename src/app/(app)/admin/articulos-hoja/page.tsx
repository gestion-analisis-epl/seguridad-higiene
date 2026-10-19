'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { MapeoArticulos } from '@/presentation/entregas/MapeoArticulos'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function ArticulosHojaPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Artículos de la hoja"
          detalle="Relaciona cada artículo de la hoja con uniforme, EPP o equipo y con su entrada de catálogo." />
        <MapeoArticulos />
      </section>
    </RequireAcceso>
  )
}
