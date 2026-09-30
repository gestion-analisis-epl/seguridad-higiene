'use client'

import type { Rol } from '@/domain/permisos'
import { actualizarUsuario } from '@/infrastructure/firestore/usuarios'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { ETIQUETA_ROL } from '@/presentation/navegacion/enlaces'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'

const ROLES: Rol[] = ['sin_rol', 'consulta', 'capturista', 'admin']

function Usuarios() {
  const { uid } = useSesion()
  const { registros, cargando, error } = useColeccion('usuarios')

  const actualizar = (id: string, cambios: { rol?: Rol; activo?: boolean }) => actualizarUsuario(id, cambios, uid ?? '')

  return (
    <section className="aparecer space-y-4">
      <EncabezadoPagina rotulo="Administración" titulo="Usuarios"
        detalle="Las cuentas del dominio entran como consulta. Promueve el rol o revoca el acceso." />
      {error && <AvisoError>{error}</AvisoError>}
      {cargando ? <Cargando /> : (
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Activo</th></tr>
            </thead>
            <tbody>
              {registros.map((u) => (
                <tr key={u.id}>
                  <td className="break-all">{String(u.email)}</td>
                  <td>
                    <select aria-label={`Rol de ${u.email}`} value={String(u.rol)} className="control min-w-[9rem]"
                      disabled={u.id === uid}
                      onChange={(e) => void actualizar(u.id, { rol: e.target.value as Rol })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <label className="inline-flex min-h-[2.5rem] cursor-pointer items-center gap-2">
                      <input type="checkbox" className="casilla" aria-label={`Activo: ${u.email}`} checked={u.activo === true}
                        disabled={u.id === uid}
                        onChange={(e) => void actualizar(u.id, { activo: e.target.checked })} />
                      <span aria-hidden="true" className={u.activo === true ? 'insignia-vigente' : 'insignia bg-superficie-2 text-texto-suave'}>
                        {u.activo === true ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function UsuariosPage() {
  return <RequireAcceso accion="administrar"><Usuarios /></RequireAcceso>
}
