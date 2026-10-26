'use client'

import { useEffect, useRef, useState } from 'react'

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Cuenta desde el valor mostrado hasta el objetivo; con movimiento reducido salta directo
export function useConteo(objetivo: number, duracion = 800): number {
  const [valor, setValor] = useState(0)
  const actual = useRef(0)
  useEffect(() => {
    const inicio = actual.current
    const t0 = performance.now()
    const total = sinMovimiento() ? 0 : duracion
    let id = 0
    const paso = (t: number) => {
      const p = total === 0 ? 1 : Math.min(1, (t - t0) / total)
      actual.current = inicio + (objetivo - inicio) * (1 - (1 - p) ** 3)
      setValor(actual.current)
      if (p < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [objetivo, duracion])
  return valor
}

// Falso en el primer pintado y verdadero un cuadro después, para que las barras partan de cero
export function useMontado(): boolean {
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return montado
}
