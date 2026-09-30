'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { esCorreoPermitido, resolverAcceso, type EstadoAcceso, type UsuarioDoc } from '@/domain/permisos'
import { cerrarSesion, dominioPermitido, iniciarConGoogle, observarSesion, type CuentaSesion } from '@/infrastructure/firebase/sesion'
import { suscribirDoc } from '@/infrastructure/firestore/repositorio'
import { registrarUsuario } from '@/infrastructure/firestore/usuarios'

interface Sesion {
  cargando: boolean
  errorAcceso: boolean
  acceso: EstadoAcceso
  usuario: UsuarioDoc | null
  uid: string | null
  correo: string | null
  iniciarSesion: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CuentaSesion | null>(null)
  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorAcceso, setErrorAcceso] = useState(false)

  useEffect(() => {
    let cancelarDoc = () => {}
    const cancelarAuth = observarSesion((u) => {
      cancelarDoc()
      cancelarDoc = () => {}
      setUser(u)
      setUsuario(null)
      setErrorAcceso(false)
      if (!u || !esCorreoPermitido(u.email, dominioPermitido)) {
        setCargando(false)
        return
      }
      setCargando(true)
      const fallar = () => { setErrorAcceso(true); setUsuario(null); setCargando(false) }
      cancelarDoc = suscribirDoc(
        'usuarios',
        u.uid,
        (registro) => {
          if (!registro) {
            registrarUsuario(u.uid, u.email).catch(fallar)
            return
          }
          setUsuario(registro as unknown as UsuarioDoc)
          setCargando(false)
        },
        fallar,
      )
    })
    return () => { cancelarAuth(); cancelarDoc() }
  }, [])

  const valor = useMemo<Sesion>(() => ({
    cargando,
    errorAcceso,
    acceso: resolverAcceso(user?.email ?? null, usuario, dominioPermitido),
    usuario,
    uid: user?.uid ?? null,
    correo: user?.email ?? null,
    iniciarSesion: iniciarConGoogle,
    cerrarSesion,
  }), [cargando, errorAcceso, user, usuario])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): Sesion {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useSesion requiere AuthProvider')
  return ctx
}
