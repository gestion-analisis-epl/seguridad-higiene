'use client'

import type { ModuloDef, Valores } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { FormularioModulo } from '@/presentation/datos/FormularioModulo'
import { Dialogo } from '@/presentation/ui/Dialogo'

// El formulario de siempre del módulo, sin salir de la ficha
export function FormularioDialogo({ def, registro, inicial, alCerrar }: {
  def: ModuloDef
  registro?: Registro
  inicial?: Valores
  alCerrar: () => void
}) {
  return (
    <Dialogo titulo={`${registro ? 'Editar' : 'Nuevo'} · ${def.titulo}`} alCerrar={alCerrar}>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <FormularioModulo def={def} registro={registro} inicial={inicial} alTerminar={alCerrar} />
      </div>
    </Dialogo>
  )
}
