const ANCHO_CERO = /[​-‍⁠﻿­]/g
const CONTROLES = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
const ROMANOS = new Set(['ii', 'iii', 'iv'])

// Una línea: NFC, sin controles ni ancho cero, espacios y saltos colapsados a uno.
export function limpiarTexto(s: string): string {
  return s.normalize('NFC').replace(ANCHO_CERO, '').replace(/\s+/g, ' ').replace(CONTROLES, '').trim()
}

// Multilínea: conserva saltos, colapsa espacios y 3+ saltos seguidos.
export function limpiarLibre(s: string): string {
  return s.normalize('NFC').replace(ANCHO_CERO, '').replace(/\r\n?/g, '\n').replace(CONTROLES, '')
    .replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

const capitalizar = (p: string) => p.toLowerCase().replace(/(^|[-'’])([^-'’])/g, (_, sep: string, l: string) => sep + l.toUpperCase())

export function aTitulo(s: string): string {
  return limpiarTexto(s).split(' ').filter(Boolean).map((p, i) => {
    const bajo = p.toLowerCase()
    if (ROMANOS.has(bajo)) return p.toUpperCase()
    return i > 0 && PARTICULAS.has(bajo) ? bajo : capitalizar(p)
  }).join(' ')
}

// Siglas de sociedad que se muestran en mayúsculas; el resto de la frase queda en minúsculas
const SIGLAS_SOCIEDAD: [RegExp, string][] = [
  [/(^|\s)s de rl de cv(?=\s|$)/g, '$1S de RL de CV'],
  [/(^|\s)sapi de cv(?=\s|$)/g, '$1SAPI de CV'],
  [/(^|\s)sa de cv(?=\s|$)/g, '$1SA de CV'],
  [/(^|\s)s\.a\. de c\.v\.(?=\s|$)/g, '$1S.A. de C.V.'],
]

// Formato oración: primera letra en mayúscula; siglas de sociedad y códigos con números (NOM-009-STPS-2011, AGS001) en mayúsculas.
export function aOracion(s: string): string {
  const palabras = limpiarTexto(s).toLowerCase().split(' ').filter(Boolean)
  if (palabras.length === 0) return ''
  let texto = palabras.map((p) => (/\d/.test(p) ? p.toUpperCase() : p)).join(' ')
  for (const [patron, siglas] of SIGLAS_SOCIEDAD) texto = texto.replace(patron, siglas)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const aPlaca = (s: string): string => limpiarTexto(s).replace(/\s/g, '').toUpperCase()
