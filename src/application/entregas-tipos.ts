export type RegistroEntrega = { id: string } & Record<string, unknown>

export interface ColaboradorEntrega {
  id: string
  nombre: string
  ciudad: string
  activo?: boolean
  plaza?: string | null
  puesto?: string | null
}
