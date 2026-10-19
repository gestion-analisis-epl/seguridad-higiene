import type { Alerta, OrigenAlerta, Pendiente } from './dashboard'

export type TipoFaltante = 'uniforme' | 'epp' | 'capacitacion'

export interface Faltante { articulo: string; tipo: TipoFaltante; personas: number }

// Cuenta a cuántos colaboradores les falta cada prenda, EPP o la capacitación; mayor primero.
export function faltantesPorArticulo(pendientes: Pendiente[], limite = 8): Faltante[] {
  const cuenta = new Map<string, Faltante>()
  const sumar = (articulo: string, tipo: TipoFaltante) => {
    const clave = `${tipo}|${articulo}`
    const actual = cuenta.get(clave)
    if (actual) actual.personas += 1
    else cuenta.set(clave, { articulo, tipo, personas: 1 })
  }
  for (const p of pendientes) {
    if (p.capacitacionPendiente) sumar('Capacitación vigente', 'capacitacion')
    p.prendasFaltantes.forEach((a) => sumar(a, 'uniforme'))
    p.eppFaltantes.forEach((a) => sumar(a, 'epp'))
  }
  return Array.from(cuenta.values())
    .sort((a, b) => b.personas - a.personas || a.articulo.localeCompare(b.articulo))
    .slice(0, limite)
}

export interface DesgloseOrigen { origen: OrigenAlerta; vencidos: number; porVencer: number }

export function vencimientosPorOrigen(alertas: Alerta[]): DesgloseOrigen[] {
  const mapa = new Map<OrigenAlerta, DesgloseOrigen>()
  for (const a of alertas) {
    const fila = mapa.get(a.origen) ?? { origen: a.origen, vencidos: 0, porVencer: 0 }
    if (a.estado === 'vencido') fila.vencidos += 1
    else fila.porVencer += 1
    mapa.set(a.origen, fila)
  }
  return Array.from(mapa.values()).sort((a, b) => b.vencidos + b.porVencer - (a.vencidos + a.porVencer))
}
