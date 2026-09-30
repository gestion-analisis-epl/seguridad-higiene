import type { Valores } from '@/domain/modulos'

export type RegistroEntrega = { id: string } & Record<string, unknown>

export interface ColaboradorEntrega { id: string; nombre: string; ciudad: string; activo?: boolean }

export type Modo = 'nueva' | 'corregir'

export interface ErroresEntrega {
  general?: string
  fecha?: string
  items: Record<string, Record<string, string>>
}

export type Operacion =
  | { tipo: 'crear'; coleccion: string; valores: Valores }
  | { tipo: 'actualizar'; coleccion: string; id: string; valores: Valores }
