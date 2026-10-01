import type { Filtro } from './logica'

// Valor de la columna Estado derivada de un colaborador (ver application/estado-colaborador)
export const FILTRO_ESTADO_ACTIVO: Filtro = { tipo: 'categoria', ocultos: ['Inactivo'] }
export const FILTRO_ACTIVO_BOOLEANO: Filtro = { tipo: 'booleano', valor: true }
