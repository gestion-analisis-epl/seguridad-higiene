import type { FiltroEntregas } from './FiltrosEntregas'

export const filtroEntregasVacio: FiltroEntregas = { ciudad: '', texto: '' }

export const claveFiltroEntregas = (catalogo: string) => `entregas:filtro:${catalogo}`

export const filtroEntregasValido = (v: unknown): v is FiltroEntregas =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
  && typeof (v as FiltroEntregas).ciudad === 'string' && typeof (v as FiltroEntregas).texto === 'string'

// Una ciudad que no esta en el catalogo se ignora sin borrar lo guardado
export const filtroEntregasEfectivo = (f: FiltroEntregas, ciudades: string[]): FiltroEntregas =>
  f.ciudad === '' || ciudades.includes(f.ciudad) ? f : { ...f, ciudad: '' }
