import { CONFIG_EPP, CONFIG_UNIFORME, type ConfigEntrega } from '@/application/entregas-config'
import { MODULOS } from '@/domain/modulos-definiciones'

export interface ConfiguracionPagina {
  titulo: string
  catalogo: string
  columnaItems: string
  config: ConfigEntrega
}

export const CONFIGURACIONES: Record<string, ConfiguracionPagina> = {
  entregas_uniforme: {
    titulo: MODULOS.entregas_uniforme.titulo, catalogo: 'prendas', columnaItems: 'Prenda', config: CONFIG_UNIFORME,
  },
  entregas_epp: {
    titulo: MODULOS.entregas_epp.titulo, catalogo: 'tipos_epp', columnaItems: 'EPP', config: CONFIG_EPP,
  },
}

export function configuracionDe(modulo: string): ConfiguracionPagina | null {
  return Object.prototype.hasOwnProperty.call(CONFIGURACIONES, modulo) ? CONFIGURACIONES[modulo] : null
}
