import { describe, expect, it } from 'vitest'
import { semaforo } from './semaforo'

describe('semaforo', () => {
  it('clasifica por umbrales, con el límite incluido', () => {
    expect(semaforo(1)).toBe('bien')
    expect(semaforo(0.9)).toBe('bien')
    expect(semaforo(0.89)).toBe('atencion')
    expect(semaforo(0.7)).toBe('atencion')
    expect(semaforo(0.69)).toBe('critico')
    expect(semaforo(0)).toBe('critico')
  })
})
