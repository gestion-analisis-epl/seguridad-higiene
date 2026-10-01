import { plegar } from '@/presentation/ui/seleccion'
import type { GrupoEnlaces } from './enlaces'

export interface SeccionBusqueda { href: string; titulo: string; grupo: string }
export interface ColaboradorBusqueda { id: string; nombre: string; ciudad: string; activo: boolean }
export interface ResultadosBusqueda { secciones: SeccionBusqueda[]; colaboradores: ColaboradorBusqueda[] }
export interface Segmento { texto: string; resaltado: boolean }

export const MAX_POR_GRUPO = 8

// 0 = empieza con la consulta, 1 = una palabra empieza con ella, 2 = la contiene, null = no coincide
function puntaje(texto: string, q: string): number | null {
  const t = plegar(texto)
  if (t.startsWith(q)) return 0
  if (t.split(/\s+/).some((p) => p.startsWith(q))) return 1
  return t.includes(q) ? 2 : null
}

function clasificar<T>(items: T[], q: string, texto: (i: T) => string): T[] {
  const con: { item: T; p: number; i: number }[] = []
  items.forEach((item, i) => {
    const p = puntaje(texto(item), q)
    if (p !== null) con.push({ item, p, i })
  })
  return con.sort((a, b) => a.p - b.p || a.i - b.i).slice(0, MAX_POR_GRUPO).map((c) => c.item)
}

// Sin consulta solo se ofrecen las primeras secciones
export function buscar(
  consulta: string, secciones: SeccionBusqueda[], colaboradores: ColaboradorBusqueda[],
): ResultadosBusqueda {
  const q = plegar(consulta.trim())
  if (q === '') return { secciones: secciones.slice(0, MAX_POR_GRUPO), colaboradores: [] }
  const porNombre = [...colaboradores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  return {
    secciones: clasificar(secciones, q, (s) => s.titulo),
    colaboradores: clasificar(porNombre, q, (c) => c.nombre),
  }
}

// El plegado se hace letra a letra para que los indices coincidan con el texto original
export function segmentosResaltados(texto: string, consulta: string): Segmento[] {
  const q = plegar(consulta.trim())
  if (q === '' || texto === '') return [{ texto, resaltado: false }]
  const letras = Array.from(texto)
  const origen: number[] = []
  let plegado = ''
  letras.forEach((letra, k) => {
    const p = plegar(letra)
    for (let j = 0; j < p.length; j++) origen.push(k)
    plegado += p
  })
  const rangos: [number, number][] = []
  for (let i = plegado.indexOf(q); i >= 0; i = plegado.indexOf(q, i + q.length)) {
    rangos.push([origen[i], origen[i + q.length - 1] + 1])
  }
  if (rangos.length === 0) return [{ texto, resaltado: false }]
  const segmentos: Segmento[] = []
  let cursor = 0
  for (const [desde, hasta] of rangos) {
    if (desde > cursor) segmentos.push({ texto: letras.slice(cursor, desde).join(''), resaltado: false })
    segmentos.push({ texto: letras.slice(desde, hasta).join(''), resaltado: true })
    cursor = hasta
  }
  if (cursor < letras.length) segmentos.push({ texto: letras.slice(cursor).join(''), resaltado: false })
  return segmentos
}

// Las secciones buscables son exactamente las que el rol ve en el menu
export const seccionesDeGrupos = (grupos: GrupoEnlaces[]): SeccionBusqueda[] =>
  grupos.flatMap((g) => g.enlaces.map((e) => ({ href: e.href, titulo: e.titulo, grupo: g.titulo })))
