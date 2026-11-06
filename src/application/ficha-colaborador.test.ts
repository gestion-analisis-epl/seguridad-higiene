import { describe, expect, it } from 'vitest'
import type { Colaborador, DatosOperativos } from '@/domain/entidades'
import { fechaCalendario } from '@/domain/fechas'
import type { Dotacion, ReglaDotacion } from '@/domain/reglas-dotacion'
import { datosGenerales, fichaDeColaborador, registrosDelColaborador } from './ficha-colaborador'

const hoy = new Date(2026, 8, 30)
const regla = (agrega: string[]): ReglaDotacion => ({
  id: 'r', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'Guardia', ciudad: null, area: null, agrega, quita: [],
})
const dotacion: Dotacion = { uniforme: [regla(['botas', 'playera'])], epp: [regla(['casco'])] }
const persona = (o: Partial<Colaborador> = {}): Colaborador => ({
  id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', puesto: 'Guardia',
  normas_obligatorias: ['norma-a', 'norma-b'], activo: true, ...o,
})
const datos = (colaboradores: Colaborador[]): DatosOperativos => ({
  colaboradores,
  capacitaciones: [{ colaborador_id: 'c1', norma: 'norma-a', ciudad: 'ciudad-a', cumple: true, fecha: fechaCalendario(2026, 5, 4), vencimiento: fechaCalendario(2027, 5, 4) }],
  entregasUniforme: [{ colaborador_id: 'c1', prenda: 'botas' }],
  entregasEpp: [], equipoOficinas: [], vehiculos: [],
})

describe('fichaDeColaborador', () => {
  it('devuelve null si el colaborador no existe', () => {
    expect(fichaDeColaborador(datos([persona()]), 'zz', hoy, dotacion)).toBeNull()
  })

  it('calcula lo que le falta solo a esa persona', () => {
    const ficha = fichaDeColaborador(datos([persona(), persona({ id: 'c2', nombre: 'Beto' })]), 'c1', hoy, dotacion)!
    expect(ficha.colaborador.nombre).toBe('Ana')
    expect(ficha.pendientes).toMatchObject({ normas: ['norma-b'], exigeCapacitacion: true })
    expect(ficha.pendientes!.evaluacion).toMatchObject({ capacitacionPendiente: true, prendasFaltantes: ['playera'], eppFaltantes: ['casco'] })
  })

  it('sin normas asignadas no exige capacitación', () => {
    const ficha = fichaDeColaborador(datos([persona({ normas_obligatorias: [] })]), 'c1', hoy, dotacion)!
    expect(ficha.pendientes).toMatchObject({ normas: [], exigeCapacitacion: false })
  })

  it('un colaborador de baja no se evalúa', () => {
    const ficha = fichaDeColaborador(datos([persona({ activo: false })]), 'c1', hoy, dotacion)!
    expect(ficha.pendientes).toBeNull()
  })
})

describe('registrosDelColaborador', () => {
  it('conserva solo los registros del colaborador', () => {
    const r = [{ id: 'a', colaborador_id: 'c1' }, { id: 'b', colaborador_id: 'c2' }, { id: 'c' }]
    expect(registrosDelColaborador(r, 'c1')).toEqual([{ id: 'a', colaborador_id: 'c1' }])
  })
})

describe('datosGenerales', () => {
  const etiquetas = {
    ciudad: (v: string) => `Ciudad ${v}`, area: (v: string) => `Área ${v}`,
    cuadrilla: (v: string) => v.toUpperCase(), linea_negocio: (v: string) => `Sicmart Sa de Cv ${v}`,
  }
  const registro = {
    numero_colaborador: '2116', id_interno: '12062', puesto: 'INSTALADOR DE LONAS', empresa: 'SICMART SA DE CV', linea_negocio: 'x', ciudad: 'leon',
    plaza: 'AGUASCALIENTES', zona: 'Bajío Norte', area: 'seg', cuadrilla: 'ags001', jefe: 'ADRIAN RESENDIZ MACIAS', gerente: 'PAULINA MUÑOZ',
    fecha_ingreso: fechaCalendario(2026, 9, 28),
  }
  const mapa = (d: { etiqueta: string; valor: string }[]) => Object.fromEntries(d.map((x) => [x.etiqueta, x.valor]))

  it('muestra todo en formato oración y los nombres de personas con mayúscula inicial', () => {
    expect(mapa(datosGenerales(registro, etiquetas))).toMatchObject({
      'Número de colaborador': '2116', 'ID interno': '12062', Puesto: 'Instalador de lonas', Empresa: 'Sicmart SA de CV',
      Plaza: 'Aguascalientes', Zona: 'Bajío norte', Ciudad: 'Ciudad leon', 'Área': 'Área seg', Cuadrilla: 'AGS001',
      Jefe: 'Adrian Resendiz Macias', Gerente: 'Paulina Muñoz', 'Fecha de ingreso': '28/09/2026',
    })
  })

  it('la línea de negocio se llama empresa abreviada y va en mayúsculas', () => {
    const d = mapa(datosGenerales(registro, etiquetas))
    expect(d['Empresa abreviada']).toBe('SICMART SA DE CV X')
    expect('Línea de negocio' in d).toBe(false)
  })

  it('los datos vacíos se muestran con guion y la baja solo si existe', () => {
    const sinBaja = mapa(datosGenerales({ ...registro, cuadrilla: undefined }, etiquetas))
    expect(sinBaja.Cuadrilla).toBe('-')
    expect('Fecha de baja' in sinBaja).toBe(false)
    const conBaja = mapa(datosGenerales({ ...registro, fecha_baja: fechaCalendario(2026, 10, 1), motivo_baja: 'RENUNCIA VOLUNTARIA' }, etiquetas))
    expect(conBaja).toMatchObject({ 'Fecha de baja': '01/10/2026', 'Motivo de baja': 'Renuncia voluntaria' })
  })
})
