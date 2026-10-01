'use client'

import { useCallback, useMemo } from 'react'
import { rutaAdjunto, type Adjunto, type ModuloAdjunto } from '@/domain/adjuntos'
import { crearMetadatosFirestore } from '@/infrastructure/firestore/adjuntos'
import { crearAlmacenamientoStorage, esNoEncontrado } from '@/infrastructure/storage/almacenamiento'
import { useColeccion } from '@/presentation/datos/useColeccion'

// Adjuntos de un registro, filtrados en memoria del almacén compartido.
export function useAdjuntos(modulo: ModuloAdjunto, registroId: string) {
  const { registros, cargando, error } = useColeccion('adjuntos')
  const adjuntos = useMemo(
    () => (registros as unknown as Adjunto[]).filter((a) => a.modulo === modulo && a.registro_id === registroId),
    [registros, modulo, registroId],
  )
  return { adjuntos, cargando, error }
}

// Borra el archivo (tolerando que ya no exista) y luego su documento.
export function useBorrarAdjunto(uid: string | null) {
  return useCallback(async (a: Adjunto) => {
    try {
      await crearAlmacenamientoStorage().borrar(rutaAdjunto(a))
    } catch (e) {
      if (!esNoEncontrado(e)) throw e
    }
    await crearMetadatosFirestore(uid ?? '').borrar(a.id)
  }, [uid])
}
