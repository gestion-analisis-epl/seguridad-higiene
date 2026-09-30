import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import type { Rol } from '@/domain/permisos'
import { conAuditoria } from './conversion'

export async function actualizarUsuario(id: string, cambios: { rol?: Rol; activo?: boolean }, uid: string): Promise<void> {
  await updateDoc(doc(db, 'usuarios', id), conAuditoria(cambios, uid, false))
}

// Autorregistro sin campos de auditoría: las reglas solo aceptan email, rol y activo.
export async function registrarUsuario(uid: string, email: string | null): Promise<void> {
  await setDoc(doc(db, 'usuarios', uid), { email, rol: 'consulta', activo: true })
}
