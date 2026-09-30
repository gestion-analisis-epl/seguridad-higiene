import { describe, expect, it } from 'vitest'
import { MODULOS } from '@/domain/modulos-definiciones'
import type { UsuarioDoc } from '@/domain/permisos'
import { estaActivo, gruposDeNavegacion } from './enlaces'

const u = (rol: UsuarioDoc['rol'], activo = true): UsuarioDoc => ({ email: 'a@ejemplo.test', rol, activo })
const hrefs = (usuario: UsuarioDoc | null) => gruposDeNavegacion(usuario).flatMap((g) => g.enlaces.map((e) => e.href))

describe('gruposDeNavegacion', () => {
  it('admin ve tableros, todos los módulos y administración', () => {
    const h = hrefs(u('admin'))
    expect(h).toContain('/')
    expect(h).toContain('/analitico')
    for (const id of Object.keys(MODULOS)) expect(h).toContain(`/datos/${id}`)
    expect(h).toEqual(expect.arrayContaining(['/admin/usuarios', '/admin/catalogos', '/admin/configuracion']))
  })

  it('capturista y consulta ven módulos pero no administración', () => {
    for (const rol of ['capturista', 'consulta'] as const) {
      const h = hrefs(u(rol))
      expect(h).toContain(`/datos/${Object.keys(MODULOS)[0]}`)
      expect(h.some((x) => x.startsWith('/admin'))).toBe(false)
    }
  })

  it('sin permiso de lectura no hay enlaces', () => {
    expect(hrefs(null)).toEqual([])
    expect(hrefs(u('admin', false))).toEqual([])
    expect(hrefs(u('sin_rol'))).toEqual([])
  })
})

describe('estaActivo', () => {
  it('la raíz solo coincide exacta y las demás por prefijo de segmento', () => {
    expect(estaActivo('/', '/')).toBe(true)
    expect(estaActivo('/', '/analitico')).toBe(false)
    expect(estaActivo('/datos/accidentes', '/datos/accidentes')).toBe(true)
    expect(estaActivo('/admin/usuarios', '/admin/usuarios-x')).toBe(false)
  })
})
