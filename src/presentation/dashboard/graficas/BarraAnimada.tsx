'use client'

import { useMontado } from '@/presentation/ui/useConteo'

// Barra horizontal que crece al aparecer y se desliza cuando cambia el valor; marcas son referencias de 0 a 1
export function BarraAnimada({ fraccion, color, etiqueta, retraso = 0, marcas = [] }: {
  fraccion: number
  color: string
  etiqueta: string
  retraso?: number
  marcas?: number[]
}) {
  const montado = useMontado()
  const ancho = Math.min(100, Math.max(0, fraccion * 100))
  return (
    <div role="img" aria-label={etiqueta} className="relative h-3 w-full overflow-hidden rounded-sm bg-borde">
      <div
        className="barra-viva h-full rounded-sm"
        style={{
          width: `${montado ? ancho : 0}%`, background: color,
          transition: 'width 800ms cubic-bezier(0.2, 0.7, 0.2, 1), background-color 300ms', transitionDelay: `${retraso}ms`,
        }}
      />
      {marcas.map((m) => (
        <span key={m} aria-hidden="true" className="absolute inset-y-0 w-px" style={{ left: `${m * 100}%`, background: 'var(--texto)', opacity: 0.35 }} />
      ))}
    </div>
  )
}
