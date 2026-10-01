'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { crearSubidor, type ItemSubida } from '@/application/adjuntos-subida'
import type { Adjunto, ModuloAdjunto } from '@/domain/adjuntos'
import { crearMetadatosFirestore } from '@/infrastructure/firestore/adjuntos'
import { crearAlmacenamientoStorage } from '@/infrastructure/storage/almacenamiento'

interface Destino { colaborador_id: string; modulo: ModuloAdjunto; registro_id: string }

// Se recrea al cambiar el destino y cancela todo al desmontar.
export function useSubidor(destino: Destino, uid: string, adjuntos: Adjunto[]) {
  const [items, setItems] = useState<ItemSubida[]>([])
  const vivos = useRef(adjuntos)
  vivos.current = adjuntos
  const sesion = useRef(new Set<string>())
  const borradosSesion = useRef(0)
  const { colaborador_id, modulo, registro_id } = destino

  const subidor = useMemo(() => {
    sesion.current = new Set()
    borradosSesion.current = 0
    const metadatos = crearMetadatosFirestore(uid)
    return crearSubidor({
      almacenamiento: crearAlmacenamientoStorage(),
      metadatos: {
        crear: async (a) => {
          const id = await metadatos.crear(a)
          sesion.current.add(id)
          return id
        },
        borrar: (id) => metadatos.borrar(id),
      },
      destino: { colaborador_id, modulo, registro_id },
      // Previos a la sesión; los subidos aquí ya llegan por la suscripción en vivo.
      existentes: () => Math.max(0, vivos.current.filter((a) => !sesion.current.has(a.id)).length - borradosSesion.current),
      alCambiar: setItems,
    })
  }, [uid, colaborador_id, modulo, registro_id])

  useEffect(() => {
    setItems([])
    return () => subidor.cancelarTodo()
  }, [subidor])

  // Avisa que el usuario borró un adjunto subido en esta sesión.
  const alBorrar = useCallback((id: string) => {
    if (sesion.current.has(id)) borradosSesion.current += 1
  }, [])

  return { items, alBorrar, agregar: subidor.agregar, reintentar: subidor.reintentar, cancelar: subidor.cancelar }
}
