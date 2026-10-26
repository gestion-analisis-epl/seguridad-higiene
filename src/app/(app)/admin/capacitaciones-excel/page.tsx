'use client'

import { ImportarCapacitaciones } from '@/presentation/capacitaciones/ImportarCapacitaciones'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function CapacitacionesExcelPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Importar capacitaciones"
          detalle="Actualiza las capacitaciones desde el Excel de seguimiento; el dato más reciente de cada persona y nunca retrocede una fecha." />
        <ImportarCapacitaciones />
      </section>
    </RequireAcceso>
  )
}
