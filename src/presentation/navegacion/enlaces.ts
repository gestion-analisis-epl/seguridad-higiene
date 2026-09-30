import { MODULOS } from '@/domain/modulos-definiciones'
import { puede, type UsuarioDoc } from '@/domain/permisos'

export type Icono = 'operativo' | 'analitico' | 'modulo' | 'usuarios' | 'catalogos' | 'configuracion'

export interface Enlace { href: string; titulo: string; icono: Icono }
export interface GrupoEnlaces { titulo: string; enlaces: Enlace[] }

export function gruposDeNavegacion(usuario: UsuarioDoc | null): GrupoEnlaces[] {
  if (!puede(usuario, 'leer')) return []
  const grupos: GrupoEnlaces[] = [
    {
      titulo: 'Tableros',
      enlaces: [
        { href: '/', titulo: 'Operativo', icono: 'operativo' },
        { href: '/analitico', titulo: 'Analítico', icono: 'analitico' },
      ],
    },
    {
      titulo: 'Registros',
      enlaces: Object.values(MODULOS).map((m) => ({ href: `/datos/${m.id}`, titulo: m.titulo, icono: 'modulo' as const })),
    },
  ]
  if (puede(usuario, 'administrar')) {
    grupos.push({
      titulo: 'Administración',
      enlaces: [
        { href: '/admin/usuarios', titulo: 'Usuarios', icono: 'usuarios' },
        { href: '/admin/catalogos', titulo: 'Catálogos', icono: 'catalogos' },
        { href: '/admin/configuracion', titulo: 'Configuración', icono: 'configuracion' },
      ],
    })
  }
  return grupos
}

export function estaActivo(href: string, ruta: string): boolean {
  return href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(`${href}/`)
}

export const ETIQUETA_ROL: Record<UsuarioDoc['rol'], string> = {
  admin: 'Administrador',
  capturista: 'Capturista',
  consulta: 'Consulta',
  sin_rol: 'Sin acceso',
}
