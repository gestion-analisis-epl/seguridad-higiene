'use client'

import { useParams } from 'next/navigation'
import { FichaColaborador } from '@/presentation/colaboradores/ficha/FichaColaborador'

export default function FichaColaboradorPage() {
  const { id } = useParams<{ id: string }>()
  return <FichaColaborador key={id} id={decodeURIComponent(id)} />
}
