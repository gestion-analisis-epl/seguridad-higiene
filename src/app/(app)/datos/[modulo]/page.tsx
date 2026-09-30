'use client'

import { notFound, useParams } from 'next/navigation'
import { MODULOS } from '@/domain/modulos-definiciones'
import { PaginaModulo } from '@/presentation/datos/PaginaModulo'
import { configuracionDe } from '@/presentation/entregas/configuraciones'
import { PaginaEntregas } from '@/presentation/entregas/PaginaEntregas'

export default function ModuloPage() {
  const { modulo } = useParams<{ modulo: string }>()
  if (!Object.prototype.hasOwnProperty.call(MODULOS, modulo)) notFound()
  const entregas = configuracionDe(modulo)
  if (entregas) return <PaginaEntregas key={modulo} cfg={entregas} />
  const def = MODULOS[modulo]
  return <PaginaModulo key={def.id} def={def} />
}
