import { crearClienteHoja, type RespuestaHoja } from '@/application/colaboradores-hoja-cliente'
import type { ResultadoImportacion } from '@/application/colaboradores-servidor'
import type { ColaboradorHoja, FilaEnlace } from '@/domain/colaboradores-hoja'
import { enviar, llamar } from './llamar'

function almacenSesion() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null }
}

export const clienteHoja = crearClienteHoja({
  pedir: (forzar) => llamar<RespuestaHoja>(`/api/colaboradores-hoja${forzar ? '?forzar=1' : ''}`),
  almacen: almacenSesion(),
})

export const asegurarColaborador = (idInterno: string) =>
  llamar<{ uid: string; creado: boolean }>('/api/colaboradores/asegurar', enviar({ id_interno: idInterno }))

export const importarColaboradores = (ids: string[]) =>
  llamar<ResultadoImportacion>('/api/colaboradores/importar', enviar({ ids }))

export const cargarEnlace = (forzar = false) =>
  llamar<{ filas: FilaEnlace[]; hoja: ColaboradorHoja[] }>(`/api/colaboradores/enlace${forzar ? '?forzar=1' : ''}`)

export const vincular = (uid: string, idInterno: string, sobrescribir = false) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'vincular', uid, id_interno: idInterno, sobrescribir }))

export const desvincular = (uid: string) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'desvincular', uid }))
