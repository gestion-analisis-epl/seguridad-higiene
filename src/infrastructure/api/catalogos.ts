import { enviar, llamar } from './llamar'

export interface ResumenUnion { registros: number; bloqueos: string[] }

export const unirEntradas = (catalogo: string, origen: string, destino: string, confirmar = false) =>
  llamar<ResumenUnion>('/api/catalogos/unir', enviar({ catalogo, origen, destino, confirmar }))
