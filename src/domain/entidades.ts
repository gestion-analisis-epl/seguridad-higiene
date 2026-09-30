export interface Colaborador {
  id: string
  nombre: string
  ciudad: string
  area?: string | null
  linea_negocio: string
  cuadrilla?: string | null
  activo?: boolean
}

export interface Capacitacion {
  colaborador_id: string
  norma: string
  ciudad: string
  cumple: boolean
  fecha: Date | null
  vencimiento: Date | null
}

export interface EntregaUniforme { colaborador_id: string; prenda: string }

export interface EntregaEpp {
  colaborador_id: string
  tipo: string
  entregado: boolean
  vencimiento: Date | null
}

export interface Accidente {
  ciudad: string
  periodo: string
  tipo: 'trayecto' | 'laboral'
  dias_incapacidad: number
}

export interface EquipoOficina {
  ciudad: string
  tipo: 'extintor' | 'botiquin' | 'senaletica'
  vencimiento: Date | null
}

export interface Vehiculo {
  ciudad: string
  placa: string
  extintor_vencimiento: Date | null
  botiquin_caducidad: Date | null
}

export interface Poblacion { ciudad: string; periodo: string; poblacion: number }

export interface DatosOperativos {
  colaboradores: Colaborador[]
  capacitaciones: Capacitacion[]
  entregasUniforme: EntregaUniforme[]
  entregasEpp: EntregaEpp[]
  equipoOficinas: EquipoOficina[]
  vehiculos: Vehiculo[]
}
