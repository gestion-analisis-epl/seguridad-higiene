'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { SincronizacionEntregas } from '@/presentation/entregas/SincronizacionEntregas'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function EntregasHojaPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Sincronizar entregas"
          detalle="Trae a la app las entregas de uniforme, EPP y equipo de la pestaña de la hoja; no borra lo ya importado." />
        <SincronizacionEntregas />
      </section>
    </RequireAcceso>
  )
}
