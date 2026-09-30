import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, dominioPermitido } from './cliente'

export { dominioPermitido }

export interface CuentaSesion { uid: string; email: string | null }

export function observarSesion(alCambiar: (cuenta: CuentaSesion | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => alCambiar(u ? { uid: u.uid, email: u.email } : null))
}

export async function iniciarConGoogle(): Promise<void> {
  const proveedor = new GoogleAuthProvider()
  proveedor.setCustomParameters({ hd: dominioPermitido })
  await signInWithPopup(auth, proveedor)
}

export function cerrarSesion(): Promise<void> {
  return signOut(auth)
}
