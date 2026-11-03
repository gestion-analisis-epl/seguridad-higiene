import { describe, expect, it } from 'vitest'
import type { Alerta, Pendiente, ResumenCiudad } from '@/application/dashboard'
import { fechaCalendario } from '@/domain/fechas'
import { atributosAlerta, columnasAlertas, columnasDetalleAlertas, columnasDetalleColaboradores, columnasPendientes, columnasPorCiudad, porcentaje } from './columnas-operativo'

const VACIA = { fraccion: null, entregados: 0, exigidos: 0, completos: 0, evaluados: 0 }
const SIN_COBERTURA = { coberturaUniforme: VACIA, coberturaEpp: VACIA }

const etiqueta = (v: string) => (v === 'ciudad-a' ? 'Ciudad A' : v)

describe('columnas operativas', () => {
  const alerta: Alerta = {
    origen: 'vehiculo_extintor', ciudad: 'ciudad-a', referencia: 'ABC-1',
    vencimiento: fechaCalendario(2026, 9, 20), dias: -10, estado: 'vencido',
  }
  it('alertas: estado con texto, origen legible y ciudad por etiqueta', () => {
    const v = (id: string) => columnasAlertas(etiqueta).find((c) => c.id === id)!.valor(alerta)
    expect(v('estado')).toBe('Vencido')
    expect(v('origen')).toBe('vehiculo extintor')
    expect(v('ciudad')).toBe('Ciudad A')
    expect(v('dias')).toBe(-10)
    expect(atributosAlerta(alerta)).toEqual({ 'data-estado': 'vencido' })
  })
  it('pendientes: estado de capacitación y guion cuando no falta nada', () => {
    const p: Pendiente = {
      colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', area: 'Área X' },
      capacitacionPendiente: false, sinRegla: false, prendasFaltantes: [], eppFaltantes: ['casco', 'guantes'],
    }
    const v = (id: string) => columnasPendientes(etiqueta).find((c) => c.id === id)!.valor(p)
    expect(v('capacitacion')).toBe('Vigente')
    expect(v('uniforme')).toBe('-')
    expect(v('epp')).toBe('casco, guantes')
    expect(v('area')).toBe('Área X')
  })
  it('por ciudad: porcentajes enteros', () => {
    const r: ResumenCiudad = { ciudad: 'ciudad-a', activos: 3, pctCapacitacion: 2 / 3, pctUniforme: 1, pctEpp: 0, ...SIN_COBERTURA, sinRegla: 0 }
    const v = (id: string) => columnasPorCiudad(etiqueta).find((c) => c.id === id)!.valor(r)
    expect(v('cap')).toBe(67)
    expect(v('epp')).toBe(0)
    expect(v('ciudad')).toBe('Ciudad A')
    expect(porcentaje(0.5)).toBe(50)
  })
  it('por ciudad: sin reglas el porcentaje queda vacío y no hay columna de colaboradores sin regla', () => {
    const r: ResumenCiudad = { ciudad: 'ciudad-a', activos: 3, pctCapacitacion: 1, pctUniforme: null, pctEpp: null, ...SIN_COBERTURA, sinRegla: 3 }
    const col = (id: string) => columnasPorCiudad(etiqueta).find((c) => c.id === id)!
    expect(col('uniforme').valor(r)).toBeNull()
    expect(col('uniforme').celda?.(r)).toBe('—')
    expect(columnasPorCiudad(etiqueta).some((c) => c.id === 'sinregla')).toBe(false)
  })
  it('detalle: agrega empresa y fecha de ingreso del colaborador justo después del nombre', () => {
    const ingreso = new Date(Date.UTC(2026, 2, 13, 12))
    const base: Pendiente = {
      colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', empresa: 'MKTQRO', fecha_ingreso: ingreso },
      capacitacionPendiente: false, sinRegla: false, prendasFaltantes: [], eppFaltantes: [],
    }
    const cols = columnasDetalleColaboradores(columnasPendientes(etiqueta))
    expect(cols.map((c) => c.id).slice(0, 3)).toEqual(['colaborador', 'empresa', 'ingreso'])
    expect(cols.map((c) => c.id)).toContain('capacitacion')
    const v = (id: string, p: Pendiente) => cols.find((c) => c.id === id)!.valor(p)
    expect(v('empresa', base)).toBe('MKTQRO')
    expect(v('ingreso', base)).toBe(ingreso)
    const sinDatos = { ...base, colaborador: { ...base.colaborador, empresa: undefined, fecha_ingreso: undefined } }
    expect(v('empresa', sinDatos)).toBeNull()
    expect(v('ingreso', sinDatos)).toBeNull()
    expect(cols.find((c) => c.id === 'ingreso')!.tipo).toBe('fecha')
  })
  it('alertas: empresa y fecha de ingreso después de la referencia; vacías si la alerta no es de una persona', () => {
    const ingreso = new Date(Date.UTC(2025, 5, 1, 12))
    const deAna: Alerta = {
      origen: 'capacitacion', ciudad: 'ciudad-a', referencia: 'Ana', vencimiento: fechaCalendario(2026, 9, 20), dias: -10, estado: 'vencido',
      colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', empresa: 'MKTQRO', fecha_ingreso: ingreso },
    }
    const cols = columnasDetalleAlertas(columnasAlertas(etiqueta))
    expect(cols.map((c) => c.id)).toEqual(['estado', 'origen', 'referencia', 'empresa', 'ingreso', 'ciudad', 'vencimiento', 'dias'])
    const v = (id: string, a: Alerta) => cols.find((c) => c.id === id)!.valor(a)
    expect(v('empresa', deAna)).toBe('MKTQRO')
    expect(v('ingreso', deAna)).toBe(ingreso)
    const equipo: Alerta = { ...deAna, origen: 'extintor', referencia: 'Extintor', colaborador: undefined }
    expect(v('empresa', equipo)).toBeNull()
    expect(v('ingreso', equipo)).toBeNull()
  })
  it('pendientes: la regla de dotación es cosa de administración y no sale en el dashboard', () => {
    expect(columnasPendientes(etiqueta).some((c) => c.id === 'regla')).toBe(false)
  })
})
