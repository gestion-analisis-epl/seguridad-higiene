import { describe, expect, it } from 'vitest'
import { esCorreoPermitido, puede, resolverAcceso, type UsuarioDoc } from './permisos'

const D = 'ejemplo.test'
const u = (rol: UsuarioDoc['rol'], activo = true): UsuarioDoc => ({ email: 'a@ejemplo.test', rol, activo })

describe('esCorreoPermitido', () => {
  it('acepta solo el dominio indicado', () => {
    expect(esCorreoPermitido('a@ejemplo.test', D)).toBe(true)
    expect(esCorreoPermitido('A@Ejemplo.TEST', D)).toBe(true)
    expect(esCorreoPermitido('a@ejemplo.test', 'Ejemplo.Test')).toBe(true)
    expect(esCorreoPermitido('a@gmail.com', D)).toBe(false)
    expect(esCorreoPermitido('a@ejemplo.test.evil.com', D)).toBe(false)
    expect(esCorreoPermitido('a@malejemplo.test', D)).toBe(false)
    expect(esCorreoPermitido(null, D)).toBe(false)
  })

  it('sin dominio no acepta nada', () => {
    expect(esCorreoPermitido('a@', '')).toBe(false)
    expect(esCorreoPermitido('a@ejemplo.test', ' ')).toBe(false)
  })
})

describe('puede', () => {
  it('admin puede todo', () => {
    for (const a of ['leer', 'capturar', 'administrar'] as const) expect(puede(u('admin'), a)).toBe(true)
  })
  it('capturista lee y captura, no administra', () => {
    expect(puede(u('capturista'), 'capturar')).toBe(true)
    expect(puede(u('capturista'), 'administrar')).toBe(false)
  })
  it('consulta solo lee', () => {
    expect(puede(u('consulta'), 'leer')).toBe(true)
    expect(puede(u('consulta'), 'capturar')).toBe(false)
  })
  it('inactivo, sin rol y null no pueden nada', () => {
    expect(puede(u('admin', false), 'leer')).toBe(false)
    expect(puede(u('sin_rol'), 'leer')).toBe(false)
    expect(puede(null, 'leer')).toBe(false)
  })
})

describe('resolverAcceso', () => {
  it('recorre todos los estados', () => {
    expect(resolverAcceso(null, null, D)).toBe('sin_sesion')
    expect(resolverAcceso('a@gmail.com', null, D)).toBe('dominio_no_permitido')
    expect(resolverAcceso('a@ejemplo.test', null, D)).toBe('sin_registro')
    expect(resolverAcceso('a@ejemplo.test', u('sin_rol', false), D)).toBe('pendiente')
    expect(resolverAcceso('a@ejemplo.test', u('consulta', false), D)).toBe('inactivo')
    expect(resolverAcceso('a@ejemplo.test', u('consulta'), D)).toBe('autorizado')
  })

  it('usa el dominio recibido', () => {
    expect(resolverAcceso('a@ejemplo.test', u('consulta'), 'otro.test')).toBe('dominio_no_permitido')
  })
})
