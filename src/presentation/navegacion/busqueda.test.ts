import { describe, expect, it } from 'vitest'
import { buscar, MAX_POR_GRUPO, seccionesDeGrupos, segmentosResaltados, type ColaboradorBusqueda, type SeccionBusqueda } from './busqueda'

const secciones: SeccionBusqueda[] = [
  { href: '/', titulo: 'Operativo', grupo: 'Tableros' },
  { href: '/analitico', titulo: 'Analítico', grupo: 'Tableros' },
  { href: '/datos/capacitaciones', titulo: 'Capacitaciones', grupo: 'Registros' },
  { href: '/datos/accidentes', titulo: 'Registro de accidentes', grupo: 'Registros' },
]
const colab = (id: string, nombre: string, activo = true): ColaboradorBusqueda => ({ id, nombre, ciudad: 'Ciudad Uno', activo })

describe('buscar', () => {
  it('sin consulta ofrece solo secciones, limitadas', () => {
    const r = buscar('  ', secciones, [colab('1', 'Ana Prueba')])
    expect(r.secciones).toHaveLength(4)
    expect(r.colaboradores).toEqual([])
    const muchas = Array.from({ length: 12 }, (_, i) => ({ href: `/${i}`, titulo: `S${i}`, grupo: 'g' }))
    expect(buscar('', muchas, []).secciones).toHaveLength(MAX_POR_GRUPO)
  })

  it('ignora acentos y mayusculas', () => {
    expect(buscar('ANALITICO', secciones, []).secciones.map((s) => s.href)).toEqual(['/analitico'])
    expect(buscar('jose', [], [colab('1', 'José Ejemplo')]).colaboradores).toHaveLength(1)
  })

  it('ordena prefijo, luego palabra y luego contiene', () => {
    expect(buscar('regis', secciones, []).secciones.map((s) => s.titulo)).toEqual(['Registro de accidentes'])
    const c = [colab('1', 'Lucas Capuz'), colab('2', 'Ana Caparro'), colab('3', 'Capi Zeta'), colab('4', 'Escapa Uno')]
    expect(buscar('cap', [], c).colaboradores.map((x) => x.id)).toEqual(['3', '2', '1', '4'])
  })

  it('incluye colaboradores inactivos y limita a 8 por grupo', () => {
    const c = Array.from({ length: 12 }, (_, i) => colab(String(i), `Persona ${i}`, i % 2 === 0))
    expect(buscar('persona', [], c).colaboradores).toHaveLength(MAX_POR_GRUPO)
    expect(buscar('persona 1', [], c).colaboradores.some((x) => !x.activo)).toBe(true)
  })

  it('sin coincidencias devuelve grupos vacios', () => {
    expect(buscar('zzz', secciones, [colab('1', 'Ana')])).toEqual({ secciones: [], colaboradores: [] })
  })
})

describe('segmentosResaltados', () => {
  it('marca coincidencias ignorando acentos y conserva el texto original', () => {
    const s = segmentosResaltados('José Pérez', 'jose')
    expect(s).toEqual([{ texto: 'José', resaltado: true }, { texto: ' Pérez', resaltado: false }])
    expect(s.map((x) => x.texto).join('')).toBe('José Pérez')
  })

  it('marca varias apariciones', () => {
    expect(segmentosResaltados('ana y Ana', 'ana').filter((x) => x.resaltado)).toHaveLength(2)
  })

  it('sin consulta o sin coincidencia devuelve un solo segmento', () => {
    expect(segmentosResaltados('Hola', '')).toEqual([{ texto: 'Hola', resaltado: false }])
    expect(segmentosResaltados('Hola', 'x')).toEqual([{ texto: 'Hola', resaltado: false }])
  })

  it('coincide a mitad de palabra con acento alrededor', () => {
    expect(segmentosResaltados('Sección', 'cci')).toEqual([
      { texto: 'Se', resaltado: false }, { texto: 'cci', resaltado: true }, { texto: 'ón', resaltado: false },
    ])
  })
})

describe('seccionesDeGrupos', () => {
  it('aplana los grupos conservando el nombre del grupo', () => {
    const r = seccionesDeGrupos([
      { titulo: 'A', enlaces: [{ href: '/x', titulo: 'X', icono: 'modulo' }] },
      { titulo: 'B', enlaces: [{ href: '/y', titulo: 'Y', icono: 'modulo' }, { href: '/z', titulo: 'Z', icono: 'modulo' }] },
    ])
    expect(r).toEqual([
      { href: '/x', titulo: 'X', grupo: 'A' }, { href: '/y', titulo: 'Y', grupo: 'B' }, { href: '/z', titulo: 'Z', grupo: 'B' },
    ])
    expect(seccionesDeGrupos([])).toEqual([])
  })
})
