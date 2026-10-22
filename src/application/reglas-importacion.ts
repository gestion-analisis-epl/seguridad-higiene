import { idRegla, normalizarPuesto } from '@/domain/reglas-dotacion'
import { aTitulo } from '@/domain/texto'

export const MAX_REGLAS_IMPORTACION = 500

export interface ReglaImportada {
  id: string
  linea_negocio: string
  puesto: string
  puesto_etiqueta: string
  ciudad: string | null
  area: string | null
  tipos_epp: string[]
}

export interface ValoresCatalogo { lineas: string[]; ciudades: string[]; areas: string[]; tiposEpp: string[] }

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// El servidor no confía en el cliente: cada valor debe existir en su catálogo y no puede repetirse una regla
export function validarImportacion(entrada: unknown, catalogos: ValoresCatalogo): { reglas: ReglaImportada[]; errores: string[] } {
  if (!Array.isArray(entrada) || entrada.length === 0) return { reglas: [], errores: ['No hay reglas que guardar'] }
  if (entrada.length > MAX_REGLAS_IMPORTACION) return { reglas: [], errores: [`Máximo ${MAX_REGLAS_IMPORTACION} reglas por importación`] }
  const reglas: ReglaImportada[] = []
  const errores: string[] = []
  const vistos = new Set<string>()
  entrada.forEach((e, i) => {
    const r = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
    const etiqueta = aTitulo(texto(r.puesto_etiqueta))
    const puesto = normalizarPuesto(etiqueta)
    const linea = texto(r.linea_negocio)
    const ciudad = texto(r.ciudad) || null
    const area = texto(r.area) || null
    const tipos = Array.isArray(r.tipos_epp) ? r.tipos_epp.filter((t): t is string => typeof t === 'string') : null
    const donde = `Regla ${i + 1}${etiqueta ? ` (${etiqueta})` : ''}`
    if (!puesto) return void errores.push(`${donde}: falta el puesto`)
    if (!catalogos.lineas.includes(linea)) return void errores.push(`${donde}: la empresa no existe en el catálogo`)
    if (ciudad && !catalogos.ciudades.includes(ciudad)) return void errores.push(`${donde}: la ciudad no existe en el catálogo`)
    if (area && !catalogos.areas.includes(area)) return void errores.push(`${donde}: el área no existe en el catálogo`)
    if (!tipos || tipos.length !== (r.tipos_epp as unknown[]).length) return void errores.push(`${donde}: el EPP no es válido`)
    if (!tipos.every((t) => catalogos.tiposEpp.includes(t))) return void errores.push(`${donde}: hay EPP que no existe en el catálogo`)
    const id = idRegla(linea, puesto, ciudad, area)
    if (vistos.has(id)) return void errores.push(`${donde}: está repetida en la importación`)
    vistos.add(id)
    reglas.push({ id, linea_negocio: linea, puesto, puesto_etiqueta: etiqueta, ciudad, area, tipos_epp: Array.from(new Set(tipos)) })
  })
  return { reglas, errores }
}
