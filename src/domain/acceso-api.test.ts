import { describe, expect, it } from 'vitest'
import { decidirAcceso } from './acceso-api'

const ok = { email: 'a@grupoepl.com.mx', email_verified: true }
const usuario = (rol: 'admin' | 'capturista' | 'consulta', activo = true) => ({ email: 'a@grupoepl.com.mx', rol, activo })

describe('decidirAcceso', () => {
  it('rechaza sin sesión con 401', () => {
    expect(decidirAcceso(null, null, 'grupoepl.com.mx', 'leer')?.estado).toBe(401)
  })
  it('rechaza correo no verificado o de otro dominio con 403', () => {
    expect(decidirAcceso({ ...ok, email_verified: false }, usuario('admin'), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
    expect(decidirAcceso({ email: 'a@otro.com', email_verified: true }, usuario('admin'), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
  })
  it('exige rol activo con permiso para la acción', () => {
    expect(decidirAcceso(ok, null, 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('consulta'), 'grupoepl.com.mx', 'capturar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('capturista'), 'grupoepl.com.mx', 'administrar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('admin', false), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
  })
  it('permite cuando todo cumple', () => {
    expect(decidirAcceso(ok, usuario('capturista'), 'grupoepl.com.mx', 'capturar')).toBeNull()
    expect(decidirAcceso(ok, usuario('admin'), 'grupoepl.com.mx', 'administrar')).toBeNull()
  })
})
