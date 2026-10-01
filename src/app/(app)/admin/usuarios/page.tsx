'use client'

import { useMemo } from 'react'
import type { Rol } from '@/domain/permisos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { actualizarUsuario } from '@/infrastructure/firestore/usuarios'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { ETIQUETA_ROL } from '@/presentation/navegacion/enlaces'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { ordenarOpciones } from '@/presentation/ui/seleccion'
import { DataTable, type ColumnaTabla } from '@/presentation/ui'

const ROLES: Rol[] = ['sin_rol', 'consulta', 'capturista', 'admin']
const ROLES_ORDENADOS = ordenarOpciones(ROLES.map((valor) => ({ valor, etiqueta: ETIQUETA_ROL[valor] }))).map((o) => o.valor)
const idUsuario = (u: Registro) => u.id

function Usuarios() {
  const { uid } = useSesion()
  const { registros, cargando, error } = useColeccion('usuarios')

  const columnas = useMemo((): ColumnaTabla<Registro>[] => {
    const actualizar = (id: string, cambios: { rol?: Rol; activo?: boolean }) => actualizarUsuario(id, cambios, uid ?? '')
    return [
      { id: 'email', encabezado: 'Correo', tipo: 'texto', anchoInicial: 260, valor: (u) => String(u.email ?? '') },
      {
        id: 'rol', encabezado: 'Rol', tipo: 'categoria', anchoInicial: 200,
        valor: (u) => ETIQUETA_ROL[u.rol as Rol] ?? String(u.rol ?? ''),
        celda: (u) => (
          <select aria-label={`Rol de ${u.email}`} value={String(u.rol)} className="control min-w-[9rem]"
            disabled={u.id === uid}
            onChange={(e) => void actualizar(u.id, { rol: e.target.value as Rol })}>
            {ROLES_ORDENADOS.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
          </select>
        ),
      },
      {
        id: 'activo', encabezado: 'Activo', tipo: 'booleano', anchoInicial: 160,
        valor: (u) => u.activo === true,
        celda: (u) => (
          <label className="inline-flex min-h-[2.5rem] cursor-pointer items-center gap-2">
            <input type="checkbox" className="casilla" aria-label={`Activo: ${u.email}`} checked={u.activo === true}
              disabled={u.id === uid}
              onChange={(e) => void actualizar(u.id, { activo: e.target.checked })} />
            <span aria-hidden="true" className={u.activo === true ? 'insignia-vigente' : 'insignia bg-superficie-2 text-texto-suave'}>
              {u.activo === true ? 'Activo' : 'Inactivo'}
            </span>
          </label>
        ),
      },
    ]
  }, [uid])

  return (
    <section className="aparecer space-y-4">
      <EncabezadoPagina rotulo="Administración" titulo="Usuarios"
        detalle="Las cuentas del dominio entran como consulta. Promueve el rol o revoca el acceso." />
      {error && <AvisoError>{error}</AvisoError>}
      {cargando ? <Cargando /> : (
        <DataTable columnas={columnas} filas={registros} idFila={idUsuario} vacio="Sin usuarios"
          etiqueta="Usuarios" claveAnchos="tabla-usuarios" />
      )}
    </section>
  )
}

export default function UsuariosPage() {
  return <RequireAcceso accion="administrar"><Usuarios /></RequireAcceso>
}
