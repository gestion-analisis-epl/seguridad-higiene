import { describe, expect, it } from 'vitest'
import {
  buscarColaboradores, copiaDeColaborador, etiquetaColaboradorHoja, fechaDeHoja, normalizarNombre, parsearFilasHoja,
  planearEnlace, resolverEntradaCatalogo, type ColaboradorHoja,
} from './colaboradores-hoja'

const ENCABEZADO = [
  'id', 'No.Colaborador', 'Nombre', 'NombreCompleto', 'Función Área', 'Departamento', 'Puesto', 'FechaIngreso',
  'FechaBaja', 'Zona', 'Plaza', 'MotivoBaja', 'Empresa', 'Gerente', 'Jefe', 'CorreoEmpresa',
]
const fila = (o: Record<string, string>) => ENCABEZADO.map((h) => o[h] ?? '')
const base = {
  id: '12066', 'No.Colaborador': '2120', NombreCompleto: 'ADALBERTO GUTIERREZ MIRANDA', Departamento: 'SEGURIDAD',
  Puesto: 'GUARDIA DE SEGURIDAD ', FechaIngreso: '2026-09-28 0:00:00', Zona: 'Bajío Centro', Plaza: 'LEON',
  Empresa: 'SICMART SA DE CV', Gerente: 'ALFONSO ORDAZ OCAÑA ', Jefe: 'JOSE CHAGOYA', CorreoEmpresa: 'x@y.com',
}
const hoja = (...filas: Record<string, string>[]) => [ENCABEZADO, ...filas.map(fila)]
const col = (o: Partial<ColaboradorHoja>): ColaboradorHoja => ({
  id_interno: '1', numero: '1', nombre: 'ANA PEREZ', plaza: 'LEON', departamento: 'OPERACIONES', empresa: 'X', puesto: 'P',
  fecha_ingreso: null, zona: '', jefe: '', gerente: '', fecha_baja: null, motivo_baja: '', ...o,
})

describe('parsearFilasHoja', () => {
  it('lee por nombre de encabezado, limpia espacios y convierte la fecha', () => {
    const { colaboradores } = parsearFilasHoja(hoja(base))
    expect(colaboradores).toEqual([{
      id_interno: '12066', numero: '2120', nombre: 'ADALBERTO GUTIERREZ MIRANDA', plaza: 'LEON', departamento: 'SEGURIDAD',
      empresa: 'SICMART SA DE CV', puesto: 'GUARDIA DE SEGURIDAD', fecha_ingreso: '2026-09-28', zona: 'Bajío Centro',
      jefe: 'JOSE CHAGOYA', gerente: 'ALFONSO ORDAZ OCAÑA', fecha_baja: null, motivo_baja: '',
    }])
  })

  it('no expone el correo ni otras columnas', () => {
    const [c] = parsearFilasHoja(hoja(base)).colaboradores
    expect(Object.values(c)).not.toContain('x@y.com')
  })

  it('descarta filas sin id, sin nombre, con id repetido o con id inválido', () => {
    const r = parsearFilasHoja(hoja(
      base, { ...base, id: '' }, { ...base, id: '2', NombreCompleto: '' }, { ...base, id: '12066' }, { ...base, id: 'a/b' },
    ))
    expect(r.colaboradores).toHaveLength(1)
    expect(r.descartadas).toBe(4)
  })

  it('falla con un mensaje claro si falta una columna obligatoria', () => {
    expect(() => parsearFilasHoja([['id', 'Nombre']])).toThrow(/columnas/)
  })

  it('devuelve vacío si la hoja no tiene filas', () => {
    expect(parsearFilasHoja([]).colaboradores).toEqual([])
  })
})

describe('fechaDeHoja', () => {
  it.each([
    ['2026-09-28 0:00:00', '2026-09-28'], ['2026-09-28', '2026-09-28'], ['28/09/2026', '2026-09-28'],
    ['2026-02-31', null], ['', null], ['pendiente', null],
  ])('%s', (entrada, esperado) => expect(fechaDeHoja(entrada)).toBe(esperado))
})

describe('buscarColaboradores', () => {
  const filas = [
    col({ id_interno: '1', nombre: 'CARLOS ALBERTO TORRES', numero: '344', puesto: 'SOLDADOR A' }),
    col({ id_interno: '2', nombre: 'MARÍA TORRES', numero: '12', puesto: 'ALMACENISTA' }),
  ]
  it('exige todas las palabras sin importar acentos ni mayúsculas', () => {
    expect(buscarColaboradores(filas, 'carlos torres').map((f) => f.id_interno)).toEqual(['1'])
    expect(buscarColaboradores(filas, 'maria').map((f) => f.id_interno)).toEqual(['2'])
  })
  it('busca por número y por puesto', () => {
    expect(buscarColaboradores(filas, '344').map((f) => f.id_interno)).toEqual(['1'])
    expect(buscarColaboradores(filas, 'almacenista').map((f) => f.id_interno)).toEqual(['2'])
  })
  it('sin texto devuelve todo', () => expect(buscarColaboradores(filas, '  ')).toHaveLength(2))
})

describe('etiquetaColaboradorHoja', () => {
  it('une nombre, número y puesto y omite lo vacío', () => {
    expect(etiquetaColaboradorHoja(col({ nombre: 'ANA PEREZ', numero: '9', puesto: 'SOLDADOR A' }))).toBe('Ana Perez · 9 · Soldador A')
    expect(etiquetaColaboradorHoja(col({ nombre: 'ANA PEREZ', numero: '', puesto: '' }))).toBe('Ana Perez')
  })
})

describe('resolverEntradaCatalogo', () => {
  const items = [{ valor: 'leon', etiqueta: 'León' }]
  it('reutiliza la entrada que coincide por etiqueta o por valor', () => {
    expect(resolverEntradaCatalogo(items, 'LEON')).toEqual({ valor: 'leon', etiqueta: 'León', nueva: false })
    expect(resolverEntradaCatalogo(items, 'león')).toEqual({ valor: 'leon', etiqueta: 'León', nueva: false })
  })
  it('propone una entrada nueva con valor normalizado', () => {
    expect(resolverEntradaCatalogo(items, 'CIUDAD JUAREZ')).toEqual({ valor: 'ciudad-juarez', etiqueta: 'Ciudad Juarez', nueva: true })
  })
  it('devuelve null con texto vacío', () => expect(resolverEntradaCatalogo(items, '  ')).toBeNull())
})

describe('planearEnlace', () => {
  const hojaCols = [col({ id_interno: '1', nombre: 'ANA PEREZ' }), col({ id_interno: '2', nombre: 'LUIS RUIZ' }), col({ id_interno: '3', nombre: 'LUIS RUIZ' })]
  it('marca exacta, ambigua y sin coincidencia', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Ana Pérez', id_interno: null },
      { id: 'b', nombre: 'Luis Ruiz', id_interno: null },
      { id: 'c', nombre: 'Zoe Sin Hoja', id_interno: null },
    ], hojaCols)
    expect(r.map((f) => f.sugerencia?.estado)).toEqual(['exacta', 'ambigua', 'sin_coincidencia'])
    expect(r[0].sugerencia?.candidatos[0].id_interno).toBe('1')
  })
  it('no sugiere filas ya vinculadas y no sugiere a los ya vinculados', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Otra Ana', id_interno: '1' },
      { id: 'b', nombre: 'Ana Perez', id_interno: null },
    ], hojaCols)
    expect(r[0].sugerencia).toBeNull()
    expect(r[1].sugerencia?.estado).toBe('sin_coincidencia')
  })
  it('degrada a ambigua cuando dos colaboradores actuales comparten nombre', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Ana Perez', id_interno: null }, { id: 'b', nombre: 'ANA PEREZ', id_interno: null },
    ], hojaCols)
    expect(r.map((f) => f.sugerencia?.estado)).toEqual(['ambigua', 'ambigua'])
  })
})

describe('copiaDeColaborador', () => {
  it('toma nombre, plaza y puesto del colaborador', () => {
    expect(copiaDeColaborador({ nombre: 'Ana', plaza: 'LEON', puesto: 'SOLDADOR A' }))
      .toEqual({ colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: 'SOLDADOR A' })
    expect(copiaDeColaborador({ nombre: 'Ana' }))
      .toEqual({ colaborador_nombre: 'Ana', colaborador_plaza: null, colaborador_puesto: null })
  })
})

describe('normalizarNombre', () => {
  it('quita acentos, mayúsculas y espacios repetidos', () => expect(normalizarNombre('  MaRía   PÉREZ ')).toBe('maria perez'))
})
