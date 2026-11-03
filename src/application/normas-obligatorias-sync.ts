import { normalizarNombre } from '@/domain/colaboradores-hoja'
import { claveNorma } from '@/domain/capacitaciones-excel'
import type { FilaNormasExcel } from '@/domain/normas-obligatorias-excel'

export interface ColaboradorNormas { id: string; nombre: string; activo: boolean; normas: string[] }
export interface NormaCatalogo { valor: string; etiqueta: string }
export interface AsignacionNormas { id: string; normas: string[] }

export interface AlmacenNormas {
  leerColaboradores(): Promise<ColaboradorNormas[]>
  leerNormas(): Promise<NormaCatalogo[]>
  guardar(asignaciones: AsignacionNormas[]): Promise<void>
}

export interface InformeNormas {
  simulacion: boolean
  total: number
  actualizados: number
  sinCambios: number
  // Activos que no vienen en el archivo; quedan como están
  fueraDelArchivo: number
  normasDesconocidas: string[]
  sinCoincidencia: string[]
  ambiguas: string[]
}

interface Entrada { almacen: AlmacenNormas; filas: FilaNormasExcel[]; simular: boolean }

const mismas = (a: string[], b: string[]) => a.length === b.length && a.every((n) => b.includes(n))

// Si alguna norma del archivo no está en el catálogo no se escribe nada, para no dejar a medias la asignación.
export async function sincronizarNormasObligatorias({ almacen, filas, simular }: Entrada): Promise<InformeNormas> {
  const [colaboradores, catalogo] = await Promise.all([almacen.leerColaboradores(), almacen.leerNormas()])
  const valorPorClave = new Map<string, string>()
  for (const n of catalogo) {
    valorPorClave.set(claveNorma(n.valor), n.valor)
    valorPorClave.set(claveNorma(n.etiqueta), n.valor)
  }
  const informe: InformeNormas = {
    simulacion: simular, total: filas.length, actualizados: 0, sinCambios: 0, fueraDelArchivo: 0,
    normasDesconocidas: [], sinCoincidencia: [], ambiguas: [],
  }
  const desconocidas = new Set<string>()
  for (const f of filas) for (const n of Object.keys(f.normas)) if (!valorPorClave.has(claveNorma(n))) desconocidas.add(n)
  informe.normasDesconocidas = Array.from(desconocidas).sort((a, b) => a.localeCompare(b, 'es'))

  const porNombre = new Map<string, ColaboradorNormas[]>()
  for (const c of colaboradores) {
    const k = normalizarNombre(c.nombre)
    porNombre.set(k, [...(porNombre.get(k) ?? []), c])
  }
  const sinCoincidencia = new Set<string>()
  const ambiguas = new Set<string>()
  const asignaciones = new Map<string, { colaborador: ColaboradorNormas; normas: string[] }>()
  for (const f of filas) {
    const candidatos = porNombre.get(normalizarNombre(f.nombre)) ?? []
    if (candidatos.length === 0) { sinCoincidencia.add(f.nombre); continue }
    const activos = candidatos.filter((c) => c.activo)
    const colaborador = candidatos.length === 1 ? candidatos[0] : activos.length === 1 ? activos[0] : null
    if (!colaborador) { ambiguas.add(f.nombre); continue }
    const normas = Object.entries(f.normas).filter(([, obligatoria]) => obligatoria).map(([n]) => valorPorClave.get(claveNorma(n))).filter((v): v is string => !!v)
    asignaciones.set(colaborador.id, { colaborador, normas: Array.from(new Set(normas)).sort() })
  }
  informe.sinCoincidencia = Array.from(sinCoincidencia).sort((a, b) => a.localeCompare(b, 'es'))
  informe.ambiguas = Array.from(ambiguas).sort((a, b) => a.localeCompare(b, 'es'))
  informe.fueraDelArchivo = colaboradores.filter((c) => c.activo && !asignaciones.has(c.id)).length

  const cambios: AsignacionNormas[] = []
  for (const { colaborador, normas } of asignaciones.values()) {
    if (mismas(colaborador.normas, normas)) informe.sinCambios++
    else { informe.actualizados++; cambios.push({ id: colaborador.id, normas }) }
  }
  if (!simular && desconocidas.size === 0 && cambios.length > 0) await almacen.guardar(cambios)
  return informe
}
