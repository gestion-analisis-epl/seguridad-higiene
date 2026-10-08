import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import {
  campoVisible, caducidadMasProxima, derivarCiudad, derivarPeriodo, formatearValor, limpiarOcultos,
  sanitizarValores, validarCampos, validarRegistro,
  type CampoDef, type ModuloDef,
} from './modulos'

const def: ModuloDef = {
  id: 'x', coleccion: 'x', titulo: 'X', columnas: [],
  campos: [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano', requerido: true },
    { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'texto', patron: /^\d{4}-\d{2}$/, mensajePatron: 'Formato AAAA-MM' },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: [{ valor: 'a', etiqueta: 'A' }] },
  ],
}

describe('validarRegistro', () => {
  it('marca obligatorios vacíos, pero no booleanos en false', () => {
    const e = validarRegistro(def, { nombre: '', cantidad: null, activo: false })
    expect(e).toEqual({ nombre: 'Obligatorio', cantidad: 'Obligatorio' })
  })
  it('valida números, fechas, patrón y opciones', () => {
    const e = validarRegistro(def, {
      nombre: 'a', cantidad: -1, activo: true, fecha: new Date('x'), periodo: '2026', tipo: 'z',
    })
    expect(e).toEqual({
      cantidad: 'Número inválido', fecha: 'Fecha inválida', periodo: 'Formato AAAA-MM', tipo: 'Opción inválida',
    })
  })
  it('acepta un registro correcto', () => {
    const v = { nombre: 'a', cantidad: 0, activo: true, fecha: fechaCalendario(2026, 8, 1), periodo: '2026-08', tipo: 'a' }
    expect(validarRegistro(def, v)).toEqual({})
  })
})

describe('formatearValor', () => {
  const campo = (tipo: CampoDef['tipo']): CampoDef => ({ nombre: 'c', etiqueta: 'C', tipo })
  it('formatea por tipo', () => {
    expect(formatearValor(campo('fecha'), fechaCalendario(2026, 8, 31))).toBe('31/08/2026')
    expect(formatearValor(campo('booleano'), true)).toBe('Sí')
    expect(formatearValor(campo('booleano'), false)).toBe('No')
    expect(formatearValor(campo('seleccion'), 'a', [{ valor: 'a', etiqueta: 'Alfa' }])).toBe('Alfa')
    expect(formatearValor(campo('seleccion'), 'zz')).toBe('zz')
    expect(formatearValor(campo('texto'), null)).toBe('-')
  })
})

describe('derivaciones', () => {
  it('toma la ciudad del colaborador', () => {
    const ctx = { ciudadDeColaborador: (id: string) => (id === 'c1' ? 'ciudad-a' : null) }
    expect(derivarCiudad({ colaborador_id: 'c1' }, ctx).ciudad).toBe('ciudad-a')
    expect(derivarCiudad({ colaborador_id: 'x' }, ctx).ciudad).toBeNull()
  })
  it('calcula el periodo desde una fecha', () => {
    expect(derivarPeriodo({ fecha: fechaCalendario(2026, 8, 24) }, 'fecha').periodo).toBe('2026-08')
    expect(derivarPeriodo({ fecha: null }, 'fecha').periodo).toBeNull()
  })
})

const botiquin: CampoDef[] = [
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'texto' },
  {
    nombre: 'items', etiqueta: 'Contenido', tipo: 'lista', visibleSi: (v) => v.tipo === 'botiquin',
    subcampos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
      { nombre: 'caducidad', etiqueta: 'Caducidad', tipo: 'fecha' },
    ],
  },
  { nombre: 'notas', etiqueta: 'Notas', tipo: 'texto', requerido: true, visibleSi: (v) => v.tipo !== 'botiquin' },
]

describe('derivarCiudad con copia del colaborador', () => {
  it('agrega la copia cuando el contexto la provee y conserva la ciudad', () => {
    const ctx = {
      ciudadDeColaborador: () => 'leon',
      copiaDeColaborador: () => ({ colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: null }),
    }
    expect(derivarCiudad({ colaborador_id: 'a' }, ctx)).toEqual({
      colaborador_id: 'a', ciudad: 'leon', colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: null,
    })
  })

  it('sin copia en el contexto solo agrega la ciudad', () => {
    expect(derivarCiudad({ colaborador_id: 'a' }, { ciudadDeColaborador: () => 'leon' })).toEqual({ colaborador_id: 'a', ciudad: 'leon' })
  })
})

describe('validarCampos con listas', () => {
  it('direcciona errores por fila y subcampo', () => {
    const e = validarCampos(botiquin, {
      tipo: 'botiquin',
      items: [{ nombre: 'Gasas', cantidad: 2, caducidad: null }, { nombre: '', cantidad: -1, caducidad: new Date('x') }],
    })
    expect(e).toEqual({
      'items.1.nombre': 'Obligatorio', 'items.1.cantidad': 'Número inválido', 'items.1.caducidad': 'Fecha inválida',
    })
  })
  it('acepta lista vacía o ausente y no valida campos ocultos', () => {
    expect(validarCampos(botiquin, { tipo: 'botiquin', items: [] })).toEqual({})
    expect(validarCampos(botiquin, { tipo: 'botiquin' })).toEqual({})
    expect(validarCampos(botiquin, { tipo: 'extintor', items: [{ nombre: '' }] })).toEqual({ notas: 'Obligatorio' })
  })
})

describe('visibilidad', () => {
  it('limpiarOcultos pone en null los campos no visibles', () => {
    const v = limpiarOcultos(botiquin, { tipo: 'extintor', items: [{ nombre: 'Gasas' }], notas: 'x' })
    expect(v).toEqual({ tipo: 'extintor', items: null, notas: 'x' })
    expect(campoVisible(botiquin[1], { tipo: 'botiquin' })).toBe(true)
  })
})

describe('caducidadMasProxima', () => {
  const a = new Date(2026, 10, 1)
  const b = new Date(2026, 9, 1)
  it('devuelve la fecha más temprana o null', () => {
    expect(caducidadMasProxima([{ caducidad: a }, { caducidad: null }, { caducidad: b }])).toBe(b)
    expect(caducidadMasProxima([{ nombre: 'Gasas' }])).toBeNull()
    expect(caducidadMasProxima(null)).toBeNull()
  })
})

describe('formatearValor de lista', () => {
  it('resume la cantidad de ítems', () => {
    expect(formatearValor(botiquin[1], [{ nombre: 'Gasas' }, { nombre: 'Venda' }])).toBe('2 ítems')
    expect(formatearValor(botiquin[1], [{ nombre: 'Gasas' }])).toBe('1 ítem')
    expect(formatearValor(botiquin[1], [])).toBe('-')
  })
})

describe('sanitizarValores', () => {
  const campos: CampoDef[] = [
    { nombre: 'nombre', etiqueta: 'N', tipo: 'texto', formato: 'titulo' },
    { nombre: 'placa', etiqueta: 'P', tipo: 'texto', formato: 'placa' },
    { nombre: 'detalle', etiqueta: 'D', tipo: 'texto', formato: 'libre' },
    { nombre: 'otro', etiqueta: 'O', tipo: 'texto' },
    { nombre: 'periodo', etiqueta: 'Pe', tipo: 'texto', patron: /^\d{4}-\d{2}$/ },
    { nombre: 'cantidad', etiqueta: 'C', tipo: 'numero' },
    { nombre: 'items', etiqueta: 'I', tipo: 'lista', subcampos: [{ nombre: 'nombre', etiqueta: 'N', tipo: 'texto' }] },
  ]
  it('aplica el formato de cada campo', () => {
    const r = sanitizarValores(campos, {
      nombre: ' JUAN  PEREZ ', placa: ' ab 12 ', detalle: ' a  b\n\n\n\nc ', otro: ' x \n y ',
      periodo: ' 2026-01 ', cantidad: 3, items: [{ nombre: '  gasa \n estéril ' }],
    })
    expect(r).toEqual({
      nombre: 'Juan Perez', placa: 'AB12', detalle: 'a b\n\nc', otro: 'x y',
      periodo: '2026-01', cantidad: 3, items: [{ nombre: 'gasa estéril' }],
    })
  })
  it('no toca nulos ni fechas', () => {
    const f = new Date(0)
    expect(sanitizarValores(campos, { nombre: null, otro: f as never })).toEqual({ nombre: null, otro: f })
  })
})
