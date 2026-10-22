import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { idRegla, normalizarPuesto, type ReglaDotacion } from '@/domain/reglas-dotacion'
import { aTitulo } from '@/domain/texto'
import { conAuditoria } from './conversion'

export type DatosRegla = Pick<ReglaDotacion, 'linea_negocio' | 'puesto_etiqueta' | 'ciudad' | 'area' | 'prendas' | 'tipos_epp'>

// El identificador sale de empresa + puesto + ciudad + área: guardar de nuevo actualiza, no duplica
export async function guardarRegla(r: DatosRegla, uid: string): Promise<string> {
  const puesto = normalizarPuesto(r.puesto_etiqueta)
  const id = idRegla(r.linea_negocio, puesto, r.ciudad, r.area)
  const ref = doc(db, 'reglas_dotacion', id)
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria({
    linea_negocio: r.linea_negocio, puesto, puesto_etiqueta: aTitulo(r.puesto_etiqueta), ciudad: r.ciudad, area: r.area,
    prendas: r.prendas, tipos_epp: r.tipos_epp,
  }, uid, !existe), { merge: true })
  return id
}

export async function eliminarRegla(id: string): Promise<void> {
  await deleteDoc(doc(db, 'reglas_dotacion', id))
}
