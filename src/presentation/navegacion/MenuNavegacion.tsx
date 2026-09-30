import Link from 'next/link'
import { Icono } from '@/presentation/ui/Icono'
import { estaActivo, type GrupoEnlaces } from './enlaces'

export function MenuNavegacion({ grupos, ruta }: { grupos: GrupoEnlaces[]; ruta: string }) {
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <h2 className="mb-1.5 px-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-barra-suave">
            {g.titulo}
          </h2>
          <ul className="space-y-0.5">
            {g.enlaces.map((e) => {
              const activo = estaActivo(e.href, ruta)
              return (
                <li key={e.href}>
                  <Link href={e.href} aria-current={activo ? 'page' : undefined}
                    className={`relative flex min-h-[2.25rem] items-center gap-3 rounded px-3 text-sm transition-colors ${
                      activo
                        ? 'bg-barra-2 font-medium text-barra-texto before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-acento'
                        : 'text-barra-suave hover:bg-barra-2 hover:text-barra-texto'
                    }`}>
                    <Icono nombre={e.icono} className={`h-4 w-4 ${activo ? 'text-acento' : ''}`} />
                    <span className="truncate">{e.titulo}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
