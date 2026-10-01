import { describe, expect, it } from 'vitest'
import { fechaCalendario } from '@/domain/fechas'
import { claveEstadoTabla, estadoGuardadoValido, sanearEstado } from './estado'
import { paginar } from './paginacion'
import type { ColumnaTabla } from './tipos'

interface Fila { zona: string; nombre: string; edad: number; alta: Date | null; activo: boolean }
const filas: Fila[] = [
  { zona: 'Norte', nombre: 'Ana', edad: 30, alta: fechaCalendario(2024, 1, 5), activo: true },
  { zona: 'Sur', nombre: 'Beto', edad: 41, alta: fechaCalendario(2024, 2, 9), activo: false },
]
const columnas: ColumnaTabla<Fila>[] = [
  { id: 'zona', encabezado: 'Zona', tipo: 'categoria', valor: (f) => f.zona },
  { id: 'nombre', encabezado: 'Nombre', tipo: 'texto', valor: (f) => f.nombre },
  { id: 'edad', encabezado: 'Edad', tipo: 'numero', valor: (f) => f.edad },
  { id: 'alta', encabezado: 'Alta', tipo: 'fecha', valor: (f) => f.alta },
  { id: 'activo', encabezado: 'Activo', tipo: 'booleano', valor: (f) => f.activo },
  { id: 'acciones', encabezado: 'Acciones', tipo: 'texto', valor: () => '', ordenable: false, filtrable: false },
]
const sanear = (g: unknown, f: Fila[] = filas) => sanearEstado(g as never, columnas, f)

describe('estado de tabla persistido', () => {
  it('solo persiste con claveAnchos', () => {
    expect(claveEstadoTabla('anchos-x')).toBe('estado:anchos-x')
    expect(claveEstadoTabla(undefined)).toBeNull()
  })

  it('acepta solo objetos como forma guardada', () => {
    expect(estadoGuardadoValido({})).toBe(true)
    expect([null, [], 'x', 3].some(estadoGuardadoValido)).toBe(false)
  })

  it('conserva un estado valido de cada tipo de filtro', () => {
    const guardado = {
      filtros: {
        zona: { tipo: 'categoria', ocultos: ['Sur'] },
        nombre: { tipo: 'texto', texto: 'an', ocultos: ['Beto'] },
        edad: { tipo: 'numero', min: 18, max: null },
        alta: { tipo: 'fecha', desde: '2024-01-01', hasta: '' },
        activo: { tipo: 'booleano', valor: true },
      },
      orden: { id: 'edad', dir: 'desc' }, pagina: 2,
    }
    expect(sanear(guardado)).toEqual(guardado)
  })

  it('ignora columnas inexistentes, tipos distintos y no filtrables', () => {
    const r = sanear({ filtros: {
      fantasma: { tipo: 'texto', texto: 'x' },
      zona: { tipo: 'texto', texto: 'x' },
      acciones: { tipo: 'texto', texto: 'x' },
    } })
    expect(r.filtros).toEqual({})
  })

  it('descarta valores ocultos que ya no existen en categoria y texto-lista', () => {
    const r = sanear({ filtros: {
      zona: { tipo: 'categoria', ocultos: ['Sur', 'Oeste'] },
      nombre: { tipo: 'texto', texto: '', ocultos: ['Zoe'] },
    } })
    expect(r.filtros).toEqual({ zona: { tipo: 'categoria', ocultos: ['Sur'] } })
  })

  it('con filas aun sin cargar conserva los ocultos', () => {
    const r = sanear({ filtros: { zona: { tipo: 'categoria', ocultos: ['Sur'] } } }, [])
    expect(r.filtros.zona).toEqual({ tipo: 'categoria', ocultos: ['Sur'] })
  })

  it('descarta fechas y numeros invalidos', () => {
    const r = sanear({ filtros: {
      alta: { tipo: 'fecha', desde: '2024-13-40', hasta: '' },
      edad: { tipo: 'numero', min: 'x', max: null },
      activo: { tipo: 'booleano', valor: 'si' },
    } })
    expect(r.filtros).toEqual({})
    expect(sanear({ filtros: { edad: { tipo: 'numero', min: null, max: null } } }).filtros).toEqual({})
  })

  it('sanea el orden solo para columnas ordenables existentes', () => {
    expect(sanear({ orden: { id: 'nombre', dir: 'asc' } }).orden).toEqual({ id: 'nombre', dir: 'asc' })
    expect(sanear({ orden: { id: 'acciones', dir: 'asc' } }).orden).toBeNull()
    expect(sanear({ orden: { id: 'fantasma', dir: 'asc' } }).orden).toBeNull()
    expect(sanear({ orden: { id: 'nombre', dir: 'x' } }).orden).toBeNull()
  })

  it('pagina invalida vuelve a 1 y la valida se ajusta al total', () => {
    expect(sanear({ pagina: -2 }).pagina).toBe(1)
    expect(sanear({ pagina: 1.5 }).pagina).toBe(1)
    expect(sanear({ pagina: '3' }).pagina).toBe(1)
    expect(paginar(filas, sanear({ pagina: 40 }).pagina, 10).pagina).toBe(1)
  })

  it('forma corrupta cae a valores por defecto', () => {
    expect(sanear({ filtros: [], orden: 7, pagina: null })).toEqual({ filtros: {}, orden: null, pagina: 1 })
    expect(sanear({ filtros: { zona: null, nombre: 5 } }).filtros).toEqual({})
  })
})
