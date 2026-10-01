import { describe, expect, it } from 'vitest'
import { etiquetaTipo, tamanoLegible } from './formato'

describe('formato de adjuntos', () => {
  it('muestra el tamaño en la unidad adecuada', () => {
    expect(tamanoLegible(0)).toBe('0 B')
    expect(tamanoLegible(512)).toBe('512 B')
    expect(tamanoLegible(1536)).toBe('1.5 KB')
    expect(tamanoLegible(10 * 1024 * 1024)).toBe('10.0 MB')
  })

  it('etiqueta el tipo por MIME', () => {
    expect(etiquetaTipo('application/pdf')).toBe('PDF')
    expect(etiquetaTipo('image/jpeg')).toBe('Imagen')
    expect(etiquetaTipo('application/msword')).toBe('Word')
    expect(etiquetaTipo('application/vnd.ms-excel')).toBe('Excel')
    expect(etiquetaTipo('application/x-otro')).toBe('Archivo')
  })
})
