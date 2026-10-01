export interface ElementoLike {
  closest(selector: string): unknown
}

const SELECTOR = 'a, button, input, select, textarea, [role="button"], [role="link"]'

export function esControlInteractivo(elemento: ElementoLike | null): boolean {
  return typeof elemento?.closest === 'function' && elemento.closest(SELECTOR) !== null
}
