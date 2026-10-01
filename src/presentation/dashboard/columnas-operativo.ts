import type { Alerta, Pendiente, ResumenCiudad } from '@/application/dashboard'
import type { ColumnaTabla } from '@/presentation/ui/tabla'

type Etiqueta = (valor: string) => string

export const textoEstado = (a: Alerta) => (a.estado === 'vencido' ? 'Vencido' : 'Por vencer')
export const textoOrigen = (a: Alerta) => a.origen.replace('_', ' ')
export const porcentaje = (fraccion: number) => Math.round(fraccion * 100)

export const atributosAlerta = (a: Pick<Alerta, 'estado'>) => ({ 'data-estado': a.estado })

export function columnasAlertas<A extends Alerta = Alerta>(etiqueta: Etiqueta): ColumnaTabla<A>[] {
  return [
    {
      id: 'estado', encabezado: 'Estado', tipo: 'categoria', valor: textoEstado, anchoInicial: 140,
    },
    { id: 'origen', encabezado: 'Origen', tipo: 'categoria', valor: textoOrigen },
    { id: 'referencia', encabezado: 'Referencia', tipo: 'texto', valor: (a) => a.referencia },
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (a) => etiqueta(a.ciudad) },
    { id: 'vencimiento', encabezado: 'Vencimiento', tipo: 'fecha', valor: (a) => a.vencimiento },
    { id: 'dias', encabezado: 'Días', tipo: 'numero', valor: (a) => a.dias, alinear: 'derecha', anchoInicial: 100 },
  ]
}

export function columnasPendientes(etiqueta: Etiqueta): ColumnaTabla<Pendiente>[] {
  return [
    { id: 'colaborador', encabezado: 'Colaborador', tipo: 'texto', valor: (p) => p.colaborador.nombre },
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (p) => etiqueta(p.colaborador.ciudad) },
    { id: 'area', encabezado: 'Área', tipo: 'categoria', valor: (p) => p.colaborador.area },
    { id: 'cuadrilla', encabezado: 'Cuadrilla', tipo: 'categoria', valor: (p) => p.colaborador.cuadrilla },
    {
      id: 'capacitacion', encabezado: 'Capacitación', tipo: 'categoria', anchoInicial: 140,
      valor: (p) => (p.capacitacionPendiente ? 'Pendiente' : 'Vigente'),
    },
    { id: 'uniforme', encabezado: 'Uniforme faltante', tipo: 'texto', valor: (p) => p.prendasFaltantes.join(', ') || '-', anchoInicial: 220 },
    { id: 'epp', encabezado: 'EPP faltante', tipo: 'texto', valor: (p) => p.eppFaltantes.join(', ') || '-', anchoInicial: 220 },
  ]
}

export function columnasPorCiudad(etiqueta: Etiqueta): ColumnaTabla<ResumenCiudad>[] {
  const pct = (id: string, encabezado: string, f: (r: ResumenCiudad) => number): ColumnaTabla<ResumenCiudad> => ({
    id, encabezado, tipo: 'numero', alinear: 'derecha', anchoInicial: 140,
    valor: (r) => porcentaje(f(r)), celda: (r) => `${porcentaje(f(r))}%`,
  })
  return [
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (r) => etiqueta(r.ciudad) },
    { id: 'activos', encabezado: 'Activos', tipo: 'numero', valor: (r) => r.activos, alinear: 'derecha', anchoInicial: 110 },
    pct('cap', '% capacitación', (r) => r.pctCapacitacion),
    pct('uniforme', '% uniforme', (r) => r.pctUniforme),
    pct('epp', '% EPP', (r) => r.pctEpp),
  ]
}
