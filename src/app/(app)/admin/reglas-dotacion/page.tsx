'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { ReglasDotacion } from '@/presentation/reglas/ReglasDotacion'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function ReglasDotacionPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Reglas de dotación"
          detalle="Uniforme y EPP obligatorios por empresa, puesto y ciudad." />
        <ReglasDotacion />
      </section>
    </RequireAcceso>
  )
}
