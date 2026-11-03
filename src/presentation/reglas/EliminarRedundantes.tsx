'use client'

import { useState } from 'react'
import { Icono } from '@/presentation/ui/Icono'

interface Props {
  cantidad: number
  // Qué abarca, para el texto: "de este puesto", "de uniforme"
  alcance: string
  compacto?: boolean
  alConfirmar: () => Promise<void>
}

// Pide una confirmación antes de borrar; no muestra nada si no hay redundantes
export function EliminarRedundantes({ cantidad, alcance, compacto = false, alConfirmar }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const tamano = compacto ? 'min-h-0 py-1 text-xs' : ''

  async function eliminar() {
    setOcupado(true)
    setFallo(null)
    try { await alConfirmar(); setConfirmando(false) } catch (e) { setFallo(e instanceof Error ? e.message : 'No se pudieron eliminar') } finally { setOcupado(false) }
  }

  if (cantidad === 0) return null
  if (!confirmando) {
    return (
      <button type="button" className={`boton-secundario text-error ${tamano}`} onClick={() => setConfirmando(true)}>
        <Icono nombre="basura" className="h-3.5 w-3.5" />Eliminar redundantes ({cantidad})
      </button>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-texto-suave">¿Eliminar {cantidad} reglas redundantes {alcance}? No cambian lo que recibe nadie.</span>
      <button type="button" className={`boton-secundario border-error text-error ${tamano}`} disabled={ocupado} onClick={() => void eliminar()}>
        {ocupado ? 'Eliminando...' : 'Confirmar'}
      </button>
      <button type="button" className={`boton-secundario ${tamano}`} disabled={ocupado} onClick={() => setConfirmando(false)}>Cancelar</button>
      {fallo && <span role="alert" className="text-xs text-error">{fallo}</span>}
    </span>
  )
}
