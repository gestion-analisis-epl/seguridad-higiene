import { Icono } from '@/presentation/ui/Icono'

export function Marca() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded bg-acento text-acento-texto">
        <Icono nombre="escudo" className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Seguridad e Higiene</span>
        <span className="block font-mono text-[0.625rem] uppercase tracking-[0.14em] text-barra-suave">
          Control interno
        </span>
      </span>
    </span>
  )
}
