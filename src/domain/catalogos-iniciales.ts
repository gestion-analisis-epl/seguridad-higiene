export interface ItemCatalogo { valor: string; etiqueta: string }

export const PRENDAS = ['botas', 'playera', 'camisola', 'pantalon'] as const
export const TIPOS_EPP = [
  'guantes', 'lentes', 'casco',
  'linea-vida-doble-punto', 'arnes-cuerpo-completo', 'linea-posicionamiento',
] as const

const ETIQUETAS: Record<string, string> = {
  pantalon: 'Pantalón',
  'linea-vida-doble-punto': 'Línea de vida de doble punto',
  'arnes-cuerpo-completo': 'Arnés de cuerpo completo',
  'linea-posicionamiento': 'Línea de posicionamiento',
}

const desdeValores = (valores: readonly string[]): ItemCatalogo[] =>
  valores.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS[valor] ?? valor.charAt(0).toUpperCase() + valor.slice(1),
  }))

// Los catálogos de la empresa llegan por la migración o desde /admin/catalogos
export const CATALOGOS_INICIALES: Record<string, ItemCatalogo[]> = {
  ciudades: [],
  areas: [],
  lineas_negocio: [],
  normas: [],
  tipos_epp: desdeValores(TIPOS_EPP),
  prendas: desdeValores(PRENDAS),
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
  return [...existentes, ...nuevos.filter((i) => !vistos.has(i.valor))]
}
