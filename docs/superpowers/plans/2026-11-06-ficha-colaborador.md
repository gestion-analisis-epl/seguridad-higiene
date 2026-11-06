# Ficha del colaborador y tablas navegables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada tabla donde aparece un colaborador lleve a una ficha única `/colaboradores/[id]` con sus datos, pendientes, capacitaciones, uniformes, EPP, accidentes y archivos.

**Architecture:** Página cliente que reutiliza los hooks en tiempo real (`useColeccion`, `useDotacion`, `useCatalogo`) y las funciones de cálculo del dashboard aplicadas a un solo colaborador. La lógica nueva es pura y vive en `src/application/ficha-colaborador.ts`; los componentes de la ficha viven en `src/presentation/colaboradores/ficha/`. Los enlaces salen de un único helper `rutaColaborador`.

**Tech Stack:** Next.js 16.4.3 (App Router, página cliente con `useParams`), React, TypeScript, Firestore (cliente, tiempo real), Vitest (entorno `node`, solo pruebas `.test.ts`).

**Spec:** `docs/superpowers/specs/2026-11-06-ficha-colaborador-design.md`

## Global Constraints

- Idioma de la interfaz y de los identificadores del dominio: español (como el resto del código).
- Comentarios: una sola línea y solo cuando aportan (preferencia del proyecto).
- **No hacer `git commit` en ninguna tarea**: el usuario revisa y prueba antes. Cada tarea termina con un punto de verificación, no con commit. El árbol ya tiene cambios sin commitear de otras tareas; no mezclarlos ni revertirlos.
- Las pruebas son solo de lógica pura (`*.test.ts`, entorno `node`); lo visual se verifica a mano con `npm run dev`.
- Verificación de cada tarea: `npx tsc --noEmit` sin salida y `npx vitest run` en verde; `npx eslint <archivos tocados>` sin errores nuevos.
- Lectura de la ficha requiere solo permiso `leer` (ya lo exige el layout `(app)`); los botones de captura requieren `puede(usuario, 'capturar')` y que el módulo no sea `soloLectura`.
- El id de la ruta es el id del documento en `colaboradores`.

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/presentation/navegacion/enlaces.ts` | Modificar | `rutaColaborador(id)`, único constructor de la ruta |
| `src/application/dashboard.ts` | Modificar | Exportar `normasFaltantes` |
| `src/application/ficha-colaborador.ts` | Crear | `fichaDeColaborador`, `registrosDelColaborador`, `datosGenerales` |
| `src/presentation/datos/FormularioModulo.tsx` | Modificar | Prop opcional `inicial` para prellenar un registro nuevo |
| `src/presentation/entregas/HistorialEntregas.tsx` | Modificar | Prop opcional `titulo` |
| `src/presentation/dashboard/DetalleDialogo.tsx` | Modificar | Pasar `alSeleccionarFila` y `textoAccionFila` a la tabla |
| `src/presentation/colaboradores/ficha/SeccionFicha.tsx` | Crear | Marco de sección con título, cuenta y acciones |
| `src/presentation/colaboradores/ficha/TablaFicha.tsx` | Crear | Tabla de un módulo para un solo colaborador |
| `src/presentation/colaboradores/ficha/PendientesFicha.tsx` | Crear | Lista de lo que falta |
| `src/presentation/colaboradores/ficha/FormularioDialogo.tsx` | Crear | `FormularioModulo` dentro de `Dialogo` |
| `src/presentation/colaboradores/ficha/FichaColaborador.tsx` | Crear | Composición de la ficha |
| `src/app/(app)/colaboradores/[id]/page.tsx` | Crear | Ruta de la ficha |
| `src/presentation/dashboard/celdas.tsx` | Modificar | Nombre de colaborador como enlace en alertas |
| `src/presentation/dashboard/DashboardOperativo.tsx` | Modificar | Clic en filas de pendientes (tabla y diálogo) |
| `src/presentation/datos/PaginaModulo.tsx` | Modificar | Colaboradores: la fila lleva a la ficha |
| `src/presentation/datos/TablaModulo.tsx` | Modificar | Columna "Ficha" en módulos con colaborador; `textoAccionFila` |
| `src/presentation/entregas/PaginaEntregas.tsx`, `TablaEntregas.tsx` | Modificar | La fila lleva a la ficha |
| `src/presentation/entregas/PanelEntrega.tsx` | Eliminar | La ficha lo reemplaza |
| `src/presentation/navegacion/BuscadorGlobal.tsx` | Modificar | El colaborador elegido abre su ficha |
| `src/presentation/navegacion/filtro-colaborador.ts` y `.test.ts` | Eliminar | Ya no se usan |

---

### Task 1: Helper de ruta `rutaColaborador`

**Files:**
- Modify: `src/presentation/navegacion/enlaces.ts`
- Test: `src/presentation/navegacion/enlaces.test.ts`

**Interfaces:**
- Produces: `rutaColaborador(id: string): string` exportada desde `@/presentation/navegacion/enlaces`.

- [ ] **Step 1: Escribir la prueba que falla**

En `enlaces.test.ts`, cambiar la importación y agregar al final:

```ts
import { ENLACE_ADMIN, estaActivo, gruposDeNavegacion, gruposParaBusqueda, rutaColaborador } from './enlaces'
```

```ts
describe('rutaColaborador', () => {
  it('arma la ruta de la ficha y codifica el id', () => {
    expect(rutaColaborador('abc123')).toBe('/colaboradores/abc123')
    expect(rutaColaborador('a/b c')).toBe('/colaboradores/a%2Fb%20c')
  })
})
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/presentation/navegacion/enlaces.test.ts`
Expected: FAIL (`rutaColaborador` no está exportada).

- [ ] **Step 3: Implementar**

En `enlaces.ts`, debajo de `ENLACE_ADMIN`:

```ts
// Único lugar que construye la ruta de la ficha de un colaborador
export const rutaColaborador = (id: string) => `/colaboradores/${encodeURIComponent(id)}`
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/presentation/navegacion/enlaces.test.ts`
Expected: PASS.

---

### Task 2: Lógica pura de la ficha

**Files:**
- Modify: `src/application/dashboard.ts` (exportar `normasFaltantes`)
- Create: `src/application/ficha-colaborador.ts`
- Test: `src/application/ficha-colaborador.test.ts`

**Interfaces:**
- Consumes: `evaluacionColaboradores(d, hoy, dotacion): Evaluacion[]` y `normasFaltantes(c, caps, hoy): string[]` de `./dashboard`.
- Produces:
  - `interface Pendientes { evaluacion: Evaluacion; normas: string[]; exigeCapacitacion: boolean }`
  - `interface FichaColaborador { colaborador: Colaborador; pendientes: Pendientes | null }`
  - `fichaDeColaborador(d: DatosOperativos, id: string, hoy: Date, dotacion?: Dotacion): FichaColaborador | null`
  - `registrosDelColaborador<T extends Record<string, unknown>>(registros: T[], id: string): T[]`
  - `interface DatoGeneral { etiqueta: string; valor: string }`
  - `interface EtiquetasGenerales { ciudad(v: string): string; area(v: string): string; cuadrilla(v: string): string; linea_negocio(v: string): string }`
  - `datosGenerales(registro: Record<string, unknown>, etiquetas: EtiquetasGenerales): DatoGeneral[]`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/application/ficha-colaborador.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Colaborador, DatosOperativos } from '@/domain/entidades'
import { fechaCalendario } from '@/domain/fechas'
import type { Dotacion, ReglaDotacion } from '@/domain/reglas-dotacion'
import { datosGenerales, fichaDeColaborador, registrosDelColaborador } from './ficha-colaborador'

const hoy = new Date(2026, 8, 30)
const regla = (agrega: string[]): ReglaDotacion => ({
  id: 'r', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'Guardia', ciudad: null, area: null, agrega, quita: [],
})
const dotacion: Dotacion = { uniforme: [regla(['botas', 'playera'])], epp: [regla(['casco'])] }
const persona = (o: Partial<Colaborador> = {}): Colaborador => ({
  id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', puesto: 'Guardia',
  normas_obligatorias: ['norma-a', 'norma-b'], activo: true, ...o,
})
const datos = (colaboradores: Colaborador[]): DatosOperativos => ({
  colaboradores,
  capacitaciones: [{ colaborador_id: 'c1', norma: 'norma-a', ciudad: 'ciudad-a', cumple: true, fecha: fechaCalendario(2026, 5, 4), vencimiento: fechaCalendario(2027, 5, 4) }],
  entregasUniforme: [{ colaborador_id: 'c1', prenda: 'botas' }],
  entregasEpp: [], equipoOficinas: [], vehiculos: [],
})

describe('fichaDeColaborador', () => {
  it('devuelve null si el colaborador no existe', () => {
    expect(fichaDeColaborador(datos([persona()]), 'zz', hoy, dotacion)).toBeNull()
  })

  it('calcula lo que le falta solo a esa persona', () => {
    const ficha = fichaDeColaborador(datos([persona(), persona({ id: 'c2', nombre: 'Beto' })]), 'c1', hoy, dotacion)!
    expect(ficha.colaborador.nombre).toBe('Ana')
    expect(ficha.pendientes).toMatchObject({ normas: ['norma-b'], exigeCapacitacion: true })
    expect(ficha.pendientes!.evaluacion).toMatchObject({ capacitacionPendiente: true, prendasFaltantes: ['playera'], eppFaltantes: ['casco'] })
  })

  it('sin normas asignadas no exige capacitación', () => {
    const ficha = fichaDeColaborador(datos([persona({ normas_obligatorias: [] })]), 'c1', hoy, dotacion)!
    expect(ficha.pendientes).toMatchObject({ normas: [], exigeCapacitacion: false })
  })

  it('un colaborador de baja no se evalúa', () => {
    const ficha = fichaDeColaborador(datos([persona({ activo: false })]), 'c1', hoy, dotacion)!
    expect(ficha.pendientes).toBeNull()
  })
})

describe('registrosDelColaborador', () => {
  it('conserva solo los registros del colaborador', () => {
    const r = [{ id: 'a', colaborador_id: 'c1' }, { id: 'b', colaborador_id: 'c2' }, { id: 'c' }]
    expect(registrosDelColaborador(r, 'c1')).toEqual([{ id: 'a', colaborador_id: 'c1' }])
  })
})

describe('datosGenerales', () => {
  const etiquetas = {
    ciudad: (v: string) => `Ciudad ${v}`, area: (v: string) => `Área ${v}`,
    cuadrilla: (v: string) => `Cuadrilla ${v}`, linea_negocio: (v: string) => `Línea ${v}`,
  }
  const registro = {
    numero_colaborador: '2116', id_interno: '12062', puesto: 'Guardia', empresa: 'SICMART', linea_negocio: 'x', ciudad: 'leon',
    plaza: 'LEON', zona: 'Bajío', area: 'seg', jefe: 'JOSE', gerente: 'ALFONSO', fecha_ingreso: fechaCalendario(2026, 9, 28),
  }
  const mapa = (d: { etiqueta: string; valor: string }[]) => Object.fromEntries(d.map((x) => [x.etiqueta, x.valor]))

  it('da etiquetas legibles y formato de fecha', () => {
    expect(mapa(datosGenerales(registro, etiquetas))).toMatchObject({
      'Número de colaborador': '2116', 'ID interno': '12062', Puesto: 'Guardia', Ciudad: 'Ciudad leon',
      'Línea de negocio': 'Línea x', 'Área': 'Área seg', 'Fecha de ingreso': '28/09/2026',
    })
  })

  it('los datos vacíos se muestran con guion y la baja solo si existe', () => {
    const sinBaja = mapa(datosGenerales(registro, etiquetas))
    expect(sinBaja.Cuadrilla).toBe('-')
    expect('Fecha de baja' in sinBaja).toBe(false)
    const conBaja = mapa(datosGenerales({ ...registro, fecha_baja: fechaCalendario(2026, 10, 1), motivo_baja: 'RENUNCIA' }, etiquetas))
    expect(conBaja).toMatchObject({ 'Fecha de baja': '01/10/2026', 'Motivo de baja': 'RENUNCIA' })
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run src/application/ficha-colaborador.test.ts`
Expected: FAIL (módulo `./ficha-colaborador` no existe).

- [ ] **Step 3: Exportar `normasFaltantes`**

En `src/application/dashboard.ts` cambiar `function normasFaltantes(` por `export function normasFaltantes(` (sin tocar su cuerpo).

- [ ] **Step 4: Implementar**

Crear `src/application/ficha-colaborador.ts`:

```ts
import type { Colaborador, DatosOperativos } from '@/domain/entidades'
import { formatearFecha } from '@/domain/fechas'
import { DOTACION_VACIA, type Dotacion } from '@/domain/reglas-dotacion'
import { evaluacionColaboradores, normasFaltantes, type Evaluacion } from './dashboard'

export interface Pendientes { evaluacion: Evaluacion; normas: string[]; exigeCapacitacion: boolean }
export interface FichaColaborador { colaborador: Colaborador; pendientes: Pendientes | null }

// Pendientes con las mismas reglas del dashboard; sin evaluación para quien está de baja
export function fichaDeColaborador(d: DatosOperativos, id: string, hoy: Date, dotacion: Dotacion = DOTACION_VACIA): FichaColaborador | null {
  const colaborador = d.colaboradores.find((c) => c.id === id)
  if (!colaborador) return null
  const [evaluacion] = evaluacionColaboradores({ ...d, colaboradores: [colaborador] }, hoy, dotacion)
  if (!evaluacion) return { colaborador, pendientes: null }
  return {
    colaborador,
    pendientes: {
      evaluacion, normas: normasFaltantes(colaborador, d.capacitaciones, hoy),
      exigeCapacitacion: (colaborador.normas_obligatorias ?? []).length > 0,
    },
  }
}

export const registrosDelColaborador = <T extends Record<string, unknown>>(registros: T[], id: string): T[] =>
  registros.filter((r) => r.colaborador_id === id)

export interface DatoGeneral { etiqueta: string; valor: string }
type Etiquetar = (valor: string) => string
export interface EtiquetasGenerales { ciudad: Etiquetar; area: Etiquetar; cuadrilla: Etiquetar; linea_negocio: Etiquetar }

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const fecha = (v: unknown) => (v instanceof Date ? formatearFecha(v) : '')

export function datosGenerales(r: Record<string, unknown>, etiquetas: EtiquetasGenerales): DatoGeneral[] {
  const catalogo = (v: unknown, etiquetar: Etiquetar) => (texto(v) ? etiquetar(texto(v)) : '')
  const filas: [string, string][] = [
    ['Número de colaborador', texto(r.numero_colaborador)],
    ['ID interno', texto(r.id_interno)],
    ['Puesto', texto(r.puesto)],
    ['Empresa', texto(r.empresa)],
    ['Línea de negocio', catalogo(r.linea_negocio, etiquetas.linea_negocio)],
    ['Ciudad', catalogo(r.ciudad, etiquetas.ciudad)],
    ['Plaza', texto(r.plaza)],
    ['Zona', texto(r.zona)],
    ['Área', catalogo(r.area, etiquetas.area)],
    ['Cuadrilla', catalogo(r.cuadrilla, etiquetas.cuadrilla)],
    ['Jefe', texto(r.jefe)],
    ['Gerente', texto(r.gerente)],
    ['Fecha de ingreso', fecha(r.fecha_ingreso)],
  ]
  if (r.fecha_baja instanceof Date) filas.push(['Fecha de baja', fecha(r.fecha_baja)], ['Motivo de baja', texto(r.motivo_baja)])
  return filas.map(([etiqueta, valor]) => ({ etiqueta, valor: valor || '-' }))
}
```

- [ ] **Step 5: Ver que pasan**

Run: `npx vitest run src/application`
Expected: PASS (incluida la suite existente de `dashboard.test.ts`).

---

### Task 3: Ajustes pequeños a componentes existentes

**Files:**
- Modify: `src/presentation/datos/FormularioModulo.tsx`
- Modify: `src/presentation/entregas/HistorialEntregas.tsx`
- Modify: `src/presentation/dashboard/DetalleDialogo.tsx`

**Interfaces:**
- Produces:
  - `FormularioModulo` acepta `inicial?: Valores` (valores que prellenan un registro nuevo, sobre `def.inicial`).
  - `HistorialEntregas` acepta `titulo?: string` (por defecto `'Historial de entregas'`).
  - `DetalleDialogo<T>` acepta `alSeleccionarFila?: (fila: T) => void` y `textoAccionFila?: string`.

- [ ] **Step 1: `FormularioModulo` con `inicial`**

En `FormularioModulo.tsx`:

```ts
interface Props {
  def: ModuloDef
  registro?: Registro
  inicial?: Valores
  alTerminar: () => void
}

function valoresDe(def: ModuloDef, registro?: Registro, inicial?: Valores): Valores {
  const base: Valores = { ...(def.inicial ?? {}), ...(inicial ?? {}) }
  for (const c of def.campos) {
    if (registro && c.nombre in registro) base[c.nombre] = registro[c.nombre] as Valor
  }
  return base
}
```

y en el componente:

```ts
export function FormularioModulo({ def, registro, inicial, alTerminar }: Props) {
  ...
  const [valores, setValores] = useState<Valores>(() => valoresDe(def, registro, inicial))
```

- [ ] **Step 2: `HistorialEntregas` con `titulo`**

En `HistorialEntregas.tsx` la firma pasa a `{ config, registros, items, titulo = 'Historial de entregas' }` (tipo `titulo?: string`) y el `<h2>` a:

```tsx
<h2 id="titulo-historial" className="mb-2 text-base">{titulo} ({registros.length})</h2>
```

Nota: el `id="titulo-historial"` se repite si hay dos historiales en la misma página; cambiarlo a un id único con `useId`:

```tsx
const idTitulo = useId()
...
<section aria-labelledby={idTitulo}>
  <h2 id={idTitulo} className="mb-2 text-base">{titulo} ({registros.length})</h2>
```

(añadir `useId` al import de `react`).

- [ ] **Step 3: `DetalleDialogo` con clic en fila**

Reemplazar el cuerpo de `DetalleDialogo.tsx`:

```tsx
export function DetalleDialogo<T>({ titulo, unidad, filas, columnas, idFila, alSeleccionarFila, textoAccionFila, alCerrar }: {
  titulo: string
  unidad: string
  filas: T[]
  columnas: ColumnaTabla<T>[]
  idFila: (fila: T) => string
  alSeleccionarFila?: (fila: T) => void
  textoAccionFila?: string
  alCerrar: () => void
}) {
  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar}>
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <h3 className="text-base">{titulo} <span className="text-texto-suave">· {filas.length} {unidad}</span></h3>
        <button type="button" className="boton-secundario" onClick={alCerrar}>Cerrar</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <DataTable columnas={columnas} filas={filas} idFila={idFila} alSeleccionarFila={alSeleccionarFila} textoAccionFila={textoAccionFila}
          vacio="Sin registros" etiqueta={titulo} claveAnchos="dashboard-detalle" />
      </div>
    </Dialogo>
  )
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` y `npx vitest run`
Expected: sin errores; suite en verde.

---

### Task 4: Componentes de la ficha

**Files:**
- Create: `src/presentation/colaboradores/ficha/SeccionFicha.tsx`
- Create: `src/presentation/colaboradores/ficha/TablaFicha.tsx`
- Create: `src/presentation/colaboradores/ficha/PendientesFicha.tsx`
- Create: `src/presentation/colaboradores/ficha/FormularioDialogo.tsx`

**Interfaces:**
- Consumes: `Pendientes` (Task 2); `FormularioModulo` con `inicial` (Task 3).
- Produces:
  - `SeccionFicha({ id, titulo, cantidad?, acciones?, children })`
  - `TablaFicha({ def, registros, alSeleccionar? })`
  - `PendientesFicha({ pendientes, etiquetaNorma, etiquetaArticulo })`
  - `FormularioDialogo({ def, registro?, inicial?, alCerrar })`

- [ ] **Step 1: `SeccionFicha.tsx`**

```tsx
import type { ReactNode } from 'react'

export function SeccionFicha({ id, titulo, cantidad, acciones, children }: {
  id: string; titulo: string; cantidad?: number; acciones?: ReactNode; children: ReactNode
}) {
  return (
    <section aria-labelledby={`ficha-${id}`} className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`ficha-${id}`} className="text-base">
          {titulo}{cantidad !== undefined && <span className="text-texto-suave"> ({cantidad})</span>}
        </h2>
        {acciones}
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 2: `TablaFicha.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import type { ModuloDef } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { columnasDeModulo } from '@/presentation/datos/columnas-modulo'
import { ordenarRegistros } from '@/presentation/datos/orden'
import { useOpcionesDeCampos } from '@/presentation/datos/useOpcionesDeCampos'
import { DataTable } from '@/presentation/ui/tabla'

const idRegistro = (r: Registro) => r.id

// Los registros de un módulo para un solo colaborador, sin la columna del colaborador
export function TablaFicha({ def, registros, alSeleccionar }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
}) {
  const campos = useMemo(() => def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!), [def])
  const opciones = useOpcionesDeCampos(campos)
  const columnas = useMemo(() => columnasDeModulo(def, opciones).filter((c) => c.id !== 'colaborador_id'), [def, opciones])
  const filas = useMemo(() => ordenarRegistros(def, registros, opciones), [def, registros, opciones])
  return (
    <DataTable columnas={columnas} filas={filas} idFila={idRegistro} alSeleccionarFila={alSeleccionar}
      vacio="Sin registros" etiqueta={def.titulo} claveAnchos={`ficha-${def.id}`} />
  )
}
```

- [ ] **Step 3: `PendientesFicha.tsx`**

```tsx
import type { Pendientes } from '@/application/ficha-colaborador'

type Etiquetar = (valor: string) => string

// faltan === null: no aplica, y vacio explica por qué
function Fila({ rotulo, faltan, vacio }: { rotulo: string; faltan: string[] | null; vacio: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="w-28 shrink-0 text-sm text-texto-suave">{rotulo}</span>
      {faltan === null ? <span className="text-sm text-texto-suave">{vacio}</span>
        : faltan.length === 0 ? <span className="insignia-vigente">Completo</span>
          : (
            <>
              <span className="insignia-vencido">Faltan {faltan.length}</span>
              <span className="text-sm">{faltan.join(', ')}</span>
            </>
          )}
    </li>
  )
}

export function PendientesFicha({ pendientes, etiquetaNorma, etiquetaArticulo }: {
  pendientes: Pendientes | null; etiquetaNorma: Etiquetar; etiquetaArticulo: Etiquetar
}) {
  if (!pendientes) return <p className="text-sm text-texto-suave">Colaborador de baja: no se evalúa contra las reglas.</p>
  const { evaluacion: e, normas, exigeCapacitacion } = pendientes
  const sinRegla = 'Sin regla de dotación para su puesto, empresa y ciudad'
  return (
    <ul className="divide-y divide-borde rounded border border-borde px-3">
      <Fila rotulo="Capacitación" faltan={exigeCapacitacion ? normas.map(etiquetaNorma) : null} vacio="Sin normas obligatorias asignadas" />
      <Fila rotulo="Uniforme" faltan={e.pideUniforme ? e.prendasFaltantes.map(etiquetaArticulo) : null} vacio={e.sinRegla ? sinRegla : 'Su regla no exige uniforme'} />
      <Fila rotulo="EPP" faltan={e.pideEpp ? e.eppFaltantes.map(etiquetaArticulo) : null} vacio={e.sinRegla ? sinRegla : 'Su regla no exige EPP'} />
    </ul>
  )
}
```

- [ ] **Step 4: `FormularioDialogo.tsx`**

```tsx
'use client'

import type { ModuloDef, Valores } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { FormularioModulo } from '@/presentation/datos/FormularioModulo'
import { Dialogo } from '@/presentation/ui/Dialogo'

// El formulario de siempre del módulo, sin salir de la ficha
export function FormularioDialogo({ def, registro, inicial, alCerrar }: {
  def: ModuloDef
  registro?: Registro
  inicial?: Valores
  alCerrar: () => void
}) {
  return (
    <Dialogo titulo={`${registro ? 'Editar' : 'Nuevo'} · ${def.titulo}`} alCerrar={alCerrar}>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <FormularioModulo def={def} registro={registro} inicial={inicial} alTerminar={alCerrar} />
      </div>
    </Dialogo>
  )
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit` y `npx eslint src/presentation/colaboradores/ficha`
Expected: sin errores.

---

### Task 5: Página y composición de la ficha

**Files:**
- Create: `src/presentation/colaboradores/ficha/FichaColaborador.tsx`
- Create: `src/app/(app)/colaboradores/[id]/page.tsx`

**Interfaces:**
- Consumes: todo lo de las Tasks 1–4; `CONFIGURACIONES` de `@/presentation/entregas/configuraciones`; `historialDe` de `@/application/entregas-agrupar`; `ArchivosDeColaborador`; `useSesion`; `puede`.
- Produces: `FichaColaborador({ id })` y la ruta `/colaboradores/[id]`.

- [ ] **Step 1: `FichaColaborador.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { historialDe } from '@/application/entregas-agrupar'
import { datosGenerales, fichaDeColaborador, registrosDelColaborador } from '@/application/ficha-colaborador'
import type { DatosOperativos } from '@/domain/entidades'
import type { ModuloDef, Opcion, Valores } from '@/domain/modulos'
import { MODULOS } from '@/domain/modulos-definiciones'
import { puede } from '@/domain/permisos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { ArchivosDeColaborador } from '@/presentation/adjuntos/ArchivosDeColaborador'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useDotacion } from '@/presentation/datos/useDotacion'
import { CONFIGURACIONES, type ConfiguracionPagina } from '@/presentation/entregas/configuraciones'
import { HistorialEntregas } from '@/presentation/entregas/HistorialEntregas'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { FormularioDialogo } from './FormularioDialogo'
import { PendientesFicha } from './PendientesFicha'
import { SeccionFicha } from './SeccionFicha'
import { TablaFicha } from './TablaFicha'

const etiquetadora = (opciones: Opcion[]) => (valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor.replace(/-/g, ' ')

interface Edicion { def: ModuloDef; registro?: Registro; inicial?: Valores }

function EntregasFicha({ cfg, registros, colaboradorId, titulo }: {
  cfg: ConfiguracionPagina; registros: Registro[]; colaboradorId: string; titulo: string
}) {
  const items = useCatalogo(cfg.catalogo)
  const historial = useMemo(() => historialDe(registros, colaboradorId), [registros, colaboradorId])
  return <HistorialEntregas config={cfg.config} registros={historial} items={items} titulo={titulo} />
}

export function FichaColaborador({ id }: { id: string }) {
  const router = useRouter()
  const { usuario } = useSesion()
  const capturista = puede(usuario, 'capturar')
  const colaboradores = useColeccion('colaboradores')
  const capacitaciones = useColeccion('capacitaciones')
  const accidentes = useColeccion('accidentes')
  const uniformes = useColeccion('entregas_uniforme')
  const epp = useColeccion('entregas_epp')
  const { dotacion, cargando: cargandoReglas, error: errorReglas } = useDotacion()
  const ciudades = useCatalogo('ciudades')
  const areas = useCatalogo('areas')
  const cuadrillas = useCatalogo('cuadrillas')
  const lineas = useCatalogo('lineas_negocio')
  const normas = useCatalogo('normas')
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const hoy = useMemo(() => new Date(), [])

  const datos = useMemo<DatosOperativos>(() => ({
    colaboradores: colaboradores.registros as unknown as DatosOperativos['colaboradores'],
    capacitaciones: capacitaciones.registros as unknown as DatosOperativos['capacitaciones'],
    entregasUniforme: uniformes.registros as unknown as DatosOperativos['entregasUniforme'],
    entregasEpp: epp.registros as unknown as DatosOperativos['entregasEpp'],
    equipoOficinas: [], vehiculos: [],
  }), [colaboradores.registros, capacitaciones.registros, uniformes.registros, epp.registros])
  const ficha = useMemo(() => fichaDeColaborador(datos, id, hoy, dotacion), [datos, id, hoy, dotacion])
  const registro = colaboradores.registros.find((r) => r.id === id)
  const generales = useMemo(() => (registro ? datosGenerales(registro, {
    ciudad: etiquetadora(ciudades), area: etiquetadora(areas), cuadrilla: etiquetadora(cuadrillas), linea_negocio: etiquetadora(lineas),
  }) : []), [registro, ciudades, areas, cuadrillas, lineas])
  const etiquetaArticulo = useMemo(() => etiquetadora([...prendas, ...tiposEpp]), [prendas, tiposEpp])
  const etiquetaNorma = useMemo(() => etiquetadora(normas), [normas])

  const fuentes = [colaboradores, capacitaciones, accidentes, uniformes, epp]
  if (fuentes.some((f) => f.cargando) || cargandoReglas) return <Cargando />
  const fallo = fuentes.find((f) => f.error)?.error ?? errorReglas
  if (fallo) return <AvisoError>{fallo}</AvisoError>

  const volver = (
    <button type="button" onClick={() => router.back()} className="boton-secundario">
      <Icono nombre="volver" />
      Volver
    </button>
  )
  if (!ficha || !registro) {
    return (
      <section className="aparecer">
        <EncabezadoPagina rotulo="Colaborador" titulo="Colaborador no encontrado" acciones={volver} />
        <AvisoError>Este colaborador no existe o fue eliminado.</AvisoError>
      </section>
    )
  }

  const { colaborador } = ficha
  const activo = colaborador.activo !== false
  const nuevo = (def: ModuloDef) => (capturista && !def.soloLectura ? (
    <button type="button" className="boton-primario" onClick={() => setEdicion({ def, inicial: { colaborador_id: id } })}>
      <Icono nombre="mas" />
      Nuevo
    </button>
  ) : undefined)
  const editable = (def: ModuloDef) => (capturista && !def.soloLectura ? (r: Registro) => setEdicion({ def, registro: r }) : undefined)
  const propios = (registros: Registro[]) => registrosDelColaborador(registros, id)
  const capDef = MODULOS.capacitaciones
  const accDef = MODULOS.accidentes

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Colaborador" titulo={colaborador.nombre}
        detalle={`${etiquetadora(ciudades)(colaborador.ciudad)} · ${activo ? 'Activo' : 'De baja'}`}
        acciones={(
          <>
            {volver}
            {capturista && (
              <button type="button" className="boton-secundario" onClick={() => setEdicion({ def: MODULOS.colaboradores, registro })}>
                <Icono nombre="editar" />
                Editar datos
              </button>
            )}
          </>
        )} />

      <SeccionFicha id="generales" titulo="Datos generales">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {generales.map((d) => (
            <div key={d.etiqueta}>
              <dt className="text-xs text-texto-suave">{d.etiqueta}</dt>
              <dd className="text-sm">{d.valor}</dd>
            </div>
          ))}
        </dl>
      </SeccionFicha>

      <SeccionFicha id="pendientes" titulo="Pendientes">
        <PendientesFicha pendientes={ficha.pendientes} etiquetaNorma={etiquetaNorma} etiquetaArticulo={etiquetaArticulo} />
      </SeccionFicha>

      <SeccionFicha id="capacitaciones" titulo="Capacitaciones" cantidad={propios(capacitaciones.registros).length} acciones={nuevo(capDef)}>
        <TablaFicha def={capDef} registros={propios(capacitaciones.registros)} alSeleccionar={editable(capDef)} />
      </SeccionFicha>

      <div className="mt-8"><EntregasFicha cfg={CONFIGURACIONES.entregas_uniforme} registros={uniformes.registros} colaboradorId={id} titulo="Uniformes" /></div>
      <div className="mt-8"><EntregasFicha cfg={CONFIGURACIONES.entregas_epp} registros={epp.registros} colaboradorId={id} titulo="EPP" /></div>

      <SeccionFicha id="accidentes" titulo="Accidentes" cantidad={propios(accidentes.registros).length} acciones={nuevo(accDef)}>
        <TablaFicha def={accDef} registros={propios(accidentes.registros)} alSeleccionar={editable(accDef)} />
      </SeccionFicha>

      <div className="mt-8"><ArchivosDeColaborador colaboradorId={id} /></div>

      {edicion && <FormularioDialogo def={edicion.def} registro={edicion.registro} inicial={edicion.inicial} alCerrar={() => setEdicion(null)} />}
    </section>
  )
}
```

- [ ] **Step 2: Ruta**

Crear `src/app/(app)/colaboradores/[id]/page.tsx`:

```tsx
'use client'

import { useParams } from 'next/navigation'
import { FichaColaborador } from '@/presentation/colaboradores/ficha/FichaColaborador'

export default function FichaColaboradorPage() {
  const { id } = useParams<{ id: string }>()
  return <FichaColaborador key={id} id={decodeURIComponent(id)} />
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`, `npx eslint src/presentation/colaboradores/ficha "src/app/(app)/colaboradores"`, `npx vitest run`
Expected: sin errores.

- [ ] **Step 4: Comprobación manual**

Run: `npm run dev`, abrir `/colaboradores/<uid>` (el uid del 2116 es `1nbqf8ie8gF98saIYvWE`). Verificar: encabezado con nombre y estado; datos generales completos; pendientes; capacitaciones, uniformes (con columna "Registro" y "Entrega"), EPP, accidentes y archivos; con rol `consulta` no aparecen "Nuevo" ni "Editar datos"; con rol capturista, "Nuevo" abre el formulario con el colaborador ya elegido.

---

### Task 6: Enlaces desde el dashboard

**Files:**
- Modify: `src/presentation/dashboard/celdas.tsx`
- Modify: `src/presentation/dashboard/DashboardOperativo.tsx`

**Interfaces:**
- Consumes: `rutaColaborador` (Task 1); `DetalleDialogo` con `alSeleccionarFila` (Task 3).

- [ ] **Step 1: Nombre como enlace en alertas**

En `celdas.tsx` agregar los imports `import Link from 'next/link'` y `import { rutaColaborador } from '@/presentation/navegacion/enlaces'`, y en `celdasAlertas` añadir:

```tsx
  referencia: (a: Alerta) => (a.colaborador
    ? <Link href={rutaColaborador(a.colaborador.id)} className="font-medium underline-offset-2 hover:underline">{a.referencia}</Link>
    : a.referencia),
```

(Solo las alertas de capacitación y EPP traen `colaborador`; extintores, botiquines y vehículos quedan como texto.)

- [ ] **Step 2: Clic en filas de pendientes**

En `DashboardOperativo.tsx`: importar `useRouter` de `next/navigation` y `rutaColaborador` de `@/presentation/navegacion/enlaces`; junto a los demás hooks, antes de cualquier `return` temprano:

```tsx
  const router = useRouter()
  const verFicha = (p: Pendiente) => router.push(rutaColaborador(p.colaborador.id))
```

Tabla "Colaboradores con pendientes":

```tsx
<DataTable columnas={colsPendientes} filas={pendientes} idFila={(p) => p.colaborador.id}
  alSeleccionarFila={verFicha} textoAccionFila="ver ficha"
  vacio="Sin pendientes." etiqueta="Colaboradores con pendientes" claveAnchos="dashboard-pendientes" />
```

Diálogo de colaboradores:

```tsx
<DetalleDialogo titulo={detalle.titulo} unidad="colaboradores" filas={detalle.filas} columnas={colsPendientes}
  idFila={(p) => p.colaborador.id} alSeleccionarFila={verFicha} textoAccionFila="ver ficha" alCerrar={() => setDetalle(null)} />
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`, `npx vitest run`
Manual (`npm run dev`, `/`): clic en una fila de "Colaboradores con pendientes" abre su ficha; en una tarjeta (por ejemplo "Colaboradores activos") el clic en una fila también; en "Vencimientos" el nombre de capacitación/EPP es enlace y el de extintor/botiquín no. Al volver con "Volver" el filtro de ciudades se conserva (se guarda en `usePersistente`).

---

### Task 7: Enlaces desde módulos de datos y entregas

**Files:**
- Modify: `src/presentation/datos/PaginaModulo.tsx`
- Modify: `src/presentation/datos/TablaModulo.tsx`
- Modify: `src/presentation/entregas/PaginaEntregas.tsx`
- Modify: `src/presentation/entregas/TablaEntregas.tsx`
- Delete: `src/presentation/entregas/PanelEntrega.tsx`

**Interfaces:**
- Consumes: `rutaColaborador` (Task 1).
- Produces: `TablaModulo` acepta `textoAccionFila?: string`.

- [ ] **Step 1: `TablaModulo`: columna "Ficha" y texto de acción**

En `TablaModulo.tsx`: importar `Link` de `next/link`, `rutaColaborador` de `@/presentation/navegacion/enlaces` y el tipo `ColumnaTabla` de `@/presentation/ui/tabla`. Añadir `textoAccionFila` a las props, y después de `const columnas = useMemo(...)` (renombrar esa constante a `columnasBase`):

```tsx
  const columnas = useMemo(() => {
    const i = columnasBase.findIndex((c) => c.id === 'colaborador_id')
    if (i < 0 || def.id === 'colaboradores') return columnasBase
    const ficha: ColumnaTabla<Registro> = {
      id: 'ficha', encabezado: 'Ficha', tipo: 'texto', anchoInicial: 90, sinTruncar: true, ordenable: false, filtrable: false,
      valor: () => '',
      celda: (r) => (typeof r.colaborador_id === 'string' ? (
        <Link href={rutaColaborador(r.colaborador_id)} className="boton-secundario min-h-[2rem] px-2 text-xs"
          aria-label={`Ver ficha de ${String(columnasBase[i].valor(r) ?? '')}`}>Ver</Link>
      ) : null),
    }
    return [...columnasBase.slice(0, i + 1), ficha, ...columnasBase.slice(i + 1)]
  }, [columnasBase, def.id])
```

y pasar `textoAccionFila={textoAccionFila}` al `DataTable`.

- [ ] **Step 2: `PaginaModulo`: colaboradores van a la ficha**

En `PaginaModulo.tsx`: importar `useRouter` de `next/navigation` y `rutaColaborador`; dentro del componente `const router = useRouter()`; y en la tabla:

```tsx
const alSeleccionar = def.id === 'colaboradores'
  ? (r: Registro) => router.push(rutaColaborador(r.id))
  : capturista ? setEditando : undefined
...
<TablaModulo def={def} registros={registros} alSeleccionar={alSeleccionar}
  textoAccionFila={def.id === 'colaboradores' ? 'ver ficha' : undefined} />
```

(Editar un colaborador pasa a hacerse desde el botón "Editar datos" de la ficha.)

- [ ] **Step 3: Entregas**

`TablaEntregas.tsx`: cambiar `textoAccionFila="ver entregas"` por `textoAccionFila="ver ficha"`.

`PaginaEntregas.tsx`: reemplazar por:

```tsx
'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { filtrarFilas } from '@/application/entregas-agrupar'
import { rutaColaborador } from '@/presentation/navegacion/enlaces'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { usePersistente } from '@/presentation/ui/usePersistente'
import type { ConfiguracionPagina } from './configuraciones'
import { FiltrosEntregas } from './FiltrosEntregas'
import {
  claveFiltroEntregas, filtroEntregasEfectivo, filtroEntregasValido, filtroEntregasVacio,
} from './filtro-guardado'
import { TablaEntregas } from './TablaEntregas'
import { useEntregas } from './useEntregas'

// Solo consulta: las entregas llegan de la hoja y el detalle de cada persona está en su ficha
export function PaginaEntregas({ cfg }: { cfg: ConfiguracionPagina }) {
  const router = useRouter()
  const { cargando, error, filas, items, ciudades } = useEntregas(cfg)
  const [guardado, setFiltro] = usePersistente(
    claveFiltroEntregas(cfg.catalogo), filtroEntregasVacio, filtroEntregasValido, 'sesion',
  )
  const filtro = useMemo(
    () => filtroEntregasEfectivo(guardado, ciudades.map((c) => c.valor)), [guardado, ciudades],
  )
  const visibles = filtrarFilas(filas, filtro)

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Registros" titulo={cfg.titulo}
        detalle={cargando ? undefined : `${visibles.length} de ${filas.length} colaboradores`} />
      <div className="space-y-4">
        {error && <AvisoError>{error}</AvisoError>}
        {cargando ? <Cargando /> : (
          <>
            <FiltrosEntregas filtro={filtro} ciudades={ciudades} alCambiar={setFiltro} />
            <TablaEntregas cfg={cfg} filas={visibles} items={items} ciudades={ciudades}
              alAbrir={(id) => router.push(rutaColaborador(id))} />
          </>
        )}
      </div>
    </section>
  )
}
```

Eliminar `src/presentation/entregas/PanelEntrega.tsx` (solo lo usaba `PaginaEntregas`; verificar con `grep -rn "PanelEntrega" src`).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`, `npx vitest run`
Manual: `/datos/capacitaciones` muestra la columna "Ficha" con botón "Ver" y la fila sigue abriendo el registro para editar; `/datos/colaboradores` abre la ficha al hacer clic en la fila; `/datos/entregas_uniforme` y `/datos/entregas_epp` abren la ficha.

---

### Task 8: Buscador global

**Files:**
- Modify: `src/presentation/navegacion/BuscadorGlobal.tsx`
- Delete: `src/presentation/navegacion/filtro-colaborador.ts`, `src/presentation/navegacion/filtro-colaborador.test.ts`

**Interfaces:**
- Consumes: `rutaColaborador` (Task 1).

- [ ] **Step 1: Abrir la ficha**

En `BuscadorGlobal.tsx`: cambiar `import { gruposParaBusqueda } from './enlaces'` por `import { gruposParaBusqueda, rutaColaborador } from './enlaces'`, borrar el import de `./filtro-colaborador`, y en `elegir` reemplazar las dos últimas líneas por:

```ts
    router.push(rutaColaborador(o.colaborador.id))
```

- [ ] **Step 2: Eliminar lo que quedó sin uso**

Confirmar que nada más lo importa: `grep -rn "filtro-colaborador\|prepararTablaColaboradores\|RUTA_COLABORADORES" src`. Si solo aparecen los propios archivos, borrar `filtro-colaborador.ts` y `filtro-colaborador.test.ts`.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`, `npx vitest run`
Manual: en el buscador, elegir un colaborador abre su ficha.

---

### Task 9: Verificación final

- [ ] **Step 1: Suite completa**

Run: `npx tsc --noEmit`; `npx vitest run`; `npx eslint src/application src/presentation src/app`
Expected: tipos sin salida, todas las pruebas en verde, sin errores de lint nuevos (los 4 avisos previos de `react-hooks/set-state-in-effect` ya existían).

- [ ] **Step 2: Recorrido manual con `npm run dev`**

1. Dashboard: fila de pendientes, diálogo de tarjeta, nombre en vencimientos.
2. Entregas de uniforme y EPP: clic en fila abre la ficha; la ficha muestra el historial con "Registro" y "Entrega".
3. Módulos con colaborador: columna "Ficha" y edición por fila intacta.
4. Colaboradores: clic en fila abre la ficha; "Editar datos" abre el formulario.
5. Buscador: colaborador elegido abre su ficha.
6. Rol `consulta`: sin botones de captura; rol capturista: "Nuevo" con colaborador prellenado.
7. Colaborador de baja: etiqueta "De baja" y pendientes explicados.
8. URL inexistente `/colaboradores/xxxx`: aviso "Colaborador no encontrado".

- [ ] **Step 3: No commitear**

Dejar todo sin commit para la revisión del usuario.

---

## Self-review

**Cobertura del spec:** enlace único (Task 1) · ficha con todas las secciones (Tasks 2, 4, 5) · dashboard y diálogos (6) · módulos de datos, colaboradores y entregas, con el panel de entregas reemplazado (7) · buscador (8) · edición con formularios existentes y prellenado (3, 4, 5) · permisos por rol (5) · pruebas de lógica pura (1, 2).

**Dos puntos del spec resueltos al planificar:**
- `FormularioModulo` no aceptaba el colaborador prellenado: se agrega la prop opcional `inicial` (Task 3).
- El filtro de ciudades del dashboard se guarda con `usePersistente`, así que se conserva al volver con "Volver" (verificación manual en Task 6).

**Desviaciones del spec que conviene saber:**
- **Archivos adjuntos:** `ArchivosDeColaborador` es de solo lectura (ver y descargar). Subir un archivo se hace al editar la capacitación o el accidente, desde su formulario (que ya lleva `Adjuntos`). El spec decía que se subirían "desde la ficha"; en la práctica es a través de la edición del registro desde la ficha.
- **Módulos con colaborador:** como la primera columna de las tablas ya es un botón de edición, el enlace a la ficha va en una columna "Ficha" separada y no sobre el nombre (un enlace dentro de un botón no es HTML válido).
- **Dashboard analítico:** no tiene tablas de colaboradores (solo por ciudad y por mes), así que no cambia.
- **Edición de colaboradores:** desde `/datos/colaboradores` la fila ahora abre la ficha; el formulario de edición se abre desde "Editar datos" en la ficha.

**Riesgo conocido:** al cerrar el diálogo con Escape o clic en el fondo, `Dialogo` llama directamente a `alCerrar` y no pasa por el `cancelar` del formulario; en un registro **nuevo** con archivos recién subidos, esos archivos pueden quedar sin registro. Cancelar con el botón del formulario sí los descarta.

**Consistencia de tipos:** `Pendientes`, `FichaColaborador`, `DatoGeneral`, `EtiquetasGenerales` se definen en Task 2 y se usan con los mismos nombres en Tasks 4 y 5; `rutaColaborador` (Task 1) en 5, 6, 7 y 8; `inicial`, `titulo`, `alSeleccionarFila` y `textoAccionFila` (Task 3) en 4, 5, 6 y 7.
