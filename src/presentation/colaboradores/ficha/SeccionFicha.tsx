import type { ReactNode } from 'react'

export function SeccionFicha({ id, titulo, cantidad, acciones, children }: {
  id: string; titulo: string; cantidad?: number; acciones?: ReactNode; children: ReactNode
}) {
  return (
    <section aria-labelledby={`ficha-${id}`} className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`ficha-${id}`} className="text-base">
          {titulo}{cantidad !== undefined && <span className="text-texto-suave"> ({cantidad})</span>}
        </h2>
        {acciones}
      </div>
      {children}
    </section>
  )
}
