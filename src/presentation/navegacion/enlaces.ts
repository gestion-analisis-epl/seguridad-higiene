import { MODULOS } from '@/domain/modulos-definiciones'
import { puede, type UsuarioDoc } from '@/domain/permisos'

export type Icono = 'operativo' | 'analitico' | 'modulo' | 'usuarios' | 'catalogos' | 'configuracion'

// activoEn: prefijo de ruta con el que el enlace se marca activo, si difiere de su href
export interface Enlace { href: string; titulo: string; icono: Icono; activoEn?: string }
export interface GrupoEnlaces { titulo: string; enlaces: Enlace[] }

export const ENLACE_ADMIN = '/admin/usuarios'

// Único lugar que construye la ruta de la ficha de un colaborador
export const rutaColaborador = (id: string) => `/colaboradores/${encodeURIComponent(id)}`

// Pestañas de la sección de administración, agrupadas por tema
export const GRUPOS_ADMIN: GrupoEnlaces[] = [
  {
    titulo: 'Personas',
    enlaces: [
      { href: '/admin/usuarios', titulo: 'Accesos a la app', icono: 'usuarios' },
      { href: '/admin/colaboradores', titulo: 'Vincular colaboradores', icono: 'usuarios' },
    ],
  },
  {
    titulo: 'Capacitación',
    enlaces: [
      { href: '/admin/normas-obligatorias', titulo: 'Normas por persona', icono: 'catalogos' },
      { href: '/admin/capacitaciones-excel', titulo: 'Cargar capacitaciones', icono: 'catalogos' },
    ],
  },
  {
    titulo: 'Dotación',
    enlaces: [
      { href: '/admin/reglas-dotacion', titulo: 'Reglas por puesto', icono: 'catalogos' },
      { href: '/admin/articulos-hoja', titulo: 'Equivalencia de artículos', icono: 'catalogos' },
      { href: '/admin/entregas-hoja', titulo: 'Traer entregas del Sheets', icono: 'catalogos' },
    ],
  },
  {
    titulo: 'Sistema',
    enlaces: [
      { href: '/admin/catalogos', titulo: 'Catálogos', icono: 'catalogos' },
      { href: '/admin/configuracion', titulo: 'Configuración', icono: 'configuracion' },
    ],
  },
]

// Para el buscador: cada pantalla de administración aparece por separado
export function gruposParaBusqueda(usuario: UsuarioDoc | null): GrupoEnlaces[] {
  const grupos = gruposDeNavegacion(usuario).filter((g) => g.titulo !== 'Administración')
  return puede(usuario, 'administrar') ? [...grupos, ...GRUPOS_ADMIN.map((g) => ({ ...g, titulo: `Admin · ${g.titulo}` }))] : grupos
}

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
    grupos.push({ titulo: 'Administración', enlaces: [{ href: ENLACE_ADMIN, titulo: 'Administración', icono: 'configuracion', activoEn: '/admin' }] })
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
