import { describe, expect, it } from 'vitest'
import { claveColeccion, claveDoc, crearAlmacen, LECTURA_CARGANDO, LECTURA_VACIA } from './almacen-lecturas'

function falso() {
  const abiertos: { clave: string; dato: (d: string) => void; error: (e: Error) => void; cancelado: boolean }[] = []
  const almacen = crearAlmacen<string>((clave, dato, error) => {
    const a = { clave, dato, error, cancelado: false }
    abiertos.push(a)
    return () => { a.cancelado = true }
  })
  return { almacen, abiertos }
}

describe('almacen de lecturas', () => {
  it('muchos suscriptores comparten un solo listener', () => {
    const { almacen, abiertos } = falso()
    const k = claveColeccion('cosas')
    almacen.suscribir(k, () => {}); almacen.suscribir(k, () => {}); almacen.suscribir(k, () => {})
    expect(abiertos).toHaveLength(1)
  })

  it('sin suscriptores el listener sigue vivo y el siguiente reutiliza el dato', () => {
    const { almacen, abiertos } = falso()
    const k = claveDoc('cat', 'a')
    const baja = almacen.suscribir(k, () => {})
    abiertos[0].dato('uno')
    baja()
    expect(abiertos[0].cancelado).toBe(false)
    const avisos: number[] = []
    almacen.suscribir(k, () => avisos.push(1))
    expect(abiertos).toHaveLength(1)
    expect(almacen.leer(k)).toEqual({ dato: 'uno', cargando: false, error: null })
  })

  it('avisa a los suscriptores y la foto es estable hasta que cambia el dato', () => {
    const { almacen, abiertos } = falso()
    const k = claveColeccion('cosas')
    let avisos = 0
    almacen.suscribir(k, () => { avisos++ })
    expect(almacen.leer(k)).toBe(LECTURA_CARGANDO)
    abiertos[0].dato('a')
    const a = almacen.leer(k)
    expect(almacen.leer(k)).toBe(a)
    abiertos[0].dato('b')
    expect(almacen.leer(k)).not.toBe(a)
    expect(avisos).toBe(2)
  })

  it('claves distintas abren listeners distintos', () => {
    const { almacen, abiertos } = falso()
    almacen.suscribir(claveColeccion('x'), () => {}); almacen.suscribir(claveDoc('x', 'y'), () => {})
    expect(abiertos.map((a) => a.clave)).toEqual(['c:x', 'd:x/y'])
  })

  it('un error se avisa, descarta la entrada y un nuevo suscriptor reintenta', () => {
    const { almacen, abiertos } = falso()
    const k = claveColeccion('cosas')
    let avisos = 0
    almacen.suscribir(k, () => { avisos++ })
    abiertos[0].error(new Error('sin permiso'))
    expect(abiertos[0].cancelado).toBe(true)
    expect(almacen.leer(k)).toEqual({ dato: undefined, cargando: false, error: 'sin permiso' })
    almacen.suscribir(k, () => {})
    expect(abiertos).toHaveLength(2)
    expect(almacen.leer(k)).toBe(LECTURA_CARGANDO)
    abiertos[1].dato('ok')
    expect(almacen.leer(k).dato).toBe('ok')
    expect(avisos).toBeGreaterThanOrEqual(3)
  })

  it('ignora respuestas de un listener ya descartado', () => {
    const { almacen, abiertos } = falso()
    const k = claveColeccion('cosas')
    almacen.suscribir(k, () => {})
    abiertos[0].error(new Error('x'))
    almacen.suscribir(k, () => {})
    abiertos[0].dato('viejo')
    expect(almacen.leer(k)).toBe(LECTURA_CARGANDO)
  })

  it('vaciar cancela todo, limpia la memoria y permite empezar de nuevo', () => {
    const { almacen, abiertos } = falso()
    const a = claveColeccion('a'), b = claveDoc('b', 'c')
    let avisos = 0
    almacen.suscribir(a, () => { avisos++ }); almacen.suscribir(b, () => {})
    abiertos[0].dato('x')
    almacen.vaciar()
    expect(abiertos.every((o) => o.cancelado)).toBe(true)
    expect(almacen.leer(a)).toBe(LECTURA_CARGANDO)
    expect(avisos).toBe(2)
    almacen.suscribir(a, () => {})
    expect(abiertos).toHaveLength(3)
  })

  it('una baja sirve una sola vez y no afecta a otros suscriptores', () => {
    const { almacen, abiertos } = falso()
    const k = claveColeccion('cosas')
    let n = 0
    const baja = almacen.suscribir(k, () => {})
    almacen.suscribir(k, () => { n++ })
    baja(); baja()
    abiertos[0].dato('z')
    expect(n).toBe(1)
  })

  it('un error durante la apertura no deja el listener colgado', () => {
    let cancelado = false
    const almacen = crearAlmacen<string>((_c, _d, error) => { error(new Error('al abrir')); return () => { cancelado = true } })
    almacen.suscribir('c:x', () => {})
    expect(cancelado).toBe(true)
    expect(almacen.leer('c:x').error).toBe('al abrir')
  })

  it('la lectura de clave nula es vacia y no esta cargando', () => {
    expect(LECTURA_VACIA).toEqual({ dato: undefined, cargando: false, error: null })
    expect(LECTURA_VACIA).not.toBe(LECTURA_CARGANDO)
  })
})
