'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useMenuMovil(ruta: string) {
  const [abierto, setAbierto] = useState(false)
  const botonAbrir = useRef<HTMLButtonElement>(null)
  const botonCerrar = useRef<HTMLButtonElement>(null)

  const abrir = useCallback(() => setAbierto(true), [])
  const cerrar = useCallback(() => {
    setAbierto(false)
    botonAbrir.current?.focus()
  }, [])

  useEffect(() => { setAbierto(false) }, [ruta])

  useEffect(() => {
    if (!abierto) return
    botonCerrar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = desbordeAnterior
    }
  }, [abierto, cerrar])

  return { abierto, abrir, cerrar, botonAbrir, botonCerrar }
}
