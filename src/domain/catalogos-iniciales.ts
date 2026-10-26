export interface ItemCatalogo { valor: string; etiqueta: string; region?: string; riesgo?: string; nombre_corto?: string }

export const CATALOGO_CON_REGION = 'tipos_epp'

export const REGIONES_ANATOMICAS: ItemCatalogo[] = [
  { valor: 'cabeza', etiqueta: 'Cabeza' },
  { valor: 'ojos-y-cara', etiqueta: 'Ojos y cara' },
  { valor: 'oidos', etiqueta: 'Oídos' },
  { valor: 'aparato-respiratorio', etiqueta: 'Aparato respiratorio' },
  { valor: 'extremidades-superiores', etiqueta: 'Extremidades superiores' },
  { valor: 'tronco', etiqueta: 'Tronco' },
  { valor: 'extremidades-inferiores', etiqueta: 'Extremidades inferiores' },
  { valor: 'otros', etiqueta: 'Otros' },
]

// Los catálogos de la empresa llegan por la migración o desde /admin/catalogos
export const CATALOGOS_INICIALES: Record<string, ItemCatalogo[]> = {
  ciudades: [],
  areas: [],
  lineas_negocio: [],
  normas: [],
  tipos_epp: [],
  prendas: [],
  tipos_accidente: [
    { valor: 'trayecto', etiqueta: 'Trayecto' },
    { valor: 'laboral', etiqueta: 'Laboral' },
  ],
  tipos_equipo: [
    { valor: 'extintor', etiqueta: 'Extintor' },
    { valor: 'botiquin', etiqueta: 'Botiquín' },
    { valor: 'senaletica', etiqueta: 'Señalética' },
  ],
  cuadrillas: [],
}

export function unirItems(existentes: ItemCatalogo[], nuevos: ItemCatalogo[]): ItemCatalogo[] {
  const vistos = new Set(existentes.map((i) => i.valor))
  return [...existentes, ...nuevos.filter((i) => !vistos.has(i.valor) && vistos.add(i.valor))]
}
