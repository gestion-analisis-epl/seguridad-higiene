import { describe, expect, it } from 'vitest'
import type { FilaCapacitacionExcel } from '@/domain/capacitaciones-excel'
import { deTextoIso } from '@/domain/fechas'
import {
  sincronizarCapacitaciones, type AlmacenCapacitaciones, type CapacitacionExistente, type ColaboradorCapacitacion,
} from './capacitaciones-sync'

const hoy = new Date(Date.UTC(2026, 9, 26, 12))
const NORMA = 'NOM-009-STPS-2011'

function almacen(colaboradores: ColaboradorCapacitacion[], existentes: CapacitacionExistente[] = []) {
  const guardadas = [...existentes]
  let escrituras = 0
  const a: AlmacenCapacitaciones = {
    leerColaboradores: async () => colaboradores,
    leerNormas: async () => [{ valor: 'nom-009-stps-2011', etiqueta: NORMA }],
    leerCapacitaciones: async () => guardadas,
    async escribir(ops) {
      escrituras++
      for (const op of ops) {
        const d = op.datos as Omit<CapacitacionExistente, 'id'>
        const i = guardadas.findIndex((g) => g.id === op.id)
        if (i >= 0) guardadas[i] = { ...guardadas[i], ...d }
        else guardadas.push({ id: `n${guardadas.length}`, ...d })
      }
    },
  }
  return { a, guardadas, escrituras: () => escrituras }
}

const ana: ColaboradorCapacitacion = { id: 'c1', nombre: 'Ana Pérez', activo: true, ciudad: 'queretaro' }
const fila = (extra: Partial<FilaCapacitacionExcel> = {}): FilaCapacitacionExcel =>
  ({ hoja: 'Q', fila: 5, nombre: 'ana perez', norma: NORMA, cumple: true, fecha: '2026-03-13', vencimiento: '2027-03-13', ...extra })
const correr = (a: AlmacenCapacitaciones, filas: FilaCapacitacionExcel[], simular = false) =>
  sincronizarCapacitaciones({ almacen: a, filas, simular, hoy })

describe('sincronizarCapacitaciones', () => {
  it('crea la capacitación con estado y ciudad del colaborador', async () => {
    const { a, guardadas } = almacen([ana])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ total: 1, nuevas: 1, actualizadas: 0, sinCambios: 0 })
    expect(guardadas[0]).toMatchObject({ colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: true, estado: 'vigente', ciudad: 'queretaro' })
    expect(guardadas[0].fecha).toEqual(deTextoIso('2026-03-13'))
  })
  it('lo pendiente se guarda como no cumple, sin fecha y en estado pendiente', async () => {
    const { a, guardadas } = almacen([ana])
    await correr(a, [fila({ cumple: false, fecha: null, vencimiento: null })])
    expect(guardadas[0]).toMatchObject({ cumple: false, fecha: null, vencimiento: null, estado: 'pendiente' })
  })
  it('simular cuenta pero no escribe', async () => {
    const { a, guardadas, escrituras } = almacen([ana])
    const r = await correr(a, [fila()], true)
    expect(r.nuevas).toBe(1)
    expect(escrituras()).toBe(0)
    expect(guardadas).toHaveLength(0)
  })
  it('actualiza la existente de la misma persona y norma', async () => {
    const previa: CapacitacionExistente = { id: 'k1', colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: false, fecha: null, vencimiento: null }
    const { a, guardadas } = almacen([ana], [previa])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ nuevas: 0, actualizadas: 1 })
    expect(guardadas).toHaveLength(1)
    expect(guardadas[0]).toMatchObject({ id: 'k1', cumple: true })
  })
  it('no retrocede si lo existente es más reciente o el Excel no trae fecha', async () => {
    const previa: CapacitacionExistente = { id: 'k1', colaborador_id: 'c1', norma: 'nom-009-stps-2011', cumple: true, fecha: deTextoIso('2026-09-18'), vencimiento: deTextoIso('2027-09-18') }
    const { a, guardadas } = almacen([ana], [previa])
    expect((await correr(a, [fila()])).noRetrocedidas).toBe(1)
    expect((await correr(a, [fila({ cumple: false, fecha: null, vencimiento: null })])).noRetrocedidas).toBe(1)
    expect(guardadas[0].fecha).toEqual(deTextoIso('2026-09-18'))
  })
  it('es idempotente: la segunda corrida no cambia nada', async () => {
    const { a, escrituras } = almacen([ana])
    await correr(a, [fila()])
    const r = await correr(a, [fila()])
    expect(r).toMatchObject({ nuevas: 0, actualizadas: 0, sinCambios: 1 })
    expect(escrituras()).toBe(1)
  })
  it('incluye colaboradores inactivos', async () => {
    const { a, guardadas } = almacen([{ ...ana, activo: false }])
    await correr(a, [fila()])
    expect(guardadas).toHaveLength(1)
  })
  it('con homónimos elige al único activo y si no, reporta ambigua', async () => {
    const otro = { ...ana, id: 'c2', activo: false }
    const uno = almacen([ana, otro])
    await correr(uno.a, [fila()])
    expect(uno.guardadas[0].colaborador_id).toBe('c1')
    const dos = almacen([ana, { ...otro, activo: true }])
    const r = await correr(dos.a, [fila()])
    expect(r.ambiguas).toEqual(['ana perez'])
    expect(dos.guardadas).toHaveLength(0)
  })
  it('reporta sin coincidencia sin repetir nombres', async () => {
    const { a } = almacen([ana])
    const r = await correr(a, [fila({ nombre: 'Zoe Luna' }), fila({ nombre: 'Zoe Luna', fila: 9 })])
    expect(r.sinCoincidencia).toEqual(['Zoe Luna'])
  })
  it('rechaza normas fuera del catálogo y acepta la 2012 como 2011', async () => {
    const { a, guardadas } = almacen([ana])
    const r = await correr(a, [fila({ norma: 'NOM-999', fila: 7 }), fila({ norma: 'NOM-009-STPS-2012' })])
    expect(r.rechazadas).toEqual([{ hoja: 'Q', fila: 7, motivo: 'La norma "NOM-999" no está en el catálogo' }])
    expect(guardadas).toHaveLength(1)
  })
  it('compara los nombres sin acentos ni mayúsculas', async () => {
    const { a } = almacen([ana])
    expect((await correr(a, [fila({ nombre: 'ANA PEREZ' })])).nuevas).toBe(1)
  })
})
