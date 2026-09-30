'use client'

import { useState } from 'react'
import { puede } from '@/domain/permisos'
import type { ModuloDef } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { FormularioModulo } from './FormularioModulo'
import { TablaModulo } from './TablaModulo'
import { useColeccion } from './useColeccion'

function detalleDe(editando: Registro | 'nuevo' | null, cargando: boolean, total: number): string | undefined {
  if (editando === 'nuevo') return 'Nuevo registro'
  if (editando) return 'Editando registro'
  if (cargando) return undefined
  return total === 1 ? '1 registro' : `${total} registros`
}

export function PaginaModulo({ def }: { def: ModuloDef }) {
  const { usuario } = useSesion()
  const { registros, cargando, error } = useColeccion(def.coleccion)
  const [editando, setEditando] = useState<Registro | 'nuevo' | null>(null)
  const capturista = puede(usuario, 'capturar')

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Registros" titulo={def.titulo}
        detalle={detalleDe(editando, cargando, registros.length)}
        acciones={capturista && editando === null && (
          <button type="button" onClick={() => setEditando('nuevo')} className="boton-primario">
            <Icono nombre="mas" />
            Nuevo
          </button>
        )} />
      {editando !== null ? (
        <FormularioModulo def={def} registro={editando === 'nuevo' ? undefined : editando}
          alTerminar={() => setEditando(null)} />
      ) : (
        <div className="space-y-4">
          {error && <AvisoError>{error}</AvisoError>}
          {cargando ? <Cargando /> : (
            <TablaModulo def={def} registros={registros}
              alSeleccionar={capturista ? setEditando : undefined} />
          )}
        </div>
      )}
    </section>
  )
}
