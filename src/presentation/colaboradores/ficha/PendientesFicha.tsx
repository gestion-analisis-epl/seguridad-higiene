import type { Pendientes } from '@/application/ficha-colaborador'

type Etiquetar = (valor: string) => string

// faltan === null: no aplica, y vacio explica por qué
function Fila({ rotulo, faltan, vacio }: { rotulo: string; faltan: string[] | null; vacio: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="w-28 shrink-0 text-sm text-texto-suave">{rotulo}</span>
      {faltan === null ? <span className="text-sm text-texto-suave">{vacio}</span>
        : faltan.length === 0 ? <span className="insignia-vigente">Completo</span>
          : (
            <>
              <span className="insignia-vencido">Faltan {faltan.length}</span>
              <span className="text-sm">{faltan.join(', ')}</span>
            </>
          )}
    </li>
  )
}

export function PendientesFicha({ pendientes, etiquetaNorma, etiquetaArticulo }: {
  pendientes: Pendientes | null; etiquetaNorma: Etiquetar; etiquetaArticulo: Etiquetar
}) {
  if (!pendientes) return <p className="text-sm text-texto-suave">Colaborador de baja: no se evalúa contra las reglas.</p>
  const { evaluacion: e, normas, exigeCapacitacion } = pendientes
  const sinRegla = 'Sin regla de dotación para su puesto, empresa y ciudad'
  return (
    <ul className="divide-y divide-borde rounded border border-borde px-3">
      <Fila rotulo="Capacitación" faltan={exigeCapacitacion ? normas.map(etiquetaNorma) : null} vacio="Sin normas obligatorias asignadas" />
      <Fila rotulo="Uniforme" faltan={e.pideUniforme ? e.prendasFaltantes.map(etiquetaArticulo) : null} vacio={e.sinRegla ? sinRegla : 'Su regla no exige uniforme'} />
      <Fila rotulo="EPP" faltan={e.pideEpp ? e.eppFaltantes.map(etiquetaArticulo) : null} vacio={e.sinRegla ? sinRegla : 'Su regla no exige EPP'} />
    </ul>
  )
}
