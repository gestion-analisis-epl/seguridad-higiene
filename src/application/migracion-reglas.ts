import { planearDeltas, type Deseada, type ReglaDotacion } from '@/domain/reglas-dotacion'

export interface DocAnterior { id: string; data: Record<string, unknown> }

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

// Cada regla anterior fijaba las dos listas completas; ahora cada una se guarda como cambio frente a lo más general de su puesto
export function planearMigracion(anteriores: DocAnterior[]): { uniforme: ReglaDotacion[]; epp: ReglaDotacion[] } {
  const base = anteriores.map(({ data: d }) => ({
    linea_negocio: texto(d.linea_negocio), puesto_etiqueta: texto(d.puesto_etiqueta) || texto(d.puesto),
    ciudad: texto(d.ciudad) || null, area: texto(d.area) || null, prendas: lista(d.prendas), tipos_epp: lista(d.tipos_epp),
  })).filter((r) => r.linea_negocio && r.puesto_etiqueta)
  const deseadas = (campo: 'prendas' | 'tipos_epp'): Deseada[] => base.map((r) => ({
    linea_negocio: r.linea_negocio, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad, area: r.area, articulos: r[campo],
  }))
  return { uniforme: planearDeltas([], deseadas('prendas')), epp: planearDeltas([], deseadas('tipos_epp')) }
}
