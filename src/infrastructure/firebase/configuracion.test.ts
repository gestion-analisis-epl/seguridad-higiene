import { describe, expect, it } from 'vitest'
import { leerConfiguracion } from './configuracion'

const valida = { NEXT_PUBLIC_FIRESTORE_DATABASE: 'base-app', NEXT_PUBLIC_DOMINIO_PERMITIDO: 'ejemplo.test' }

const error = (env: Record<string, string | undefined>) => {
  try {
    leerConfiguracion(env)
  } catch (e) {
    return (e as Error).message
  }
  throw new Error('no falló')
}

describe('leerConfiguracion', () => {
  it('devuelve la base y el dominio', () => {
    expect(leerConfiguracion(valida)).toEqual({ baseDatos: 'base-app', dominioPermitido: 'ejemplo.test' })
    expect(leerConfiguracion({ ...valida, NEXT_PUBLIC_DOMINIO_PERMITIDO: 'mi-empresa.com.mx' }).dominioPermitido)
      .toBe('mi-empresa.com.mx')
  })

  it('recorta espacios', () => {
    expect(leerConfiguracion({ NEXT_PUBLIC_FIRESTORE_DATABASE: ' base-app ', NEXT_PUBLIC_DOMINIO_PERMITIDO: ' ejemplo.test ' }))
      .toEqual({ baseDatos: 'base-app', dominioPermitido: 'ejemplo.test' })
  })

  it('sin variables nombra ambas', () => {
    const msg = error({})
    expect(msg).toContain('NEXT_PUBLIC_FIRESTORE_DATABASE')
    expect(msg).toContain('NEXT_PUBLIC_DOMINIO_PERMITIDO')
  })

  it('nunca usa la base predeterminada ni acepta vacíos', () => {
    for (const base of ['', '   ', '(default)', '(DEFAULT)', '(Default)', ' (default) ']) {
      const msg = error({ ...valida, NEXT_PUBLIC_FIRESTORE_DATABASE: base })
      expect(msg).toContain('NEXT_PUBLIC_FIRESTORE_DATABASE')
      expect(msg).not.toContain('NEXT_PUBLIC_DOMINIO_PERMITIDO')
    }
  })

  it('rechaza dominios inválidos sin mostrar su valor', () => {
    for (const dominio of ['', '@ejemplo.test', 'a@ejemplo.test', 'Ejemplo.Test', 'ejemplo', 'ejemplo..test', 'ejemplo.test.', 'eje mplo.test']) {
      const msg = error({ ...valida, NEXT_PUBLIC_DOMINIO_PERMITIDO: dominio })
      expect(msg).toContain('NEXT_PUBLIC_DOMINIO_PERMITIDO')
      expect(msg).not.toContain('NEXT_PUBLIC_FIRESTORE_DATABASE')
      if (dominio) expect(msg).not.toContain(dominio)
    }
  })
})
