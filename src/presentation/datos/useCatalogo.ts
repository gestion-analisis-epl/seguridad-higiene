'use client'

import { useEffect, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { suscribirDoc } from '@/infrastructure/firestore/repositorio'
import { itemsDeCatalogo } from './opciones'

export function useCatalogo(id: string | null): Opcion[] {
  const [items, setItems] = useState<Opcion[]>([])

  useEffect(() => {
    if (!id) return
    return suscribirDoc('catalogos', id, (r) => setItems(itemsDeCatalogo(r ?? undefined)))
  }, [id])

  return items
}
