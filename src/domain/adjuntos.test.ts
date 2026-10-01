import { describe, expect, it } from 'vitest'
import { MAX_BYTES, MAX_POR_REGISTRO, nombreSeguro, nuevoArchivoId, rutaAdjunto, validarArchivo } from './adjuntos'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PPT = 'application/vnd.ms-powerpoint'
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

describe('validarArchivo', () => {
  it('acepta los tipos permitidos', () => {
    const validos: [string, string][] = [
      ['a.pdf', 'application/pdf'], ['a.jpg', 'image/jpeg'], ['a.jpeg', 'image/jpeg'], ['a.PNG', 'image/png'],
      ['a.webp', 'image/webp'], ['a.doc', 'application/msword'], ['a.docx', DOCX],
      ['a.xls', 'application/vnd.ms-excel'], ['a.xlsx', XLSX],
      ['a.ppt', PPT], ['a.PPTX', PPTX],
    ]
    for (const [nombre, tipo] of validos) expect(validarArchivo({ nombre, tipo, tamano: 100 }, 0)).toBeNull()
  })

  it('rechaza extensiones no permitidas', () => {
    expect(validarArchivo({ nombre: 'a.exe', tipo: 'application/pdf', tamano: 100 }, 0)).toEqual(expect.any(String))
    expect(validarArchivo({ nombre: 'sin-extension', tipo: 'application/pdf', tamano: 100 }, 0)).toEqual(expect.any(String))
  })

  it('rechaza un MIME que no corresponde a la extensión', () => {
    expect(validarArchivo({ nombre: 'a.pdf', tipo: 'image/png', tamano: 100 }, 0)).toEqual(expect.any(String))
    expect(validarArchivo({ nombre: 'a.pdf', tipo: '', tamano: 100 }, 0)).toEqual(expect.any(String))
  })

  it('rechaza un MIME de PowerPoint que no corresponde a la extensión', () => {
    expect(validarArchivo({ nombre: 'a.pptx', tipo: PPT, tamano: 100 }, 0)).toEqual(expect.any(String))
    expect(validarArchivo({ nombre: 'a.ppt', tipo: PPTX, tamano: 100 }, 0)).toEqual(expect.any(String))
    expect(validarArchivo({ nombre: 'a.pptx', tipo: 'application/pdf', tamano: 100 }, 0)).toEqual(expect.any(String))
  })

  it('valida el tamaño', () => {
    expect(validarArchivo({ nombre: 'a.pdf', tipo: 'application/pdf', tamano: 0 }, 0)).toEqual(expect.any(String))
    expect(validarArchivo({ nombre: 'a.pdf', tipo: 'application/pdf', tamano: MAX_BYTES }, 0)).toBeNull()
    expect(validarArchivo({ nombre: 'a.pdf', tipo: 'application/pdf', tamano: MAX_BYTES + 1 }, 0)).toEqual(expect.any(String))
  })

  it('rechaza el archivo que excede el tope por registro', () => {
    const a = { nombre: 'a.pdf', tipo: 'application/pdf', tamano: 1 }
    expect(validarArchivo(a, MAX_POR_REGISTRO - 1)).toBeNull()
    expect(validarArchivo(a, MAX_POR_REGISTRO)).toEqual(expect.any(String))
  })
})

describe('rutaAdjunto', () => {
  it('arma la ruta sin nombre original', () => {
    expect(rutaAdjunto({ colaborador_id: 'c1', modulo: 'accidentes', registro_id: 'r1', archivo_id: 'f1' }))
      .toBe('adjuntos/c1/accidentes/r1/f1')
  })
})

describe('nombreSeguro', () => {
  it('quita separadores y conserva la extensión', () => {
    const n = nombreSeguro('..\a/b  Informe.PDF')
    expect(n).not.toMatch(/[\/]/)
    expect(n.endsWith('.PDF')).toBe(true)
  })
  it('limita a 120 caracteres conservando la extensión', () => {
    const n = nombreSeguro(`${'x'.repeat(300)}.pdf`)
    expect(n.length).toBeLessThanOrEqual(120)
    expect(n.endsWith('.pdf')).toBe(true)
  })
  it('nunca queda vacío', () => {
    expect(nombreSeguro('  ').length).toBeGreaterThan(0)
  })
})

describe('nuevoArchivoId', () => {
  it('produce 32 hex distintos', () => {
    const a = nuevoArchivoId()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(nuevoArchivoId()).not.toBe(a)
  })
})
