import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'

export interface RespuestaHoja { colaboradores: ColaboradorHoja[]; cargadoEn: number; desactualizado: boolean }
export interface AlmacenSesion { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface DependenciasHoja {
  pedir: (forzar: boolean) => Promise<RespuestaHoja>
  almacen: AlmacenSesion | null
  ahora?: () => number
}
interface Guardado { respuesta: RespuestaHoja; guardadoEn: number }

const CLAVE = 'epl.sh.colaboradores-hoja.v1'
const TTL_SESION_MS = 30 * 60_000
const MINIMO_FORZAR_MS = 60_000

const esGuardado = (v: unknown): v is Guardado => {
  const g = v as Guardado | null
  return !!g && typeof g.guardadoEn === 'number' && Array.isArray(g.respuesta?.colaboradores)
}

export function crearClienteHoja(
  dep: DependenciasHoja, { ttlMs = TTL_SESION_MS, minForzarMs = MINIMO_FORZAR_MS } = {},
) {
  const ahora = dep.ahora ?? Date.now
  let memoria: Guardado | null | undefined
  let enCurso: Promise<RespuestaHoja> | null = null

  function leerGuardado(): Guardado | null {
    if (memoria !== undefined) return memoria
    try {
      const crudo = dep.almacen?.getItem(CLAVE)
      const analizado: unknown = crudo ? JSON.parse(crudo) : null
      memoria = esGuardado(analizado) ? analizado : null
    } catch {
      memoria = null
    }
    return memoria
  }

  function guardar(respuesta: RespuestaHoja) {
    memoria = { respuesta, guardadoEn: ahora() }
    try { dep.almacen?.setItem(CLAVE, JSON.stringify(memoria)) } catch { /* sin almacenamiento disponible */ }
  }

  async function recargar(forzar: boolean): Promise<RespuestaHoja> {
    try {
      const respuesta = await dep.pedir(forzar)
      guardar(respuesta)
      return respuesta
    } catch (error) {
      const previo = leerGuardado()
      if (!previo) throw error
      return { ...previo.respuesta, desactualizado: true }
    }
  }

  return {
    obtener(forzar = false): Promise<RespuestaHoja> {
      const previo = leerGuardado()
      if (previo && ahora() - previo.guardadoEn < (forzar ? minForzarMs : ttlMs)) return Promise.resolve(previo.respuesta)
      enCurso ??= recargar(forzar).finally(() => { enCurso = null })
      return enCurso
    },
    vaciar() {
      memoria = null
      try { dep.almacen?.removeItem(CLAVE) } catch { /* sin almacenamiento disponible */ }
    },
  }
}
