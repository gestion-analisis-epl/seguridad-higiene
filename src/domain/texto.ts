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

export const aPlaca = (s: string): string => limpiarTexto(s).replace(/\s/g, '').toUpperCase()
