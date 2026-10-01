import { claveEstadoTabla, type EstadoGuardado } from '@/presentation/ui/tabla/estado'
import { almacenDe, escribirJson, type Almacen } from '@/presentation/ui/persistencia'
import { claveTablaModulo } from '@/presentation/datos/columnas-modulo'

export const RUTA_COLABORADORES = '/datos/colaboradores'

// Filtro de nombre sin filtro de estado: se ven activos e inactivos
export const estadoParaColaborador = (nombre: string): EstadoGuardado => ({
  filtros: { nombre: { tipo: 'texto', texto: nombre } }, orden: null, pagina: 1,
})

// Deja la tabla de colaboradores lista para abrirse filtrada por esa persona
export function prepararTablaColaboradores(nombre: string, almacen: Almacen | null = almacenDe('sesion')): boolean {
  const clave = claveEstadoTabla(claveTablaModulo('colaboradores'))
  return clave !== null && escribirJson(almacen, clave, estadoParaColaborador(nombre))
}
