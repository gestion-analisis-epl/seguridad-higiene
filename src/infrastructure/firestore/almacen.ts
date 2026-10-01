import { crearAlmacen } from '@/application/almacen-lecturas'
import { suscribir, suscribirDoc, type Registro } from './repositorio'

export type DatoAlmacen = Registro[] | Registro | null

// Claves: "c:<coleccion>" o "d:<coleccion>/<id>" (ver claveColeccion y claveDoc)
export const almacenLecturas = crearAlmacen<DatoAlmacen>((clave, alDato, alError) => {
  const [tipo, ruta] = [clave.slice(0, 1), clave.slice(2)]
  if (tipo === 'c') return suscribir(ruta, alDato, alError)
  const i = ruta.indexOf('/')
  return suscribirDoc(ruta.slice(0, i), ruta.slice(i + 1), alDato, alError)
})
