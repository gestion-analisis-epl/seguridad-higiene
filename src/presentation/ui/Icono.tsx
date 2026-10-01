const TRAZOS = {
  operativo: 'M3 12h4l3-8 4 16 3-8h4',
  analitico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  modulo: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  usuarios: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15 4.15a3.5 3.5 0 0 1 0 6.7',
  catalogos: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  configuracion: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  salir: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4',
  entrar: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l4 4-4 4M14 12H4',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  candado: 'M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  escudo: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM12 8.5v6M9 11.5h6',
  mas: 'M12 5v14M5 12h14',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  volver: 'M10 6l-6 6 6 6M4 12h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M6 9l6 6 6-6',
  filtro: 'M4 5h16l-6 7.5V19l-4 1.5v-8z',
  'orden-asc': 'M12 19V6M6.5 11.5L12 6l5.5 5.5',
  'orden-desc': 'M12 5v13M6.5 12.5L12 18l5.5-5.5',
  'orden-sin': 'M8 9.5L12 5.5l4 4M8 14.5l4 4 4-4',
  'pag-primera': 'M18 6l-6 6 6 6M7 5v14',
  'pag-anterior': 'M15 6l-6 6 6 6',
  'pag-siguiente': 'M9 6l6 6-6 6',
  'pag-ultima': 'M6 6l6 6-6 6M17 5v14',
  buscar: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13M20 20l-4.9-4.9',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, className = 'h-4 w-4' }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}
