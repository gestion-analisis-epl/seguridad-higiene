'use client'

import { MODULO_CONFIGURACION } from '@/domain/modulos-definiciones'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { FormularioModulo } from '@/presentation/datos/FormularioModulo'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { Cargando } from '@/presentation/ui/Estado'
import { useColeccion } from '@/presentation/datos/useColeccion'

function Configuracion() {
  const { registros, cargando } = useColeccion('configuracion')
  const actual = registros.find((r) => r.id === 'indicadores')
  if (cargando) return <Cargando />
  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Administración" titulo={MODULO_CONFIGURACION.titulo}
        detalle="Metas y límites con los que se calcula el nivel de cada indicador." />
      <FormularioModulo key={actual ? 'con-datos' : 'vacio'} def={MODULO_CONFIGURACION}
        registro={actual} alTerminar={() => {}} />
    </section>
  )
}

export default function ConfiguracionPage() {
  return <RequireAcceso accion="administrar"><Configuracion /></RequireAcceso>
}
