import { estadoCapacitacion } from './fechas'
import { derivarCaducidad, derivarCiudad, derivarPeriodo, type CampoDef, type ModuloDef, type Valores } from './modulos'

const catalogo = (id: string) => ({ tipo: 'catalogo', id }) as const
const colaborador: CampoDef = {
  nombre: 'colaborador_id', etiqueta: 'Colaborador', tipo: 'seleccion',
  requerido: true, origen: { tipo: 'colaboradores' },
}

const subcamposBotiquin: CampoDef[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
  { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
  { nombre: 'caducidad', etiqueta: 'Caducidad', tipo: 'fecha' },
]
const sinItems = (campo: string) => (v: Valores) => !(Array.isArray(v[campo]) && v[campo].length > 0)

const colaboradores: ModuloDef = {
  id: 'colaboradores', coleccion: 'colaboradores', titulo: 'Colaboradores',
  inicial: { activo: true },
  campos: [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', requerido: true, origen: catalogo('ciudades') },
    { nombre: 'area', etiqueta: 'Área', tipo: 'seleccion', origen: catalogo('areas') },
    { nombre: 'linea_negocio', etiqueta: 'Línea de negocio', tipo: 'seleccion', requerido: true, origen: catalogo('lineas_negocio') },
    { nombre: 'cuadrilla', etiqueta: 'Cuadrilla', tipo: 'seleccion', origen: catalogo('cuadrillas') },
    { nombre: 'fecha_ingreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha' },
    { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
  ],
  columnas: ['nombre', 'ciudad', 'area', 'cuadrilla', 'fecha_ingreso', 'activo'],
}

const capacitaciones: ModuloDef = {
  id: 'capacitaciones', coleccion: 'capacitaciones', titulo: 'Capacitaciones',
  inicial: { cumple: true },
  campos: [
    colaborador,
    { nombre: 'norma', etiqueta: 'Norma', tipo: 'seleccion', requerido: true, origen: catalogo('normas') },
    { nombre: 'cumple', etiqueta: 'Cumple', tipo: 'booleano' },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { nombre: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha' },
  ],
  columnas: ['colaborador_id', 'norma', 'cumple', 'fecha', 'vencimiento'],
  derivar: (v, ctx, hoy) => {
    const base = derivarCiudad(v, ctx)
    const fecha = v.fecha instanceof Date ? v.fecha : null
    const venc = v.vencimiento instanceof Date ? v.vencimiento : null
    return { ...base, estado: estadoCapacitacion(fecha, venc, hoy) }
  },
}

const entregasUniforme: ModuloDef = {
  id: 'entregas_uniforme', coleccion: 'entregas_uniforme', titulo: 'Entregas de uniforme',
  campos: [
    colaborador,
    { nombre: 'prenda', etiqueta: 'Prenda', tipo: 'seleccion', requerido: true, origen: catalogo('prendas') },
    { nombre: 'talla', etiqueta: 'Talla', tipo: 'texto', requerido: true },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true },
    { nombre: 'fecha', etiqueta: 'Fecha de entrega', tipo: 'fecha', requerido: true },
  ],
  columnas: ['colaborador_id', 'prenda', 'talla', 'cantidad', 'fecha'],
  derivar: (v, ctx) => derivarPeriodo(derivarCiudad(v, ctx), 'fecha'),
}

const entregasEpp: ModuloDef = {
  id: 'entregas_epp', coleccion: 'entregas_epp', titulo: 'Entregas de EPP',
  inicial: { entregado: true },
  campos: [
    colaborador,
    { nombre: 'tipo', etiqueta: 'Tipo de EPP', tipo: 'seleccion', requerido: true, origen: catalogo('tipos_epp') },
    { nombre: 'entregado', etiqueta: 'Entregado', tipo: 'booleano' },
    { nombre: 'fecha', etiqueta: 'Fecha de entrega', tipo: 'fecha' },
    { nombre: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha' },
  ],
  columnas: ['colaborador_id', 'tipo', 'entregado', 'fecha', 'vencimiento'],
  derivar: (v, ctx) => derivarCiudad(v, ctx),
}

const accidentes: ModuloDef = {
  id: 'accidentes', coleccion: 'accidentes', titulo: 'Accidentes',
  inicial: { dias_incapacidad: 0 },
  campos: [
    colaborador,
    { nombre: 'fecha', etiqueta: 'Fecha del accidente', tipo: 'fecha', requerido: true },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', requerido: true, origen: catalogo('tipos_accidente') },
    { nombre: 'dias_incapacidad', etiqueta: 'Días de incapacidad', tipo: 'numero', requerido: true },
  ],
  columnas: ['colaborador_id', 'fecha', 'tipo', 'dias_incapacidad'],
  derivar: (v, ctx) => derivarPeriodo(derivarCiudad(v, ctx), 'fecha'),
}

const oficinasEquipo: ModuloDef = {
  id: 'oficinas_equipo', coleccion: 'oficinas_equipo', titulo: 'Equipo de oficinas',
  campos: [
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', requerido: true, origen: catalogo('ciudades') },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', requerido: true, origen: catalogo('tipos_equipo') },
    { nombre: 'detalle', etiqueta: 'Detalle', tipo: 'texto' },
    {
      nombre: 'items', etiqueta: 'Contenido del botiquín', tipo: 'lista', subcampos: subcamposBotiquin,
      visibleSi: (v) => v.tipo === 'botiquin',
    },
    { nombre: 'fecha_recarga', etiqueta: 'Fecha de recarga', tipo: 'fecha' },
    {
      nombre: 'vencimiento', etiqueta: 'Vencimiento o caducidad', tipo: 'fecha',
      visibleSi: (v) => v.tipo !== 'botiquin' || sinItems('items')(v),
    },
  ],
  columnas: ['ciudad', 'tipo', 'detalle', 'items', 'fecha_recarga', 'vencimiento'],
  derivar: (v) => (v.tipo === 'botiquin' ? derivarCaducidad(v, 'items', 'vencimiento') : v),
}

const vehiculos: ModuloDef = {
  id: 'vehiculos', coleccion: 'vehiculos', titulo: 'Vehículos',
  campos: [
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', requerido: true, origen: catalogo('ciudades') },
    { nombre: 'placa', etiqueta: 'Placa', tipo: 'texto', requerido: true },
    { nombre: 'extintor_vencimiento', etiqueta: 'Vencimiento del extintor', tipo: 'fecha' },
    { nombre: 'botiquin_items', etiqueta: 'Contenido del botiquín', tipo: 'lista', subcampos: subcamposBotiquin },
    {
      nombre: 'botiquin_caducidad', etiqueta: 'Caducidad del botiquín', tipo: 'fecha',
      visibleSi: sinItems('botiquin_items'),
    },
  ],
  columnas: ['ciudad', 'placa', 'extintor_vencimiento', 'botiquin_items', 'botiquin_caducidad'],
  derivar: (v) => derivarCaducidad(v, 'botiquin_items', 'botiquin_caducidad'),
}

const indicadoresMensuales: ModuloDef = {
  id: 'indicadores_mensuales', coleccion: 'indicadores_mensuales', titulo: 'Población mensual',
  campos: [
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', requerido: true, origen: catalogo('ciudades') },
    {
      nombre: 'periodo', etiqueta: 'Periodo (AAAA-MM)', tipo: 'texto', requerido: true,
      patron: /^\d{4}-(0[1-9]|1[0-2])$/, mensajePatron: 'Formato AAAA-MM',
    },
    { nombre: 'poblacion', etiqueta: 'Población', tipo: 'numero', requerido: true },
  ],
  columnas: ['ciudad', 'periodo', 'poblacion'],
  idFijo: (v) => `${v.ciudad}_${v.periodo}`,
  bloquearEnEdicion: ['ciudad', 'periodo'],
}

export const MODULOS: Record<string, ModuloDef> = {
  colaboradores,
  capacitaciones,
  entregas_uniforme: entregasUniforme,
  entregas_epp: entregasEpp,
  accidentes,
  oficinas_equipo: oficinasEquipo,
  vehiculos,
  indicadores_mensuales: indicadoresMensuales,
}

// Los colaboradores se desactivan y la configuración no es una lista.
export function admiteEliminar(def: ModuloDef): boolean {
  return MODULOS[def.id] === def && def.id !== 'colaboradores'
}

const numero = (nombre: string, etiqueta: string): CampoDef =>
  ({ nombre, etiqueta, tipo: 'numero', requerido: true })

export const MODULO_CONFIGURACION: ModuloDef = {
  id: 'configuracion', coleccion: 'configuracion', titulo: 'Configuración de indicadores',
  campos: [
    numero('horas_por_persona_mes', 'Horas por persona al mes'),
    numero('k_mensual', 'K mensual'),
    numero('k_anual', 'K anual'),
    numero('umbral_supera', 'Umbral ILI: supera'),
    numero('umbral_meta', 'Umbral ILI: meta'),
    numero('umbral_minimo', 'Umbral ILI: mínimo'),
    numero('referencia_interpretacion', 'Referencia de interpretación'),
  ],
  columnas: ['horas_por_persona_mes', 'k_mensual', 'k_anual', 'umbral_supera', 'umbral_meta', 'umbral_minimo', 'referencia_interpretacion'],
  idFijo: () => 'indicadores',
}
