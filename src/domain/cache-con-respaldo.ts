export interface LecturaCache<T> { dato: T; cargadoEn: number; desactualizado: boolean }
export interface OpcionesCache { ttlMs: number; minForzarMs: number; ahora?: () => number }

export function crearCacheConRespaldo<T>(cargar: () => Promise<T>, opciones: OpcionesCache) {
  const ahora = opciones.ahora ?? Date.now
  let guardado: { dato: T; en: number } | null = null
  let enCurso: Promise<LecturaCache<T>> | null = null

  const vigente = (limite: number) => guardado !== null && ahora() - guardado.en < limite

  async function recargar(): Promise<LecturaCache<T>> {
    try {
      const dato = await cargar()
      guardado = { dato, en: ahora() }
      return { dato, cargadoEn: guardado.en, desactualizado: false }
    } catch (error) {
      if (!guardado) throw error
      return { dato: guardado.dato, cargadoEn: guardado.en, desactualizado: true }
    }
  }

  return function leer(forzar = false): Promise<LecturaCache<T>> {
    if (guardado && vigente(forzar ? opciones.minForzarMs : opciones.ttlMs)) {
      return Promise.resolve({ dato: guardado.dato, cargadoEn: guardado.en, desactualizado: false })
    }
    enCurso ??= recargar().finally(() => { enCurso = null })
    return enCurso
  }
}
