'use client'

import { useState } from 'react'
import { migrarReglas } from '@/infrastructure/api/dotacion'
import { AvisoError } from '@/presentation/ui/Estado'

// Solo aparece mientras haya reglas del modelo anterior y ninguna de uniforme o EPP
export function MigrarReglas({ cantidad, pendiente }: { cantidad: number; pendiente: boolean }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ uniforme: number; epp: number } | null>(null)

  async function migrar() {
    setOcupado(true)
    setError(null)
    try { setResultado(await migrarReglas()) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo migrar') } finally { setOcupado(false) }
  }

  if (resultado) {
    return <p role="status" className="aviso-info">Migradas {resultado.uniforme} reglas de uniforme y {resultado.epp} de EPP. Las originales se conservan sin usarse.</p>
  }
  if (!pendiente) return null
  return (
    <div className="aviso-info flex-col">
      <p className="font-medium">Hay {cantidad} reglas del modelo anterior (uniforme y EPP juntos)</p>
      <p className="text-texto-suave">
        Migrarlas las separa en reglas de uniforme y de EPP, y cada excepción guarda solo lo que cambia frente a la base de su puesto.
        Las originales no se borran.
      </p>
      {error && <AvisoError>{error}</AvisoError>}
      <div><button type="button" className="boton-primario" disabled={ocupado} onClick={() => void migrar()}>{ocupado ? 'Migrando...' : 'Migrar reglas'}</button></div>
    </div>
  )
}
