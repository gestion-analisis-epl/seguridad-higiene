'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { LECTURA_CARGANDO, LECTURA_VACIA, type Lectura } from '@/application/almacen-lecturas'
import { almacenLecturas, type DatoAlmacen } from '@/infrastructure/firestore/almacen'

const SIN_BAJA = () => {}

// Con clave null no se lee nada: resultado vacio y sin cargar
export function useLectura(clave: string | null): Lectura<DatoAlmacen> {
  const suscribir = useCallback(
    (aviso: () => void) => (clave === null ? SIN_BAJA : almacenLecturas.suscribir(clave, aviso)),
    [clave],
  )
  const foto = useCallback(() => (clave === null ? LECTURA_VACIA : almacenLecturas.leer(clave)), [clave])
  const servidor = useCallback(() => (clave === null ? LECTURA_VACIA : LECTURA_CARGANDO), [clave])
  return useSyncExternalStore(suscribir, foto, servidor)
}
