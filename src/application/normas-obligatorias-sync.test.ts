import { describe, expect, it } from 'vitest'
import type { FilaNormasExcel } from '@/domain/normas-obligatorias-excel'
import { sincronizarNormasObligatorias, type AlmacenNormas, type ColaboradorNormas } from './normas-obligatorias-sync'

function almacen(colaboradores: ColaboradorNormas[]) {
  const guardado: { id: string; normas: string[] }[] = []
  const a: AlmacenNormas = {
    leerColaboradores: async () => colaboradores,
    leerNormas: async () => [{ valor: 'nom-009', etiqueta: 'NOM-009-STPS-2011' }, { valor: 'nom-027', etiqueta: 'NOM-027-STPS-2008' }],
    guardar: async (x) => { guardado.push(...x) },
  }
  return { a, guardado }
}
const ana: ColaboradorNormas = { id: 'c1', nombre: 'Ana Pérez', activo: true, normas: [] }
const fila = (nombre: string, normas: Record<string, boolean>): FilaNormasExcel => ({ hoja: 'H', fila: 2, nombre, normas })

describe('sincronizarNormasObligatorias', () => {
  it('guarda las normas con X usando el valor del catálogo', async () => {
    const { a, guardado } = almacen([ana])
    const r = await sincronizarNormasObligatorias({ almacen: a, simular: false, filas: [fila('ana perez', { 'NOM-009-STPS-2011': true, 'NOM-027-STPS-2008': false })] })
    expect(guardado).toEqual([{ id: 'c1', normas: ['nom-009'] }])
    expect(r).toMatchObject({ actualizados: 1, sinCambios: 0 })
  })
  it('quien tiene todo en N/A queda con lista vacía', async () => {
    const { a, guardado } = almacen([{ ...ana, normas: ['nom-009'] }])
    await sincronizarNormasObligatorias({ almacen: a, simular: false, filas: [fila('Ana Perez', { 'NOM-009-STPS-2011': false })] })
    expect(guardado).toEqual([{ id: 'c1', normas: [] }])
  })
  it('simular no escribe y lo igual cuenta como sin cambios', async () => {
    const { a, guardado } = almacen([{ ...ana, normas: ['nom-009'] }, { id: 'c2', nombre: 'Beto', activo: true, normas: [] }])
    const r = await sincronizarNormasObligatorias({ almacen: a, simular: true, filas: [fila('Ana Pérez', { 'NOM-009-STPS-2011': true }), fila('Beto', { 'NOM-009-STPS-2011': true })] })
    expect(guardado).toEqual([])
    expect(r).toMatchObject({ simulacion: true, actualizados: 1, sinCambios: 1 })
  })
  it('una norma fuera del catálogo detiene la escritura y se informa', async () => {
    const { a, guardado } = almacen([ana])
    const r = await sincronizarNormasObligatorias({ almacen: a, simular: false, filas: [fila('Ana Pérez', { 'NOM-099': true })] })
    expect(guardado).toEqual([])
    expect(r.normasDesconocidas).toEqual(['NOM-099'])
  })
  it('informa sin coincidencia, ambiguas y activos fuera del archivo', async () => {
    const { a } = almacen([ana, { id: 'c2', nombre: 'Beto', activo: true, normas: [] }, { id: 'c3', nombre: 'Beto', activo: true, normas: [] }, { id: 'c4', nombre: 'Dani', activo: true, normas: [] }])
    const r = await sincronizarNormasObligatorias({ almacen: a, simular: true, filas: [fila('Ana Pérez', {}), fila('Beto', {}), fila('Nadie', {})] })
    expect(r).toMatchObject({ sinCoincidencia: ['Nadie'], ambiguas: ['Beto'], fueraDelArchivo: 3 })
  })
})
