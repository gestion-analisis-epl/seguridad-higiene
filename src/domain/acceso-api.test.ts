import { describe, expect, it } from 'vitest'
import { decidirAcceso } from './acceso-api'

const ok = { email: 'a@ejemplo.test', email_verified: true }
const usuario = (rol: 'admin' | 'capturista' | 'consulta', activo = true) => ({ email: 'a@ejemplo.test', rol, activo })

describe('decidirAcceso', () => {
  it('rechaza sin sesión con 401', () => {
    expect(decidirAcceso(null, null, 'ejemplo.test', 'leer')?.estado).toBe(401)
  })
  it('rechaza correo no verificado o de otro dominio con 403', () => {
    expect(decidirAcceso({ ...ok, email_verified: false }, usuario('admin'), 'ejemplo.test', 'leer')?.estado).toBe(403)
    expect(decidirAcceso({ email: 'a@otro.com', email_verified: true }, usuario('admin'), 'ejemplo.test', 'leer')?.estado).toBe(403)
  })
  it('exige rol activo con permiso para la acción', () => {
    expect(decidirAcceso(ok, null, 'ejemplo.test', 'leer')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('consulta'), 'ejemplo.test', 'capturar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('capturista'), 'ejemplo.test', 'administrar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('admin', false), 'ejemplo.test', 'leer')?.estado).toBe(403)
  })
  it('permite cuando todo cumple', () => {
    expect(decidirAcceso(ok, usuario('capturista'), 'ejemplo.test', 'capturar')).toBeNull()
    expect(decidirAcceso(ok, usuario('admin'), 'ejemplo.test', 'administrar')).toBeNull()
  })
})
