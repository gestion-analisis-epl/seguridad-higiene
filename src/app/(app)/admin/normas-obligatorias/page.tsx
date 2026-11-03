'use client'

import { AsignarNormas } from '@/presentation/capacitaciones/AsignarNormas'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function NormasObligatoriasPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Normas obligatorias"
          detalle="Define desde el Excel qué capacitaciones debe tener cada colaborador: X es obligatoria y N/A no aplica. Quien no aparece no se evalúa." />
        <AsignarNormas />
      </section>
    </RequireAcceso>
  )
}
