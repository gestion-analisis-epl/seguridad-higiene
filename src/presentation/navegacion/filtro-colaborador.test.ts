import { describe, expect, it } from 'vitest'
import { MODULOS } from '@/domain/modulos-definiciones'
import { columnasDeModulo, filtrosInicialesDeModulo } from '@/presentation/datos/columnas-modulo'
import { aplicarFiltros } from '@/presentation/ui/tabla/logica'
import { estadoBase } from '@/presentation/ui/tabla/filtros-iniciales'
import { estadoGuardadoValido, sanearEstado } from '@/presentation/ui/tabla/estado'
import { leerJson, type Almacen } from '@/presentation/ui/persistencia'
import { estadoParaColaborador, prepararTablaColaboradores } from './filtro-colaborador'

const memoria = (): Almacen & { datos: Map<string, string> } => {
  const datos = new Map<string, string>()
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => { datos.set(k, v) } }
}
const def = MODULOS.colaboradores
const filas = [
  { id: '1', nombre: 'Ana Prueba', activo: true },
  { id: '2', nombre: 'Beto Ejemplo', activo: false },
  { id: '3', nombre: 'Ana Maria Inactiva', activo: false },
]

describe('filtro de colaborador desde la busqueda', () => {
  it('escribe bajo la clave de sesion de la tabla de colaboradores', () => {
    const a = memoria()
    expect(prepararTablaColaboradores('Ana Prueba', a)).toBe(true)
    expect(Array.from(a.datos.keys())).toEqual(['sh:v1:estado:tabla-colaboradores'])
  })

  it('sin almacen disponible no falla', () => {
    expect(prepararTablaColaboradores('Ana', null)).toBe(false)
  })

  it('el estado guardado pasa la validacion y el saneado sin perder el filtro', () => {
    const a = memoria()
    prepararTablaColaboradores('Ana Prueba', a)
    const guardado = leerJson(a, 'estado:tabla-colaboradores', estadoGuardadoValido, {})
    const columnas = columnasDeModulo(def, {})
    const iniciales = filtrosInicialesDeModulo(def)
    const estado = sanearEstado(estadoBase(guardado, true, iniciales), columnas, filas, iniciales)
    expect(estado.filtros).toEqual({ nombre: { tipo: 'texto', texto: 'Ana Prueba' } })
    expect(aplicarFiltros(filas, columnas, estado.filtros).map((f) => f.id)).toEqual(['1'])
  })

  it('muestra a un colaborador inactivo (no se aplica el filtro Activo por defecto)', () => {
    const columnas = columnasDeModulo(def, {})
    const iniciales = filtrosInicialesDeModulo(def)
    const estado = sanearEstado(estadoBase(estadoParaColaborador('Beto Ejemplo'), true, iniciales), columnas, filas, iniciales)
    expect(estado.filtros.activo).toBeUndefined()
    expect(aplicarFiltros(filas, columnas, estado.filtros).map((f) => f.id)).toEqual(['2'])
  })
})
