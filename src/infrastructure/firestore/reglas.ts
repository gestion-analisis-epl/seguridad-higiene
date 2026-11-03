import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { COLECCION_REGLAS, idRegla, normalizarPuesto, type ReglaDotacion, type TipoRegla } from '@/domain/reglas-dotacion'
import { aTitulo } from '@/domain/texto'
import { conAuditoria } from './conversion'

export type DatosRegla = Pick<ReglaDotacion, 'linea_negocio' | 'puesto_etiqueta' | 'ciudad' | 'area' | 'agrega' | 'quita'>

// El identificador sale de empresa + puesto + ciudad + área: guardar de nuevo actualiza, no duplica
export async function guardarRegla(tipo: TipoRegla, r: DatosRegla, uid: string): Promise<string> {
  const puesto = normalizarPuesto(r.puesto_etiqueta)
  const id = idRegla(r.linea_negocio, puesto, r.ciudad, r.area)
  const ref = doc(db, COLECCION_REGLAS[tipo], id)
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria({
    linea_negocio: r.linea_negocio, puesto, puesto_etiqueta: aTitulo(r.puesto_etiqueta), ciudad: r.ciudad, area: r.area,
    agrega: r.agrega, quita: r.quita,
  }, uid, !existe), { merge: true })
  return id
}

export async function eliminarRegla(tipo: TipoRegla, id: string): Promise<void> {
  await deleteDoc(doc(db, COLECCION_REGLAS[tipo], id))
}
