import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { leerConfiguracion } from '../../src/infrastructure/firebase/configuracion'
import { regexDeDominio, renderizarPlantilla } from './plantillas.mjs'

const BASE = 'NEXT_PUBLIC_FIRESTORE_DATABASE'
const DOMINIO = 'NEXT_PUBLIC_DOMINIO_PERMITIDO'
const valida = { [BASE]: 'base-app', [DOMINIO]: 'ejemplo.test' }

const error = (texto, env) => {
  try {
    renderizarPlantilla(texto, env)
  } catch (e) {
    return e.message
  }
  throw new Error('no falló')
}

describe('regexDeDominio', () => {
  it('escribe cada punto como [.]', () => {
    expect(regexDeDominio('ejemplo.test')).toBe('ejemplo[.]test')
    expect(regexDeDominio('mi-empresa.com.xx')).toBe('mi-empresa[.]com[.]xx')
  })
})

describe('renderizarPlantilla', () => {
  it('sustituye la base y el dominio en forma de regex', () => {
    const salida = renderizarPlantilla('{"db":"{{BASE_DATOS}}"} .*@{{DOMINIO_REGEX}} {{BASE_DATOS}}', valida)
    expect(salida).toBe('{"db":"base-app"} .*@ejemplo[.]test base-app')
  })

  it('recorta espacios como la app', () => {
    expect(renderizarPlantilla('{{BASE_DATOS}}|{{DOMINIO_REGEX}}', { [BASE]: ' base-app ', [DOMINIO]: ' ejemplo.test ' }))
      .toBe('base-app|ejemplo[.]test')
  })

  it('escapa la base para JSON', () => {
    expect(JSON.parse(renderizarPlantilla('{"db":"{{BASE_DATOS}}"}', { ...valida, [BASE]: 'a"b\c' })).db).toBe('a"b\c')
  })

  it('sin variables nombra ambas', () => {
    const msg = error('{{BASE_DATOS}}', {})
    expect(msg).toContain(BASE)
    expect(msg).toContain(DOMINIO)
  })

  it('rechaza la base vacía o (default) en cualquier variante sin mostrar su valor', () => {
    for (const base of ['', '   ', '(default)', '(DEFAULT)', '(Default)', ' (default) ']) {
      const msg = error('{{BASE_DATOS}}', { ...valida, [BASE]: base })
      expect(msg).toContain(BASE)
      expect(msg).not.toContain(DOMINIO)
      if (base.trim()) expect(msg).not.toContain(base.trim())
    }
  })

  it('rechaza dominios inválidos sin mostrar su valor', () => {
    for (const dominio of ['', '@ejemplo.test', 'a@ejemplo.test', 'Ejemplo.Test', 'ejemplo', 'ejemplo..test', 'ejemplo.test.', 'eje mplo.test']) {
      const msg = error('{{DOMINIO_REGEX}}', { ...valida, [DOMINIO]: dominio })
      expect(msg).toContain(DOMINIO)
      expect(msg).not.toContain(BASE)
      if (dominio) expect(msg).not.toContain(dominio)
    }
  })

  it('un marcador desconocido es error y se nombra', () => {
    const msg = error('{{BASE_DATOS}} {{OTRO_VALOR}}', valida)
    expect(msg).toContain('OTRO_VALOR')
    expect(msg).not.toContain('base-app')
  })

  it('coincide con leerConfiguracion de la app', () => {
    const bases = ['base-app', '', ' ', '(default)', '(DEFAULT)', ' (Default) ', 'x']
    const dominios = ['ejemplo.test', 'Ejemplo.test', '@ejemplo.test', 'ejemplo', 'a.b.c', 'a..b', ' ejemplo.test ', '']
    for (const b of bases) {
      for (const d of dominios) {
        const env = { [BASE]: b, [DOMINIO]: d }
        let app = true
        let gen = true
        try { leerConfiguracion(env) } catch { app = false }
        try { renderizarPlantilla('{{BASE_DATOS}}{{DOMINIO_REGEX}}', env) } catch { gen = false }
        expect(gen).toBe(app)
      }
    }
  })
})

describe('plantillas del repositorio', () => {
  it('firebase.template.json renderiza a JSON con la base indicada', () => {
    const json = JSON.parse(renderizarPlantilla(readFileSync('firebase.template.json', 'utf8'), valida))
    expect(json.firestore[0].database).toBe('base-app')
  })

  it('firestore.rules.template renderiza sin marcadores y con el dominio como regex', () => {
    const reglas = renderizarPlantilla(readFileSync('firestore.rules.template', 'utf8'), valida)
    expect(reglas).toContain("matches('.*@ejemplo[.]test')")
    expect(reglas).not.toContain('{{')
  })
})

describe('valores con marcadores', () => {
  it('rechaza una base que contiene marcadores sin mostrarla', () => {
    const msg = error('{{BASE_DATOS}}', { ...valida, [BASE]: 'x{{OTRO}}y' })
    expect(msg).toContain(BASE)
    expect(msg).not.toContain('OTRO')
  })

  it('el error de marcador desconocido nombra solo el marcador de la plantilla', () => {
    const msg = error('{{BASE_DATOS}} {{DESCONOCIDO}}', valida)
    expect(msg).toContain('{{DESCONOCIDO}}')
    expect(msg).not.toContain('base-app')
  })
})
