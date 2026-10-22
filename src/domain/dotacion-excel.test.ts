import { describe, expect, it } from 'vitest'
import { leerPuestos, planearImportacion, type CatalogosImportacion, type HojaLeida } from './dotacion-excel'
import type { ReglaDotacion } from './reglas-dotacion'

// Encabezado: fila de regiones, fila de incisos; luego puesto, departamento y las X
const hoja = (nombre: string, puestos: [string, string, string[]][]): HojaLeida => {
  const ancho = 3 + 4
  const fila = (): string[] => Array(ancho).fill('')
  const regiones = fila(); regiones[3] = '1.0'; regiones[5] = '2.0'
  const incisos = fila(); ;['A', 'B', 'A', 'B'].forEach((l, i) => { incisos[3 + i] = l })
  const filas = [fila(), regiones, incisos]
  for (const [puesto, depto, marcas] of puestos) {
    const f = fila(); f[1] = puesto; f[2] = depto
    marcas.forEach((m) => { f[3 + ['1:A', '1:B', '2:A', '2:B'].indexOf(m)] = 'X' })
    filas.push(f)
  }
  return { nombre, filas: [fila(), ...filas] }
}

const catalogos: CatalogosImportacion = {
  lineas: [{ valor: 'mktqro', etiqueta: 'Marketing en Publicidad de Queretaro', nombre_corto: 'MKTQRO' }],
  ciudades: [
    { valor: 'aguascalientes', etiqueta: 'Aguascalientes', nombre_corto: 'AGS' },
    { valor: 'leon', etiqueta: 'León' },
  ],
  areas: [{ valor: 'operaciones', etiqueta: 'Operaciones' }, { valor: 'mantenimiento', etiqueta: 'Mantenimiento' }],
  tiposEpp: [
    { valor: 'casco', etiqueta: 'Casco contra impactos', region: 'cabeza' },
    { valor: 'dielectrico', etiqueta: 'Casco dielectrico', region: 'cabeza' },
    { valor: 'gafas', etiqueta: 'Anteojos', region: 'ojos-y-cara' },
    { valor: 'goggles', etiqueta: 'Gafas', region: 'ojos-y-cara' },
  ],
}
const sinDecisiones = { hojas: {}, conflictos: {} }

describe('leerPuestos', () => {
  it('lee puesto, departamento y los incisos marcados por región', () => {
    const r = leerPuestos(hoja('MKTQRO AGS', [['Jefe de cuadrilla', 'Operaciones', ['1:A', '2:B']]]))
    expect(r).toEqual([{
      hoja: 'MKTQRO AGS', puesto: 'Jefe de cuadrilla', departamento: 'Operaciones',
      codigos: [{ region: 1, letra: 'A' }, { region: 2, letra: 'B' }],
    }])
  })
  it('acepta la x minúscula y se detiene en la primera fila sin puesto', () => {
    const h = hoja('H', [['Uno', 'Operaciones', ['1:A']], ['', '', ['1:B']], ['Dos', 'Operaciones', ['1:B']]])
    h.filas[4][3] = 'x'
    expect(leerPuestos(h).map((p) => p.puesto)).toEqual(['Uno'])
    expect(leerPuestos(h)[0].codigos).toEqual([{ region: 1, letra: 'A' }])
  })
  it('lee la matriz sin columna de departamento', () => {
    const filas = [
      [], ['', 'Puesto de trabajo', '1.0', '', '2.0'], ['', '', 'A', 'B', 'A'],
      ['', 'Soldador', 'X', '', 'X'], ['', 'Ayudante', '', 'X'],
    ]
    expect(leerPuestos({ nombre: 'Hoja2', filas })).toEqual([
      { hoja: 'Hoja2', puesto: 'Soldador', departamento: '', codigos: [{ region: 1, letra: 'A' }, { region: 2, letra: 'A' }] },
      { hoja: 'Hoja2', puesto: 'Ayudante', departamento: '', codigos: [{ region: 1, letra: 'B' }] },
    ])
  })
  it('devuelve vacío cuando la hoja no trae la matriz', () => {
    expect(leerPuestos({ nombre: 'Notas', filas: [['hola', 'mundo']] })).toEqual([])
  })
})

describe('planearImportacion', () => {
  it('cruza empresa, ciudad por nombre corto, área y EPP contra los catálogos', () => {
    const plan = planearImportacion([hoja('MKTQRO AGS', [['Jefe de cuadrilla', 'Operaciones', ['1:A', '2:B']]])], catalogos, [], sinDecisiones)
    expect(plan.problemas).toEqual([])
    expect(plan.reglas).toEqual([{
      id: 'mktqro__jefe-de-cuadrilla__aguascalientes__operaciones', linea_negocio: 'mktqro', puesto_etiqueta: 'Jefe de Cuadrilla',
      ciudad: 'aguascalientes', area: 'operaciones', tipos_epp: ['casco', 'goggles'], hojas: ['MKTQRO AGS'], accion: 'crear',
    }])
  })
  it('marca como actualizar la regla que ya existe', () => {
    const existente = { id: 'mktqro__jefe-de-cuadrilla__aguascalientes__operaciones' } as ReglaDotacion
    const plan = planearImportacion([hoja('MKTQRO AGS', [['Jefe de cuadrilla', 'Operaciones', ['1:A']]])], catalogos, [existente], sinDecisiones)
    expect(plan.reglas[0].accion).toBe('actualizar')
  })
  it('pide la ciudad cuando el nombre de la hoja no la identifica y respeta la decisión', () => {
    const h = hoja('MKTQRO LEN Electricos', [['Ayudante', 'Operaciones', ['1:A']]])
    const sin = planearImportacion([h], catalogos, [], sinDecisiones)
    expect(sin.reglas).toEqual([])
    expect(sin.hojasPendientes).toEqual([{ hoja: 'MKTQRO LEN Electricos', linea: 'mktqro', ciudad: null }])
    const con = planearImportacion([h], catalogos, [], { hojas: { 'MKTQRO LEN Electricos': { ciudad: 'leon' } }, conflictos: {} })
    expect(con.hojasPendientes).toEqual([])
    expect(con.reglas[0].id).toBe('mktqro__ayudante__leon__operaciones')
  })
  it('no genera la regla si el departamento o el EPP no están en el catálogo', () => {
    const plan = planearImportacion([hoja('MKTQRO AGS', [['A', 'Ventas', ['1:A']], ['B', 'Operaciones', ['1:B', '2:B']]])],
      { ...catalogos, tiposEpp: catalogos.tiposEpp.slice(0, 1) }, [], sinDecisiones)
    expect(plan.reglas).toEqual([])
    expect(plan.problemas).toHaveLength(2)
    expect(plan.problemas[0]).toContain('Ventas')
    expect(plan.problemas[1]).toContain('1:B')
  })
  it('une hojas con el mismo EPP y pide elegir cuando difieren', () => {
    const a = hoja('MKTQRO LEN Electricos', [['Jefe', 'Operaciones', ['1:A']]])
    const b = hoja('MKTQRO LEN Instalación', [['Jefe', 'Operaciones', ['1:A']]])
    const d = { hojas: { [a.nombre]: { ciudad: 'leon' }, [b.nombre]: { ciudad: 'leon' } }, conflictos: {} }
    const igual = planearImportacion([a, b], catalogos, [], d)
    expect(igual.conflictos).toEqual([])
    expect(igual.reglas[0].hojas).toEqual([a.nombre, b.nombre])
    b.filas[4][4] = 'X'
    const dif = planearImportacion([a, b], catalogos, [], d)
    expect(dif.reglas).toEqual([])
    expect(dif.conflictos).toHaveLength(1)
    expect(dif.conflictos[0].opciones.map((o) => o.hoja)).toEqual([a.nombre, b.nombre])
    const elegido = planearImportacion([a, b], catalogos, [], { ...d, conflictos: { [dif.conflictos[0].id]: a.nombre } })
    expect(elegido.conflictos).toEqual([])
    expect(elegido.reglas[0].tipos_epp).toEqual(['casco'])
    expect(elegido.reglas[0].hojas).toEqual([a.nombre])
  })
})

describe('planearImportacion con archivo de una sola empresa', () => {
  const filas = [[], ['', 'Puesto', '1.0', '', '2.0'], ['', '', 'A', 'B', 'A'], ['', 'Soldador', 'X', '', 'X']]
  const hoja2: HojaLeida = { nombre: 'Hoja2', filas }
  const cat: CatalogosImportacion = {
    ...catalogos,
    lineas: [{ valor: 'the-best', etiqueta: 'THE BEST MARKETING', nombre_corto: 'THE BEST' }],
  }
  it('toma la empresa del nombre del archivo y aplica a todas las ciudades', () => {
    const plan = planearImportacion([hoja2], cat, [], sinDecisiones, 'THE BEST.xlsx')
    expect(plan.hojasPendientes).toEqual([])
    expect(plan.reglas).toMatchObject([{ id: 'the-best__soldador__todas', linea_negocio: 'the-best', ciudad: null, area: null, accion: 'crear' }])
  })
  it('acepta un prefijo único del nombre completo', () => {
    const plan = planearImportacion([hoja2], { ...cat, lineas: [{ valor: 'tb', etiqueta: 'The Best Marketing' }] }, [], sinDecisiones, 'THE BEST.xlsx')
    expect(plan.reglas[0].linea_negocio).toBe('tb')
  })
  it('pide la empresa cuando ni la hoja ni el archivo la dicen', () => {
    const plan = planearImportacion([hoja2], cat, [], sinDecisiones, 'Otro.xlsx')
    expect(plan.hojasPendientes).toEqual([{ hoja: 'Hoja2', linea: null, ciudad: null }])
    const con = planearImportacion([hoja2], cat, [], { hojas: { Hoja2: { linea: 'the-best' } }, conflictos: {} }, 'Otro.xlsx')
    expect(con.reglas[0].ciudad).toBeNull()
  })
})
