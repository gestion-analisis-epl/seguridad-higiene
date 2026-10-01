import { describe, expect, it } from 'vitest'
import { aPlaca, aTitulo, limpiarLibre, limpiarTexto } from './texto'

describe('limpiarTexto', () => {
  it('recorta y colapsa espacios y saltos', () => {
    expect(limpiarTexto('  hola \n\t  mundo  ')).toBe('hola mundo')
  })
  it('quita controles y caracteres de ancho cero', () => {
    expect(limpiarTexto('a\u0000b​c﻿d\u0007')).toBe('abcd')
  })
  it('trata el espacio duro como espacio', () => {
    expect(limpiarTexto('a  b')).toBe('a b')
  })
  it('normaliza a NFC', () => {
    expect(limpiarTexto('José')).toBe('José')
  })
})

describe('limpiarLibre', () => {
  it('conserva saltos, colapsa espacios y 3+ saltos', () => {
    expect(limpiarLibre('  a   b \r\n\r\n\r\n\r\n c​ \n')).toBe('a b\n\nc')
  })
})

describe('aTitulo', () => {
  it.each([
    ['JOSÉ  PÉREZ', 'José Pérez'],
    ['maría de la luz', 'María de la Luz'],
    ['DE LA CRUZ JUAN', 'De la Cruz Juan'],
    ["o'brien", "O'Brien"],
    ['perez-lopez', 'Perez-Lopez'],
    ['ana y pedro', 'Ana y Pedro'],
    ['luis iii', 'Luis III'],
    ['  ', ''],
  ])('%s', (entrada, esperado) => expect(aTitulo(entrada)).toBe(esperado))
})

describe('aPlaca', () => {
  it('pasa a mayúsculas y quita espacios', () => {
    expect(aPlaca(' abc 12 3 ')).toBe('ABC123')
  })
})
