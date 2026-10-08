import type { ItemCatalogo } from './catalogos-iniciales'
import { aTextoIso, fechaCalendario } from './fechas'
import type { Valores } from './modulos'
import { slug } from './slug'
import { aTitulo, limpiarTexto } from './texto'

export interface ColaboradorHoja {
  id_interno: string
  numero: string
  nombre: string
  plaza: string
  departamento: string
  empresa: string
  puesto: string
  fecha_ingreso: string | null
  zona: string
  jefe: string
  gerente: string
  fecha_baja: string | null
  motivo_baja: string
}

type TextoHoja = Exclude<keyof ColaboradorHoja, 'fecha_ingreso' | 'fecha_baja'>

const ENCABEZADOS: Record<keyof ColaboradorHoja, string> = {
  id_interno: 'id', numero: 'no.colaborador', nombre: 'nombrecompleto', plaza: 'plaza', departamento: 'departamento',
  empresa: 'empresa', puesto: 'puesto', fecha_ingreso: 'fechaingreso', zona: 'zona', jefe: 'jefe', gerente: 'gerente',
  fecha_baja: 'fechabaja', motivo_baja: 'motivobaja',
}
const OBLIGATORIAS: (keyof ColaboradorHoja)[] = ['id_interno', 'nombre', 'plaza', 'departamento', 'empresa', 'puesto', 'fecha_ingreso']
const ID_VALIDO = /^[0-9A-Za-z_-]{1,64}$/

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
const claveEncabezado = (t: string) => sinAcentos(t).toLowerCase().replace(/\s+/g, '')

export const normalizarNombre = (t: string): string => sinAcentos(limpiarTexto(t)).toLowerCase()

const dos = (n: string) => n.padStart(2, '0')

// Acepta AAAA-MM-DD (con hora opcional) o DD/MM/AAAA y devuelve AAAA-MM-DD válido
export function fechaDeHoja(texto: string): string | null {
  const t = texto.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(t)
  const mx = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/.exec(t)
  const partes = iso ? [iso[1], iso[2], iso[3]] : mx ? [mx[3], mx[2], mx[1]] : null
  if (!partes) return null
  const [a, m, d] = partes
  const normal = `${a}-${dos(m)}-${dos(d)}`
  return aTextoIso(fechaCalendario(Number(a), Number(m), Number(d))) === normal ? normal : null
}

export function parsearFilasHoja(valores: string[][]): { colaboradores: ColaboradorHoja[]; descartadas: number } {
  if (valores.length === 0) return { colaboradores: [], descartadas: 0 }
  const columnas = valores[0].map(claveEncabezado)
  const indice = (campo: keyof ColaboradorHoja) => columnas.indexOf(ENCABEZADOS[campo])
  const faltan = OBLIGATORIAS.filter((c) => indice(c) < 0)
  if (faltan.length) throw new Error(`La hoja no tiene las columnas: ${faltan.map((c) => ENCABEZADOS[c]).join(', ')}`)

  const vistos = new Set<string>()
  const colaboradores: ColaboradorHoja[] = []
  let descartadas = 0
  for (const fila of valores.slice(1)) {
    const texto = (campo: TextoHoja) => (indice(campo) < 0 ? '' : limpiarTexto(String(fila[indice(campo)] ?? '')))
    const fecha = (campo: 'fecha_ingreso' | 'fecha_baja') => (indice(campo) < 0 ? null : fechaDeHoja(String(fila[indice(campo)] ?? '')))
    const id = texto('id_interno')
    if (!ID_VALIDO.test(id) || !texto('nombre') || vistos.has(id)) {
      if (fila.some((c) => String(c ?? '').trim())) descartadas++
      continue
    }
    vistos.add(id)
    colaboradores.push({
      id_interno: id, numero: texto('numero'), nombre: texto('nombre'), plaza: texto('plaza'),
      departamento: texto('departamento'), empresa: texto('empresa'), puesto: texto('puesto'),
      fecha_ingreso: fecha('fecha_ingreso'), zona: texto('zona'), jefe: texto('jefe'), gerente: texto('gerente'),
      fecha_baja: fecha('fecha_baja'), motivo_baja: texto('motivo_baja'),
    })
  }
  return { colaboradores, descartadas }
}

export function buscarColaboradores(filas: ColaboradorHoja[], texto: string): ColaboradorHoja[] {
  const palabras = normalizarNombre(texto).split(' ').filter(Boolean)
  if (!palabras.length) return filas
  return filas.filter((f) => {
    const pajar = normalizarNombre(`${f.nombre} ${f.numero} ${f.puesto}`)
    return palabras.every((p) => pajar.includes(p))
  })
}

export const etiquetaColaboradorHoja = (f: ColaboradorHoja): string =>
  [aTitulo(f.nombre), f.numero, aTitulo(f.puesto), f.fecha_baja ? '(baja)' : ''].filter(Boolean).join(' · ')

export interface EntradaResuelta { valor: string; etiqueta: string; nueva: boolean }

// Reutiliza la entrada del catálogo que coincide; si no existe propone una nueva
export function resolverEntradaCatalogo(items: ItemCatalogo[], texto: string): EntradaResuelta | null {
  const etiqueta = aTitulo(texto)
  const valor = slug(etiqueta)
  if (!valor) return null
  const clave = normalizarNombre(etiqueta)
  const existente = items.find((i) => i.valor === valor || normalizarNombre(i.etiqueta) === clave)
  return existente
    ? { valor: existente.valor, etiqueta: existente.etiqueta, nueva: false }
    : { valor, etiqueta, nueva: true }
}

export type EstadoSugerencia = 'exacta' | 'ambigua' | 'sin_coincidencia'
export interface Sugerencia { estado: EstadoSugerencia; candidatos: ColaboradorHoja[] }
export interface ExistenteEnlace { id: string; nombre: string; id_interno: string | null }
export interface FilaEnlace extends ExistenteEnlace { sugerencia: Sugerencia | null }

export function planearEnlace(existentes: ExistenteEnlace[], hoja: ColaboradorHoja[]): FilaEnlace[] {
  const vinculados = new Set(existentes.flatMap((e) => (e.id_interno ? [e.id_interno] : [])))
  const repetidos = new Map<string, number>()
  for (const e of existentes) {
    if (!e.id_interno) repetidos.set(normalizarNombre(e.nombre), (repetidos.get(normalizarNombre(e.nombre)) ?? 0) + 1)
  }
  return existentes.map((e) => {
    if (e.id_interno) return { ...e, sugerencia: null }
    const clave = normalizarNombre(e.nombre)
    const candidatos = hoja.filter((f) => !vinculados.has(f.id_interno) && normalizarNombre(f.nombre) === clave)
    const estado: EstadoSugerencia = candidatos.length === 0 ? 'sin_coincidencia'
      : candidatos.length > 1 || (repetidos.get(clave) ?? 0) > 1 ? 'ambigua' : 'exacta'
    return { ...e, sugerencia: { estado, candidatos } }
  })
}

// Datos del colaborador que se copian a cada registro para conservar el histórico
export function copiaDeColaborador(c: Record<string, unknown>): Valores {
  const texto = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return { colaborador_nombre: texto(c.nombre), colaborador_plaza: texto(c.plaza), colaborador_puesto: texto(c.puesto) }
}
