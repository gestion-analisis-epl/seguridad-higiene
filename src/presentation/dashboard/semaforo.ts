export type Semaforo = 'bien' | 'atencion' | 'critico'

// Umbrales de cumplimiento (fracción 0-1) para colorear los indicadores.
export const UMBRAL_BIEN = 0.9
export const UMBRAL_ATENCION = 0.7

export function semaforo(fraccion: number): Semaforo {
  if (fraccion >= UMBRAL_BIEN) return 'bien'
  if (fraccion >= UMBRAL_ATENCION) return 'atencion'
  return 'critico'
}

export const COLOR_SEMAFORO: Record<Semaforo, string> = {
  bien: 'var(--estado-vigente)',
  atencion: 'var(--estado-por-vencer)',
  critico: 'var(--estado-vencido)',
}

export const TEXTO_SEMAFORO: Record<Semaforo, string> = { bien: 'Bien', atencion: 'Atención', critico: 'Crítico' }
