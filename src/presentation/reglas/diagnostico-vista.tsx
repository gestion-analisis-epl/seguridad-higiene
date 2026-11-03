import type { Opcion } from '@/domain/modulos'
import type { CodigoHallazgo, Diagnostico, Gravedad, Hallazgo, ReglaDotacion, TipoRegla } from '@/domain/reglas-dotacion'
import { Icono } from '@/presentation/ui/Icono'

// Cada tipo lleva su propio color y rótulo para no confundir uniforme con EPP
export const ESTILO_TIPO: Record<TipoRegla, { franja: string; texto: string; fondo: string; rotulo: string; singular: string }> = {
  uniforme: { franja: 'border-l-serie-laboral', texto: 'text-serie-laboral', fondo: 'bg-serie-laboral', rotulo: 'Uniformes', singular: 'uniforme' },
  epp: { franja: 'border-l-serie-trayecto', texto: 'text-serie-trayecto', fondo: 'bg-serie-trayecto', rotulo: 'EPP', singular: 'EPP' },
}

const ROTULO_HALLAZGO: Record<CodigoHallazgo, string> = {
  sobrescribe: 'Sobrescribe', redundante: 'Redundante', quita: 'Quita', sin_efecto: 'Sin efecto', conflicto: 'Conflicto',
}

const CLASE_GRAVEDAD: Record<Gravedad, string> = { info: 'insignia-neutra', aviso: 'insignia-por-vencer', error: 'insignia-vencido' }

export function InsigniaHallazgo({ codigo, gravedad }: { codigo: CodigoHallazgo; gravedad: Gravedad }) {
  return (
    <span className={CLASE_GRAVEDAD[gravedad]}>
      {gravedad !== 'info' && <Icono nombre="alerta" className="h-3 w-3" />}
      {ROTULO_HALLAZGO[codigo]}
    </span>
  )
}

export function InsigniaTipo({ tipo }: { tipo: TipoRegla }) {
  const e = ESTILO_TIPO[tipo]
  return (
    <span className="insignia inline-flex items-center gap-1.5 bg-superficie-2 text-texto">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${e.fondo}`} />
      {e.rotulo}
    </span>
  )
}

// Heredado en gris, agregado con +, quitado con − y tachado: el símbolo acompaña al color
export function CambiosArticulos({ agrega, quita, articulo }: { agrega: string[]; quita: string[]; articulo: (valor: string) => string }) {
  if (agrega.length === 0 && quita.length === 0) return <span className="text-xs text-texto-suave">Sin cambios</span>
  return (
    <span className="flex flex-wrap gap-1">
      {agrega.map((a) => <span key={`+${a}`} className="insignia-vigente">+ {articulo(a)}</span>)}
      {quita.map((a) => <span key={`-${a}`} className="insignia-vencido line-through decoration-1"><span className="sr-only">Quita </span>− {articulo(a)}</span>)}
    </span>
  )
}

export function FichasArticulos({ articulos, articulo, vacio = 'Ninguno' }: { articulos: string[]; articulo: (valor: string) => string; vacio?: string }) {
  if (articulos.length === 0) return <span className="text-xs text-texto-suave">{vacio}</span>
  return <span className="flex flex-wrap gap-1">{articulos.map((a) => <span key={a} className="insignia-neutra">{articulo(a)}</span>)}</span>
}

export interface ContextoTexto {
  articulo: (valor: string) => string
  alcance: (r: ReglaDotacion) => string
  regla: (id: string) => ReglaDotacion | undefined
}

export function textoHallazgo(h: Hallazgo, c: ContextoTexto): string {
  const articulos = h.articulos.map(c.articulo).join(', ')
  const previas = h.con.map((id) => c.regla(id)).filter((r): r is ReglaDotacion => r !== undefined).map(c.alcance).join(' + ')
  switch (h.codigo) {
    case 'sobrescribe': return `Ajusta lo que recibe de: ${previas}`
    case 'redundante': return articulos
      ? `Ya viene de ${previas}: ${articulos}`
      : `No cambia nada frente a ${previas}; se puede eliminar`
    case 'quita': return `Quita lo que ${previas} exige: ${articulos}`
    case 'sin_efecto': return 'Ningún colaborador activo cae en este alcance'
    case 'conflicto': return `Se cruza con ${previas}: ${articulos} se agrega en una y se quita en la otra; hoy gana la de ciudad`
  }
}

export function etiquetaAlcance(
  r: { ciudad: string | null; area: string | null }, ciudades: Opcion[], areas: Opcion[],
  etiquetaDe: (opciones: Opcion[], valor: string) => string,
): string {
  if (!r.ciudad && !r.area) return 'Base · todas las plazas y áreas'
  return `${r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las plazas'} · ${r.area ? etiquetaDe(areas, r.area) : 'Todas las áreas'}`
}

export const problemasDe = (d: Diagnostico) => d.hallazgos.filter((h) => h.gravedad !== 'info')
