'use client'

import { useMemo } from 'react'
import { filasPorColaborador } from '@/application/entregas-agrupar'
import type { ColaboradorEntrega } from '@/application/entregas-tipos'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import type { ConfiguracionPagina } from './configuraciones'

export function useEntregas(cfg: ConfiguracionPagina) {
  const colaboradores = useColeccion('colaboradores')
  const entregas = useColeccion(cfg.config.coleccion)
  const items = useCatalogo(cfg.catalogo)
  const ciudades = useCatalogo('ciudades')

  const filas = useMemo(() => filasPorColaborador(
    colaboradores.registros as unknown as ColaboradorEntrega[], entregas.registros, cfg.config.campoItem,
  ), [colaboradores.registros, entregas.registros, cfg.config.campoItem])

  return {
    cargando: colaboradores.cargando || entregas.cargando,
    error: colaboradores.error ?? entregas.error,
    registros: entregas.registros,
    filas, items, ciudades,
  }
}
