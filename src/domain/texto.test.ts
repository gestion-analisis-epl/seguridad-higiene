import { describe, expect, it } from 'vitest'
import { aOracion, aPlaca, aTitulo, limpiarLibre, limpiarTexto } from './texto'

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

describe('aOracion', () => {
  it('deja solo la primera letra en mayúscula', () => {
    expect(aOracion('INSTALADOR DE LONAS')).toBe('Instalador de lonas')
    expect(aOracion('  bota   con casquillo ')).toBe('Bota con casquillo')
    expect(aOracion('Bajío Norte')).toBe('Bajío norte')
  })

  it('conserva en mayúsculas las siglas de sociedad', () => {
    expect(aOracion('SICMART SA DE CV')).toBe('Sicmart SA de CV')
    expect(aOracion('Servicios Del Norte S DE RL DE CV')).toBe('Servicios del norte S de RL de CV')
    expect(aOracion('Grupo Epl SAPI de CV')).toBe('Grupo epl SAPI de CV')
    expect(aOracion('MI EMPRESA S.A. DE C.V.')).toBe('Mi empresa S.A. de C.V.')
  })

  it('conserva en mayúsculas los códigos con números', () => {
    expect(aOracion('nom-009-stps-2011')).toBe('NOM-009-STPS-2011')
    expect(aOracion('ags001')).toBe('AGS001')
    expect(aOracion('Talla 26')).toBe('Talla 26')
  })

  it('un texto vacío queda vacío', () => {
    expect(aOracion('')).toBe('')
    expect(aOracion('   ')).toBe('')
  })
})
