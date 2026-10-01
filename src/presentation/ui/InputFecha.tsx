'use client'

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { textoParaCommit } from '@/domain/fechas'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  valor: string
  alCambiar: (texto: string) => void
}

// Guarda el texto mientras se teclea y solo confirma al padre fechas completas o vacio
export function InputFecha({ valor, alCambiar, ...resto }: Props) {
  const [texto, setTexto] = useState(valor)
  const confirmado = useRef(valor)

  // Re-sincroniza solo si el valor externo cambio de verdad
  useEffect(() => {
    if (valor !== confirmado.current) {
      confirmado.current = valor
      setTexto(valor)
    }
  }, [valor])

  return (
    <input
      {...resto} type="date" value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        const listo = textoParaCommit(e.target.value)
        if (listo !== null && listo !== confirmado.current) {
          confirmado.current = listo
          alCambiar(listo)
        }
      }}
    />
  )
}
