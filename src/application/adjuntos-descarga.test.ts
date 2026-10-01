import { describe, expect, it } from 'vitest'
import {
  ErrorConfiguracion, autorizarDescarga, contentDisposition, resolverDescarga, type PuertosDescarga,
} from './adjuntos-descarga'

const base = { email: 'ana@ejemplo.test', emailVerificado: true, dominioPermitido: 'ejemplo.test' }
const activo = (rol: string) => ({ rol, activo: true })

describe('autorizarDescarga', () => {
  it('permite admin, capturista y consulta activos', () => {
    for (const rol of ['admin', 'capturista', 'consulta']) {
      expect(autorizarDescarga({ ...base, usuario: activo(rol) })).toEqual({ ok: true })
    }
  })

  it('rechaza dominio ajeno, subdominios y correo sin verificar', () => {
    for (const email of ['ana@otro.test', 'ana@sub.ejemplo.test', 'ana@ejemplo.test.evil', 'sin-arroba', '']) {
      expect(autorizarDescarga({ ...base, email, usuario: activo('admin') })).toEqual({ ok: false, motivo: 'dominio' })
    }
    expect(autorizarDescarga({ ...base, emailVerificado: false, usuario: activo('admin') })).toEqual({ ok: false, motivo: 'dominio' })
  })

  it('compara el dominio sin distinguir mayúsculas', () => {
    expect(autorizarDescarga({ ...base, email: 'Ana@EJEMPLO.test', usuario: activo('consulta') })).toEqual({ ok: true })
  })

  it('rechaza sin usuario, inactivo, sin campo activo o con rol desconocido', () => {
    const rol = { ok: false, motivo: 'rol' }
    expect(autorizarDescarga({ ...base, usuario: null })).toEqual(rol)
    expect(autorizarDescarga({ ...base, usuario: { rol: 'admin', activo: false } })).toEqual(rol)
    expect(autorizarDescarga({ ...base, usuario: { rol: 'admin' } })).toEqual(rol)
    expect(autorizarDescarga({ ...base, usuario: activo('root') })).toEqual(rol)
    expect(autorizarDescarga({ ...base, usuario: { activo: true } })).toEqual(rol)
  })
})

describe('contentDisposition', () => {
  it('usa attachment con filename y filename* en UTF-8', () => {
    expect(contentDisposition('informe final.pdf')).toBe(
      `attachment; filename="informe final.pdf"; filename*=UTF-8''informe%20final.pdf`,
    )
  })

  it('codifica acentos y caracteres reservados de RFC 5987', () => {
    const h = contentDisposition("año (1)*'.pdf")
    expect(h).toContain(`filename="a_o (1)*'.pdf"`)
    expect(h).toContain(`filename*=UTF-8''a%C3%B1o%20%281%29%2A%27.pdf`)
  })

  it('neutraliza comillas, barras y saltos de línea', () => {
    const h = contentDisposition('a"b\\c\r\nd.pdf')
    expect(h).not.toMatch(/[\r\n]/)
    expect(h).toContain('filename="a_b_c__d.pdf"')
  })
})

const adjunto = {
  colaborador_id: 'c1', modulo: 'accidentes', registro_id: 'r1', archivo_id: 'a'.repeat(32),
  nombre: 'acta.pdf', tipo: 'application/pdf', tamano: 10,
}

function montar(sobre: Partial<PuertosDescarga> = {}) {
  const firmas: Parameters<PuertosDescarga['firmarUrl']>[0][] = []
  const puertos: PuertosDescarga = {
    verificarToken: async () => ({ uid: 'u1', email: 'ana@ejemplo.test', emailVerificado: true }),
    leerUsuario: async () => activo('consulta'),
    leerAdjunto: async () => adjunto,
    firmarUrl: async (p) => { firmas.push(p); return 'https://firmada.test/x' },
    ...sobre,
  }
  const pedir = (token: string | null = 'tok', id = 'abc123') =>
    resolverDescarga(puertos, { token, adjuntoId: id, dominioPermitido: 'ejemplo.test' })
  return { pedir, firmas }
}

describe('resolverDescarga', () => {
  it('firma la ruta construida solo con el documento almacenado', async () => {
    const { pedir, firmas } = montar()
    expect(await pedir()).toEqual({ estado: 200, cuerpo: { url: 'https://firmada.test/x' } })
    expect(firmas).toEqual([{
      ruta: `adjuntos/c1/accidentes/r1/${'a'.repeat(32)}`,
      tipo: 'application/pdf',
      disposicion: contentDisposition('acta.pdf'),
    }])
  })

  it('401 sin token o con token inválido, sin consultar nada más', async () => {
    let consultas = 0
    const leerUsuario = async () => { consultas++; return null }
    expect((await montar({ verificarToken: async () => null, leerUsuario }).pedir(null)).estado).toBe(401)
    expect((await montar({ verificarToken: async () => null, leerUsuario }).pedir('malo')).estado).toBe(401)
    expect((await montar({ verificarToken: async () => { throw new Error('token expirado') }, leerUsuario }).pedir()).estado).toBe(401)
    expect(consultas).toBe(0)
  })

  it('403 por dominio o por falta de rol', async () => {
    const dominio = montar({ verificarToken: async () => ({ uid: 'u', email: 'x@otro.test', emailVerificado: true }) })
    expect((await dominio.pedir()).estado).toBe(403)
    const rol = montar({ leerUsuario: async () => null })
    expect((await rol.pedir()).estado).toBe(403)
    expect(rol.firmas).toHaveLength(0)
  })

  it('404 si el adjunto no existe, el id es inválido o el documento está malformado', async () => {
    expect((await montar({ leerAdjunto: async () => null }).pedir()).estado).toBe(404)
    expect((await montar().pedir('tok', '../x')).estado).toBe(404)
    expect((await montar().pedir('tok', '')).estado).toBe(404)
    const malos = [
      { ...adjunto, archivo_id: '../../x' }, { ...adjunto, modulo: 'otro' }, { ...adjunto, registro_id: 'a/b' },
      { ...adjunto, nombre: 3 }, { ...adjunto, tipo: '' },
    ]
    for (const malo of malos) {
      expect((await montar({ leerAdjunto: async () => malo }).pedir()).estado).toBe(404)
    }
  })

  it('503 sin configuración y 500 genérico en otros fallos, sin detalles internos', async () => {
    const sin = await montar({ firmarUrl: async () => { throw new ErrorConfiguracion('FALTA_SECRETO') } }).pedir()
    expect(sin.estado).toBe(503)
    const otro = await montar({ leerAdjunto: async () => { throw new Error('detalle interno') } }).pedir()
    expect(otro.estado).toBe(500)
    for (const r of [sin, otro]) {
      const texto = JSON.stringify(r.cuerpo)
      expect(texto).not.toContain('FALTA_SECRETO')
      expect(texto).not.toContain('detalle interno')
    }
  })
})
