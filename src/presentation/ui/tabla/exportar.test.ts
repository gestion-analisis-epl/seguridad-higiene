import { describe, expect, it } from 'vitest'
import { anchoExcel, celdaExcel, hojaParaExcel, nombreArchivo } from './exportar'
import type { ColumnaTabla } from './tipos'

interface Fila { nombre: string; cantidad: number | null; fecha: Date | null; activo: boolean }

const columnas: ColumnaTabla<Fila>[] = [
  { id: 'nombre', encabezado: 'Colaborador', tipo: 'texto', valor: (f) => f.nombre },
  { id: 'cantidad', encabezado: 'Cantidad', tipo: 'numero', valor: (f) => f.cantidad },
  { id: 'fecha', encabezado: 'Fecha', tipo: 'fecha', valor: (f) => f.fecha },
  { id: 'activo', encabezado: 'Activo', tipo: 'booleano', valor: (f) => f.activo },
]
const dia = new Date(Date.UTC(2026, 2, 13, 12))

describe('celdaExcel', () => {
  it('conserva números, textos y fechas; los booleanos salen como Sí o No; lo vacío queda sin valor', () => {
    expect(celdaExcel(3)).toBe(3)
    expect(celdaExcel('x')).toBe('x')
    expect(celdaExcel(dia)).toBe(dia)
    expect(celdaExcel(true)).toBe('Sí')
    expect(celdaExcel(false)).toBe('No')
    for (const v of [null, undefined, NaN, new Date('x')]) expect(celdaExcel(v)).toBeNull()
  })
})

describe('anchoExcel', () => {
  it('convierte píxeles a caracteres dentro de un rango razonable', () => {
    expect(anchoExcel(140)).toBe(20)
    expect(anchoExcel(10)).toBe(10)
    expect(anchoExcel(5000)).toBe(60)
  })
})

describe('hojaParaExcel', () => {
  const filas: Fila[] = [
    { nombre: 'Ana', cantidad: 2, fecha: dia, activo: true },
    { nombre: 'Beto', cantidad: null, fecha: null, activo: false },
  ]
  it('arma encabezados, anchos y filas solo con las columnas dadas, en su orden', () => {
    const hoja = hojaParaExcel([columnas[2], columnas[0]], filas, { fecha: 126, nombre: 220 }, 'Entregas de EPP')
    expect(hoja.nombre).toBe('Entregas de EPP')
    expect(hoja.columnas).toEqual([{ encabezado: 'Fecha', ancho: 18 }, { encabezado: 'Colaborador', ancho: 31 }])
    expect(hoja.filas).toEqual([[dia, 'Ana'], [null, 'Beto']])
  })
  it('una columna sin ancho conocido usa el ancho base', () => {
    expect(hojaParaExcel([columnas[0]], filas, {}, 'T').columnas[0].ancho).toBe(23)
  })
})

describe('nombreArchivo', () => {
  it('usa el nombre sin acentos y la fecha local', () => {
    expect(nombreArchivo('Entregas de uniforme', new Date(2026, 9, 26, 23, 30))).toBe('entregas-de-uniforme-2026-10-26.xlsx')
    expect(nombreArchivo('Capacitación', new Date(2026, 0, 5))).toBe('capacitacion-2026-01-05.xlsx')
    expect(nombreArchivo('???', new Date(2026, 0, 5))).toBe('tabla-2026-01-05.xlsx')
  })
})
