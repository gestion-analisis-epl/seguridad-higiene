import { describe, expect, it } from 'vitest'
import {
  ANCHO_BASE, ANCHO_MAXIMO, COLADOR, VACIO, anchosEfectivos, anchosValidos, aplicarFiltros, clamparAncho,
  compararValores, filtroActivo, ordenarFilas, opcionesDeCategoria, pasaFiltro, siguienteOrden, textoVisible,
  type ColumnaLogica, type Filtro,
} from './logica'

interface Fila { id: string; nombre: string | null; edad: number | null; alta: Date | null; activo: boolean | null; ciudad: string | null }
const f = (id: string, p: Partial<Fila>): Fila => ({ id, nombre: null, edad: null, alta: null, activo: null, ciudad: null, ...p })
const dia = (s: string) => new Date(`${s}T12:00:00Z`)

const col = (id: keyof Fila, tipo: ColumnaLogica<Fila>['tipo']): ColumnaLogica<Fila> => ({ id, tipo, valor: (r) => r[id] })
const cNombre = col('nombre', 'texto'), cEdad = col('edad', 'numero'), cAlta = col('alta', 'fecha')
const cActivo = col('activo', 'booleano'), cCiudad = col('ciudad', 'categoria')

describe('comparadores', () => {
  it('numeros numericamente, no como texto', () => {
    expect(compararValores(2, 10, 'numero')).toBeLessThan(0)
  })
  it('fechas cronologicamente', () => {
    expect(compararValores(dia('2025-01-02'), dia('2024-12-30'), 'fecha')).toBeGreaterThan(0)
  })
  it('texto sin acentos ni mayusculas', () => {
    expect(compararValores('Ángel', 'angel', 'texto')).toBe(0)
    expect(compararValores('Ángel', 'Beto', 'texto')).toBeLessThan(0)
    expect(compararValores('Ñu', 'Zeta', 'categoria')).toBeLessThan(0)
  })
  it('booleanos: falso antes que verdadero', () => {
    expect(compararValores(false, true, 'booleano')).toBeLessThan(0)
  })
})

describe('textoVisible', () => {
  it('formatea fecha, booleano, numero y nulo', () => {
    expect(textoVisible(dia('2025-03-09'))).toBe('09/03/2025')
    expect(textoVisible(true)).toBe('Sí')
    expect(textoVisible(12)).toBe('12')
    expect(textoVisible(null)).toBe('')
    expect(textoVisible(new Date('x'))).toBe('')
  })
})

describe('ordenarFilas', () => {
  const filas = [f('1', { edad: 30 }), f('2', { edad: null }), f('3', { edad: 5 }), f('4', { edad: 30 })]
  it('ascendente con nulos al final', () => {
    expect(ordenarFilas(filas, cEdad, 'asc').map((r) => r.id)).toEqual(['3', '1', '4', '2'])
  })
  it('descendente con nulos al final y estable', () => {
    expect(ordenarFilas(filas, cEdad, 'desc').map((r) => r.id)).toEqual(['1', '4', '3', '2'])
  })
  it('no muta la entrada', () => {
    const copia = [...filas]
    ordenarFilas(filas, cEdad, 'asc')
    expect(filas).toEqual(copia)
  })
  it('siguienteOrden cicla asc, desc, nada', () => {
    const a = siguienteOrden(null, 'x')
    expect(a).toEqual({ id: 'x', dir: 'asc' })
    const d = siguienteOrden(a, 'x')
    expect(d).toEqual({ id: 'x', dir: 'desc' })
    expect(siguienteOrden(d, 'x')).toBeNull()
    expect(siguienteOrden(d, 'otra')).toEqual({ id: 'otra', dir: 'asc' })
  })
})

describe('filtros', () => {
  it('texto contiene, sin acentos ni mayusculas, excluye nulos', () => {
    const fl: Filtro = { tipo: 'texto', texto: 'ANGE' }
    expect(pasaFiltro(f('1', { nombre: 'Ángela' }), cNombre, fl)).toBe(true)
    expect(pasaFiltro(f('2', { nombre: 'Beto' }), cNombre, fl)).toBe(false)
    expect(pasaFiltro(f('3', { nombre: null }), cNombre, fl)).toBe(false)
  })
  it('numero min y max inclusivos, excluye nulos', () => {
    const fl: Filtro = { tipo: 'numero', min: 5, max: 10 }
    expect([4, 5, 10, 11, null].map((n) => pasaFiltro(f('x', { edad: n }), cEdad, fl))).toEqual([false, true, true, false, false])
    expect(pasaFiltro(f('x', { edad: 99 }), cEdad, { tipo: 'numero', min: 5, max: null })).toBe(true)
  })
  it('fecha por dia calendario UTC, extremos inclusivos', () => {
    const fl: Filtro = { tipo: 'fecha', desde: '2025-03-01', hasta: '2025-03-31' }
    const dentro = (s: string | null) => pasaFiltro(f('x', { alta: s ? dia(s) : null }), cAlta, fl)
    expect(dentro('2025-03-01')).toBe(true)
    expect(dentro('2025-03-31')).toBe(true)
    expect(dentro('2025-04-01')).toBe(false)
    expect(dentro('2025-02-28')).toBe(false)
    expect(dentro(null)).toBe(false)
    expect(pasaFiltro(f('x', { alta: new Date('2025-03-31T23:30:00Z') }), cAlta, fl)).toBe(true)
  })
  it('booleano', () => {
    expect(pasaFiltro(f('1', { activo: true }), cActivo, { tipo: 'booleano', valor: true })).toBe(true)
    expect(pasaFiltro(f('2', { activo: false }), cActivo, { tipo: 'booleano', valor: true })).toBe(false)
    expect(pasaFiltro(f('3', { activo: null }), cActivo, { tipo: 'booleano', valor: false })).toBe(false)
  })
  it('categoria oculta valores y trata vacio como clave propia', () => {
    const fl: Filtro = { tipo: 'categoria', ocultos: ['Ciudad B', VACIO] }
    expect(pasaFiltro(f('1', { ciudad: 'Ciudad A' }), cCiudad, fl)).toBe(true)
    expect(pasaFiltro(f('2', { ciudad: 'Ciudad B' }), cCiudad, fl)).toBe(false)
    expect(pasaFiltro(f('3', { ciudad: null }), cCiudad, fl)).toBe(false)
    expect(pasaFiltro(f('4', { ciudad: '' }), cCiudad, fl)).toBe(false)
    expect(pasaFiltro(f('5', { ciudad: null }), cCiudad, { tipo: 'categoria', ocultos: ['Ciudad B'] })).toBe(true)
  })
  it('filtroActivo detecta filtros vacios', () => {
    expect(filtroActivo({ tipo: 'texto', texto: '  ' })).toBe(false)
    expect(filtroActivo({ tipo: 'texto', texto: 'a' })).toBe(true)
    expect(filtroActivo({ tipo: 'numero', min: null, max: null })).toBe(false)
    expect(filtroActivo({ tipo: 'fecha', desde: '', hasta: '' })).toBe(false)
    expect(filtroActivo({ tipo: 'categoria', ocultos: [] })).toBe(false)
    expect(filtroActivo({ tipo: 'booleano', valor: false })).toBe(true)
  })
  it('aplicarFiltros combina con Y e ignora filtros inactivos', () => {
    const filas = [f('1', { nombre: 'Ana', edad: 20 }), f('2', { nombre: 'Ana', edad: 40 }), f('3', { nombre: 'Beto', edad: 20 })]
    const r = aplicarFiltros(filas, [cNombre, cEdad], {
      nombre: { tipo: 'texto', texto: 'ana' }, edad: { tipo: 'numero', min: null, max: 30 },
    })
    expect(r.map((x) => x.id)).toEqual(['1'])
    expect(aplicarFiltros(filas, [cNombre], { nombre: { tipo: 'texto', texto: '' } })).toHaveLength(3)
  })
})

describe('opcionesDeCategoria', () => {
  it('distintos, ordenados, con (vacio) al final', () => {
    const filas = [f('1', { ciudad: 'Ciudad B' }), f('2', { ciudad: null }), f('3', { ciudad: 'Ciudad A' }), f('4', { ciudad: 'Ciudad B' })]
    expect(opcionesDeCategoria(filas, cCiudad)).toEqual([
      { valor: 'Ciudad A', etiqueta: 'Ciudad A' },
      { valor: 'Ciudad B', etiqueta: 'Ciudad B' },
      { valor: VACIO, etiqueta: '(vacío)' },
    ])
  })
})

describe('anchos', () => {
  it('clamparAncho respeta minimo y maximo', () => {
    expect(clamparAncho(20, 80)).toBe(80)
    expect(clamparAncho(5000, 80)).toBe(ANCHO_MAXIMO)
    expect(clamparAncho(150, 80)).toBe(150)
  })
  it('anchosValidos solo acepta registros de numeros positivos', () => {
    expect(anchosValidos({ a: 100 })).toBe(true)
    expect(anchosValidos({ a: 0 })).toBe(false)
    expect(anchosValidos({ a: '100' })).toBe(false)
    expect(anchosValidos({ a: NaN })).toBe(false)
    expect(anchosValidos([100])).toBe(false)
    expect(anchosValidos(null)).toBe(false)
  })
  it('anchosEfectivos usa guardado, inicial o base e ignora columnas desconocidas', () => {
    const cols = [{ id: 'a', anchoInicial: 200, anchoMinimo: 100 }, { id: 'b' }, { id: 'c', anchoMinimo: 120 }]
    expect(anchosEfectivos(cols, { a: 50, c: 300, zzz: 99 })).toEqual({ a: 100, b: ANCHO_BASE, c: 300 })
  })
})

describe('ordenar con cadena vacia', () => {
  const filas = [f('1', { nombre: 'Beto' }), f('2', { nombre: '' }), f('3', { nombre: 'Ana' }), f('4', { nombre: null })]
  it('la cadena vacia va al final en ambas direcciones', () => {
    expect(ordenarFilas(filas, cNombre, 'asc').map((r) => r.id)).toEqual(['3', '1', '2', '4'])
    expect(ordenarFilas(filas, cNombre, 'desc').map((r) => r.id)).toEqual(['1', '3', '2', '4'])
  })
  it('categoria tambien', () => {
    const c = col('ciudad', 'categoria')
    const r = [f('1', { ciudad: '' }), f('2', { ciudad: 'Ciudad A' })]
    expect(ordenarFilas(r, c, 'desc').map((x) => x.id)).toEqual(['2', '1'])
  })
  it('el colador compartido ignora acentos y mayusculas', () => {
    expect(COLADOR.compare('Árbol', 'arbol')).toBe(0)
  })
})

describe('filtro de texto combinado con lista de valores', () => {
  const filas = [f('1', { nombre: 'Ana Ciudad A' }), f('2', { nombre: 'Beto' }), f('3', { nombre: 'Anabel' }), f('4', { nombre: null })]
  const ids = (fs: Fila[]) => fs.map((r) => r.id)
  it('sin contiene y con ocultos solo excluye los ocultos', () => {
    const fl: Filtro = { tipo: 'texto', texto: '', ocultos: ['Beto'] }
    expect(filtroActivo(fl)).toBe(true)
    expect(ids(aplicarFiltros(filas, [cNombre], { nombre: fl }))).toEqual(['1', '3', '4'])
  })
  it('aplica contiene Y ocultos a la vez', () => {
    const fl: Filtro = { tipo: 'texto', texto: 'ana', ocultos: ['Anabel'] }
    expect(ids(aplicarFiltros(filas, [cNombre], { nombre: fl }))).toEqual(['1'])
  })
  it('solo contiene sigue funcionando y sin nada no esta activo', () => {
    expect(ids(aplicarFiltros(filas, [cNombre], { nombre: { tipo: 'texto', texto: 'ana' } }))).toEqual(['1', '3'])
    expect(filtroActivo({ tipo: 'texto', texto: ' ', ocultos: [] })).toBe(false)
  })
  it('los vacios se ocultan con la clave VACIO', () => {
    expect(ids(aplicarFiltros(filas, [cNombre], { nombre: { tipo: 'texto', texto: '', ocultos: [VACIO] } }))).toEqual(['1', '2', '3'])
  })
})
