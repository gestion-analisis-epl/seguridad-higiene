# Reglas de dotación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evaluar uniforme y EPP contra reglas por empresa × puesto × ciudad, marcar "sin regla" a quien no tenga, y dejar listo el reinicio de catálogos y entregas.

**Architecture:** Una función pura en el dominio (`indexarReglas`) resuelve la regla de cada colaborador; el motor del dashboard la usa en lugar de las listas globales. Las reglas viven en la colección `reglas_dotacion` (solo admin escribe) y se editan en `/admin/reglas-dotacion`. Un script aparte respalda y reinicia catálogos y entregas, y solo borra con confirmación explícita.

**Tech Stack:** Next.js 14, React 18, TypeScript, Firebase (cliente y admin), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-reglas-dotacion-design.md`

## Global Constraints

- **Sin commits.** El usuario revisa y prueba antes; ningún paso hace `git commit`.
- **Máximo 4 subagentes** en total. Agrupación sugerida, en orden: A = Tareas 1-3, B = Tarea 4, C = Tareas 5-6, D = Tareas 7-9. Nunca en paralelo dos grupos que toquen los mismos archivos.
- **Comentarios de una línea**, útiles, sin párrafos.
- **Nada de valores fijos de la organización en el código:** empresas, ciudades, puestos, prendas y EPP salen de catálogos, colaboradores o reglas.
- **No ejecutar el borrado real.** El script de reinicio solo se verifica con `node --check`; el usuario lo corre contra la base real.
- Pruebas con `npx vitest run <ruta>`; tipos con `npx tsc --noEmit`.

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/domain/reglas-dotacion.ts` | Crear | Tipo de regla, normalización, resolución, combinaciones por definir, colaboradores abarcados |
| `src/domain/reglas-dotacion.test.ts` | Crear | Pruebas del dominio |
| `firestore.rules.template` | Modificar | Reglas de `reglas_dotacion` |
| `tests/rules/firestore.rules.test.ts` | Modificar | Prueba de permisos |
| `src/domain/entidades.ts` | Modificar | `Colaborador.puesto` |
| `src/application/dashboard.ts` | Modificar | Evaluar contra la regla de cada colaborador |
| `src/application/dashboard.test.ts`, `dashboard-graficas.test.ts` | Modificar | Fixtures y pruebas nuevas |
| `src/presentation/datos/useReglas.ts` | Crear | Lectura en tiempo real de las reglas |
| `src/presentation/dashboard/*` | Modificar | Medidor, tarjetas, barras, columnas y conexión |
| `src/infrastructure/firestore/reglas.ts` | Crear | Guardar y eliminar reglas |
| `src/presentation/reglas/*` | Crear | Editor, lista de definidas, lista por definir, contenedor |
| `src/app/(app)/admin/reglas-dotacion/page.tsx` | Crear | Página de administración |
| `src/presentation/navegacion/enlaces.ts` (+ test) | Modificar | Enlace en el menú |
| `src/domain/catalogos-iniciales.ts` (+ test) | Modificar | Prendas y EPP dejan de sembrarse |
| `scripts/lib/reinicio-dotacion.mjs` (+ test) | Crear | Qué se respalda y qué se borra |
| `scripts/reiniciar-dotacion.mjs`, `package.json` | Crear / Modificar | Script y atajo `reiniciar:dotacion` |

`respaldos/` ya está en `.gitignore`; no hay que agregarlo.

---

### Task 1: Dominio de reglas de dotación

**Files:**
- Create: `src/domain/reglas-dotacion.ts`
- Test: `src/domain/reglas-dotacion.test.ts`

**Interfaces:**
- Consumes: `normalizarNombre` de `./colaboradores-hoja`, `slug` de `./slug`, `aTitulo` de `./texto`.
- Produces (las Tareas 3, 4, 5 y 6 dependen de estos nombres exactos):
  - `interface ReglaDotacion { id: string; linea_negocio: string; puesto: string; puesto_etiqueta: string; ciudad: string | null; prendas: string[]; tipos_epp: string[] }`
  - `interface PerfilColaborador { linea_negocio: string; puesto?: string | null; ciudad: string }`
  - `type ColaboradorRegla = PerfilColaborador & { activo?: boolean }`
  - `interface CombinacionPendiente { linea_negocio: string; puesto: string; puesto_etiqueta: string; ciudad: string; colaboradores: number }`
  - `normalizarPuesto(t: string): string`
  - `idRegla(linea: string, puesto: string, ciudad: string | null): string`
  - `aRegla(r: Record<string, unknown>): ReglaDotacion`
  - `indexarReglas(reglas: ReglaDotacion[]): (c: PerfilColaborador) => ReglaDotacion | null`
  - `resolverRegla(reglas: ReglaDotacion[], c: PerfilColaborador): ReglaDotacion | null`
  - `combinacionesSinRegla(colaboradores: ColaboradorRegla[], reglas: ReglaDotacion[]): { pendientes: CombinacionPendiente[]; sinDatos: number }`
  - `colaboradoresAbarcados(candidata: ReglaDotacion, reglas: ReglaDotacion[], colaboradores: ColaboradorRegla[]): number`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/domain/reglas-dotacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  aRegla, colaboradoresAbarcados, combinacionesSinRegla, idRegla, normalizarPuesto, resolverRegla,
  type ReglaDotacion,
} from './reglas-dotacion'

const regla = (o: Partial<ReglaDotacion> = {}): ReglaDotacion => ({
  id: 'x', linea_negocio: 'linea-x', puesto: 'guardia de seguridad', puesto_etiqueta: 'Guardia de Seguridad',
  ciudad: null, prendas: ['botas'], tipos_epp: ['casco'], ...o,
})
const persona = (o: Record<string, unknown> = {}) =>
  ({ linea_negocio: 'linea-x', puesto: 'GUARDIA DE SEGURIDAD ', ciudad: 'leon', ...o })

describe('normalizarPuesto', () => {
  it('ignora mayúsculas, acentos y espacios repetidos', () => {
    expect(normalizarPuesto(' GUARDIA  de Seguridád ')).toBe('guardia de seguridad')
  })
})

describe('idRegla', () => {
  it('une empresa, puesto y ciudad, o "todas" sin ciudad', () => {
    expect(idRegla('linea-x', 'Guardia de Seguridad', 'leon')).toBe('linea-x__guardia-de-seguridad__leon')
    expect(idRegla('linea-x', 'Guardia de Seguridad', null)).toBe('linea-x__guardia-de-seguridad__todas')
  })
})

describe('aRegla', () => {
  it('normaliza el puesto y descarta lo que no es texto', () => {
    expect(aRegla({ id: 'a', linea_negocio: 'linea-x', puesto: 'GUARDIA ', puesto_etiqueta: '', ciudad: '', prendas: ['botas', 3], tipos_epp: null }))
      .toEqual({ id: 'a', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'GUARDIA ', ciudad: null, prendas: ['botas'], tipos_epp: [] })
  })
})

describe('resolverRegla', () => {
  const general = regla({ id: 'gen' })
  const leon = regla({ id: 'leon', ciudad: 'leon', prendas: ['chaleco'] })
  it('prefiere la regla de la ciudad sobre la general', () => {
    expect(resolverRegla([general, leon], persona())?.id).toBe('leon')
  })
  it('cae a la regla sin ciudad cuando la plaza no tiene la suya', () => {
    expect(resolverRegla([general, leon], persona({ ciudad: 'puebla' }))?.id).toBe('gen')
  })
  it('devuelve null sin regla para la empresa o el puesto', () => {
    expect(resolverRegla([general], persona({ linea_negocio: 'linea-y' }))).toBeNull()
    expect(resolverRegla([general], persona({ puesto: 'Chofer' }))).toBeNull()
  })
  it('devuelve null si el colaborador no trae puesto o empresa', () => {
    expect(resolverRegla([general], persona({ puesto: '' }))).toBeNull()
    expect(resolverRegla([general], persona({ puesto: null }))).toBeNull()
    expect(resolverRegla([general], persona({ linea_negocio: '' }))).toBeNull()
  })
  it('una regla con listas vacías sí se resuelve', () => {
    const vacia = regla({ id: 'vacia', prendas: [], tipos_epp: [] })
    expect(resolverRegla([vacia], persona())).toBe(vacia)
  })
})

describe('combinacionesSinRegla', () => {
  const reglas = [regla({ id: 'a', ciudad: 'leon' })]
  const gente = [
    persona(), persona(), persona({ ciudad: 'puebla' }),
    persona({ activo: false, ciudad: 'toluca' }),
    persona({ puesto: '' }), persona({ linea_negocio: '' }),
    persona({ linea_negocio: 'linea-y', puesto: 'Chofer' }),
  ]
  it('agrupa por empresa, puesto y ciudad, omite inactivos y cuenta los que no traen datos', () => {
    const r = combinacionesSinRegla(gente, reglas)
    expect(r.sinDatos).toBe(2)
    expect(r.pendientes).toEqual([
      { linea_negocio: 'linea-x', puesto: 'guardia de seguridad', puesto_etiqueta: 'Guardia de Seguridad', ciudad: 'puebla', colaboradores: 1 },
      { linea_negocio: 'linea-y', puesto: 'chofer', puesto_etiqueta: 'Chofer', ciudad: 'leon', colaboradores: 1 },
    ])
  })
})

describe('colaboradoresAbarcados', () => {
  const gente = [
    persona(), persona(), persona({ ciudad: 'puebla' }), persona({ ciudad: 'puebla' }), persona({ ciudad: 'puebla' }),
    persona({ ciudad: 'puebla', activo: false }),
  ]
  it('una regla general no cuenta a quien ya tiene la de su ciudad', () => {
    const existentes = [regla({ id: 'esp', ciudad: 'leon' })]
    expect(colaboradoresAbarcados(regla({ id: 'gen' }), existentes, gente)).toBe(3)
  })
  it('al editar una regla existente cuenta como si ya estuviera guardada', () => {
    const esp = regla({ id: 'esp', ciudad: 'leon' })
    expect(colaboradoresAbarcados(esp, [esp], gente)).toBe(2)
  })
})
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/domain/reglas-dotacion.test.ts`
Expected: FAIL (`Failed to resolve import "./reglas-dotacion"`).

- [ ] **Step 3: Implementar**

Crear `src/domain/reglas-dotacion.ts`:

```ts
import { normalizarNombre } from './colaboradores-hoja'
import { slug } from './slug'
import { aTitulo } from './texto'

export interface ReglaDotacion {
  id: string
  linea_negocio: string
  // Puesto normalizado: es parte de la llave
  puesto: string
  puesto_etiqueta: string
  // Vacío: aplica a todas las plazas de la empresa y el puesto
  ciudad: string | null
  prendas: string[]
  tipos_epp: string[]
}

export interface PerfilColaborador { linea_negocio: string; puesto?: string | null; ciudad: string }
export type ColaboradorRegla = PerfilColaborador & { activo?: boolean }

export interface CombinacionPendiente {
  linea_negocio: string
  puesto: string
  puesto_etiqueta: string
  ciudad: string
  colaboradores: number
}

export const normalizarPuesto = normalizarNombre

export function idRegla(linea: string, puesto: string, ciudad: string | null): string {
  return [slug(linea), slug(normalizarPuesto(puesto)), ciudad ? slug(ciudad) : 'todas'].join('__')
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

// Convierte un documento de Firestore (con su id) en una regla
export function aRegla(r: Record<string, unknown>): ReglaDotacion {
  return {
    id: texto(r.id), linea_negocio: texto(r.linea_negocio), puesto: normalizarPuesto(texto(r.puesto)),
    puesto_etiqueta: texto(r.puesto_etiqueta) || texto(r.puesto), ciudad: texto(r.ciudad) || null,
    prendas: lista(r.prendas), tipos_epp: lista(r.tipos_epp),
  }
}

const llave = (linea: string, puesto: string, ciudad: string | null) => `${linea}|${puesto}|${ciudad ?? ''}`

// Empresa + puesto + ciudad, luego empresa + puesto sin ciudad; sin ninguna, null
export function indexarReglas(reglas: ReglaDotacion[]): (c: PerfilColaborador) => ReglaDotacion | null {
  const mapa = new Map(reglas.map((r) => [llave(r.linea_negocio, normalizarPuesto(r.puesto), r.ciudad), r]))
  return (c) => {
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) return null
    return mapa.get(llave(c.linea_negocio, puesto, c.ciudad)) ?? mapa.get(llave(c.linea_negocio, puesto, null)) ?? null
  }
}

export const resolverRegla = (reglas: ReglaDotacion[], c: PerfilColaborador): ReglaDotacion | null =>
  indexarReglas(reglas)(c)

// Combinaciones de colaboradores activos sin regla; sinDatos son los que no traen puesto o empresa
export function combinacionesSinRegla(
  colaboradores: ColaboradorRegla[], reglas: ReglaDotacion[],
): { pendientes: CombinacionPendiente[]; sinDatos: number } {
  const resolver = indexarReglas(reglas)
  const grupos = new Map<string, CombinacionPendiente>()
  let sinDatos = 0
  for (const c of colaboradores) {
    if (c.activo === false || resolver(c)) continue
    const puesto = normalizarPuesto(c.puesto ?? '')
    if (!c.linea_negocio || !puesto) { sinDatos++; continue }
    const clave = llave(c.linea_negocio, puesto, c.ciudad)
    const actual = grupos.get(clave)
    if (actual) actual.colaboradores++
    else grupos.set(clave, { linea_negocio: c.linea_negocio, puesto, puesto_etiqueta: aTitulo(c.puesto ?? ''), ciudad: c.ciudad, colaboradores: 1 })
  }
  const pendientes = Array.from(grupos.values()).sort((a, b) =>
    a.linea_negocio.localeCompare(b.linea_negocio) || a.puesto.localeCompare(b.puesto) || a.ciudad.localeCompare(b.ciudad))
  return { pendientes, sinDatos }
}

// Activos que resolverían a la candidata si se guardara junto con las reglas actuales
export function colaboradoresAbarcados(
  candidata: ReglaDotacion, reglas: ReglaDotacion[], colaboradores: ColaboradorRegla[],
): number {
  const resolver = indexarReglas([...reglas.filter((r) => r.id !== candidata.id), candidata])
  return colaboradores.filter((c) => c.activo !== false && resolver(c)?.id === candidata.id).length
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx vitest run src/domain/reglas-dotacion.test.ts`
Expected: PASS (todas las pruebas de los 6 `describe`).

---

### Task 2: Reglas de Firestore para `reglas_dotacion`

**Files:**
- Modify: `firestore.rules.template` (después del bloque `articulos_hoja`, línea ~113)
- Test: `tests/rules/firestore.rules.test.ts` (dentro de `describe('entregas y artículos de la hoja'`, línea ~129)

**Interfaces:**
- Consumes: funciones `puedeLeer()` y `esAdmin()` ya definidas en la plantilla.
- Produces: la colección `reglas_dotacion` legible por quien ve el dashboard y escribible solo por administradores (la Tarea 5 la escribe desde el cliente).

- [ ] **Step 1: Escribir la prueba que falla**

En `tests/rules/firestore.rules.test.ts`, reemplazar:

```ts
    await assertFails(setDoc(doc(como('cons1'), 'articulos_hoja/gorro'), { destino: 'epp', valor: 'casco' }))
  })
})
```

por:

```ts
    await assertFails(setDoc(doc(como('cons1'), 'articulos_hoja/gorro'), { destino: 'epp', valor: 'casco' }))
  })
  it('las reglas de dotación se leen y solo un administrador las edita', async () => {
    await assertSucceeds(getDoc(doc(como('cons1'), 'reglas_dotacion/r1')))
    await assertSucceeds(setDoc(doc(como('admin1'), 'reglas_dotacion/r1'), { linea_negocio: 'linea-x', prendas: [], tipos_epp: [] }))
    await assertFails(setDoc(doc(como('capt1'), 'reglas_dotacion/r1'), { prendas: [] }))
    await assertFails(setDoc(doc(como('cons1'), 'reglas_dotacion/r1'), { prendas: [] }))
    await assertFails(deleteDoc(doc(como('capt1'), 'reglas_dotacion/r1')))
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npm run test:rules`
Expected: FAIL en "las reglas de dotación…" (la lectura de `cons1` es rechazada porque la colección no tiene regla). Requiere Java y `firebase-tools`; si no están disponibles, decirlo en el reporte en lugar de omitir el paso.

- [ ] **Step 3: Agregar la regla**

En `firestore.rules.template`, después del bloque:

```
    match /articulos_hoja/{id} {
      allow read: if puedeLeer();
      allow write: if esAdmin();
    }
```

agregar:

```

    // Uniforme y EPP obligatorios por empresa, puesto y ciudad; los edita un administrador.
    match /reglas_dotacion/{id} {
      allow read: if puedeLeer();
      allow write: if esAdmin();
    }
```

- [ ] **Step 4: Verificar que pasa**

Run: `npm run test:rules`
Expected: PASS, incluidas las pruebas anteriores.

---

### Task 3: Motor del dashboard con reglas

**Files:**
- Modify: `src/domain/entidades.ts:1-9`
- Modify: `src/application/dashboard.ts:1` y `:29-110`
- Modify: `src/application/dashboard.test.ts`
- Modify: `src/application/dashboard-graficas.test.ts:7`

**Interfaces:**
- Consumes: `indexarReglas`, `ReglaDotacion` (Tarea 1).
- Produces (las Tareas 4-6 dependen de estos tipos):
  - `Colaborador.puesto?: string | null`
  - `resumenPorCiudad(d, hoy, reglas?: ReglaDotacion[]): ResumenCiudad[]`, `resumenGlobal(d, hoy, reglas?)`, `pendientesPorColaborador(d, hoy, reglas?)`
  - `ResumenCiudad` y `ResumenGlobal`: `pctUniforme: number | null`, `pctEpp: number | null`, `sinRegla: number`
  - `Pendiente.sinRegla: boolean`
  - Se elimina `Requisitos`.

- [ ] **Step 1: Actualizar las pruebas (fallarán)**

En `src/application/dashboard.test.ts`:

1. Reemplazar `import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'` por `import type { ReglaDotacion } from '@/domain/reglas-dotacion'`.
2. Reemplazar `const hoy = new Date(2026, 8, 30)` por:

```ts
const hoy = new Date(2026, 8, 30)

const PRENDAS = ['botas', 'playera', 'camisola', 'pantalon']
const TIPOS_EPP = ['guantes', 'lentes', 'casco', 'linea-vida-doble-punto', 'arnes-cuerpo-completo', 'linea-posicionamiento']
const reglas: ReglaDotacion[] = [{
  id: 'r1', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'Guardia', ciudad: null, prendas: PRENDAS, tipos_epp: TIPOS_EPP,
}]
```

3. En `datos.colaboradores`, agregar `puesto: 'Guardia'` a los tres colaboradores:

```ts
  colaboradores: [
    { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x', puesto: 'Guardia', activo: true },
    { id: 'c2', nombre: 'Beto', ciudad: 'ciudad-a', linea_negocio: 'linea-x', puesto: 'Guardia', activo: true },
    { id: 'c3', nombre: 'Cami', ciudad: 'ciudad-b', linea_negocio: 'linea-x', puesto: 'Guardia', activo: false },
  ],
```

4. Pasar `reglas` en estas llamadas (texto exacto → reemplazo):

| Antes | Después |
|---|---|
| `resumenPorCiudad(datos, hoy).find(` | `resumenPorCiudad(datos, hoy, reglas).find(` |
| `expect(resumenPorCiudad(datos, hoy).some(` | `expect(resumenPorCiudad(datos, hoy, reglas).some(` |
| `const p = pendientesPorColaborador(datos, hoy)` | `const p = pendientesPorColaborador(datos, hoy, reglas)` |
| `pendientesPorColaborador(d, hoy).find((x) => x.colaborador.id === 'c1')` | `pendientesPorColaborador(d, hoy, reglas).find((x) => x.colaborador.id === 'c1')` |
| `const r = resumenGlobal(datos, hoy)` | `const r = resumenGlobal(datos, hoy, reglas)` |

5. Reemplazar el test `'sin activos devuelve ceros'` por:

```ts
  it('sin activos los porcentajes de dotación quedan vacíos', () => {
    expect(resumenGlobal(filtrarPorCiudades(datos, ['ciudad-b']), hoy, reglas))
      .toMatchObject({ activos: 0, pctCapacitacion: 0, pctUniforme: null, pctEpp: null, sinRegla: 0 })
  })
```

6. Reemplazar todo el bloque `describe('requisitos desde catálogos', …)` (hasta el final del archivo) por:

```ts
describe('reglas de dotación', () => {
  const otras: ReglaDotacion[] = [
    { id: 'r1', linea_negocio: 'linea-x', puesto: 'guardia', puesto_etiqueta: 'Guardia', ciudad: null, prendas: ['gorra'], tipos_epp: ['mascarilla', 'guantes'] },
  ]
  const extra: DatosOperativos = {
    ...datos,
    entregasUniforme: [{ colaborador_id: 'c1', prenda: 'gorra' }, { colaborador_id: 'c2', prenda: 'botas' }],
    entregasEpp: [{ colaborador_id: 'c1', tipo: 'mascarilla', entregado: true, vencimiento: null }],
  }
  it('pendientes evalúa contra la regla de cada colaborador', () => {
    const p = pendientesPorColaborador(extra, hoy, otras)
    expect(p.find((x) => x.colaborador.id === 'c1')?.prendasFaltantes).toEqual([])
    expect(p.find((x) => x.colaborador.id === 'c1')?.eppFaltantes).toEqual(['guantes'])
    expect(p.find((x) => x.colaborador.id === 'c2')?.prendasFaltantes).toEqual(['gorra'])
  })
  it('resumen global y por ciudad usan la regla', () => {
    expect(resumenGlobal(extra, hoy, otras).pctUniforme).toBeCloseTo(0.5)
    expect(resumenGlobal(extra, hoy, otras).pctEpp).toBe(0)
    expect(resumenPorCiudad(extra, hoy, otras)[0].pctUniforme).toBeCloseTo(0.5)
  })
  it('quien no tiene regla no cuenta en uniforme ni EPP y se cuenta aparte', () => {
    const d: DatosOperativos = {
      ...extra,
      colaboradores: [...extra.colaboradores, { id: 'c8', nombre: 'Edu', ciudad: 'ciudad-a', linea_negocio: 'linea-y', puesto: 'Chofer', activo: true }],
    }
    const g = resumenGlobal(d, hoy, otras)
    expect(g).toMatchObject({ activos: 3, sinRegla: 1 })
    expect(g.pctUniforme).toBeCloseTo(0.5)
    expect(resumenPorCiudad(d, hoy, otras)[0]).toMatchObject({ activos: 3, sinRegla: 1 })
    expect(pendientesPorColaborador(d, hoy, otras).find((x) => x.colaborador.id === 'c8'))
      .toMatchObject({ sinRegla: true, prendasFaltantes: [], eppFaltantes: [] })
  })
  it('una regla vacía cuenta como cumplido', () => {
    const vacia = [{ ...otras[0], prendas: [], tipos_epp: [] }]
    expect(resumenGlobal(datos, hoy, vacia)).toMatchObject({ pctUniforme: 1, pctEpp: 1, sinRegla: 0 })
  })
  it('sin reglas todos quedan sin regla y los porcentajes son null', () => {
    expect(resumenGlobal(datos, hoy)).toMatchObject({ sinRegla: 2, pctUniforme: null, pctEpp: null })
  })
})
```

En `src/application/dashboard-graficas.test.ts`, reemplazar:

```ts
  colaborador: { id: 'x' } as Colaborador, capacitacionPendiente: false, prendasFaltantes: [], eppFaltantes: [], ...o,
```

por:

```ts
  colaborador: { id: 'x' } as Colaborador, capacitacionPendiente: false, sinRegla: false, prendasFaltantes: [], eppFaltantes: [], ...o,
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/application/dashboard.test.ts`
Expected: FAIL (las llamadas con `reglas` aún no son soportadas y no existe `sinRegla`).

- [ ] **Step 3: Agregar `puesto` a la entidad**

En `src/domain/entidades.ts`, dentro de `Colaborador`, después de `linea_negocio: string`:

```ts
  puesto?: string | null
```

- [ ] **Step 4: Reescribir el motor**

En `src/application/dashboard.ts`:

1. Reemplazar la línea 1 `import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'` por:

```ts
import { indexarReglas, type ReglaDotacion } from '@/domain/reglas-dotacion'
```

2. Reemplazar desde el comentario `// Listas exigidas para uniforme y EPP completos…` hasta el final de `pendientesPorColaborador` (antes de `export type OrigenAlerta`) por:

```ts
// Quien no tiene regla no se evalúa en uniforme ni EPP y se cuenta aparte.
function evaluar(c: Colaborador, d: DatosOperativos, hoy: Date, regla: ReglaDotacion | null) {
  return {
    capacitacionOk: capacitacionVigente(c.id, d.capacitaciones, hoy),
    sinRegla: regla === null,
    prendasFaltantes: (regla?.prendas ?? []).filter((p) => !d.entregasUniforme.some((e) => e.colaborador_id === c.id && e.prenda === p && e.entregado !== false)),
    eppFaltantes: (regla?.tipos_epp ?? []).filter((t) => !d.entregasEpp.some((e) => e.colaborador_id === c.id && e.tipo === t && e.entregado)),
  }
}

type Evaluado = ReturnType<typeof evaluar>

function evaluarActivos(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[]) {
  const resolver = indexarReglas(reglas)
  return d.colaboradores.filter(esActivo).map((c) => ({ c, e: evaluar(c, d, hoy, resolver(c)) }))
}

const fraccion = (n: number, total: number) => (total === 0 ? null : n / total)

// Uniforme y EPP se miden solo sobre quienes tienen regla; null si nadie la tiene.
function cumplimiento(evaluados: Evaluado[]) {
  const conRegla = evaluados.filter((e) => !e.sinRegla)
  return {
    pctUniforme: fraccion(conRegla.filter((e) => e.prendasFaltantes.length === 0).length, conRegla.length),
    pctEpp: fraccion(conRegla.filter((e) => e.eppFaltantes.length === 0).length, conRegla.length),
    sinRegla: evaluados.length - conRegla.length,
  }
}

export interface ResumenCiudad {
  ciudad: string
  activos: number
  pctCapacitacion: number
  pctUniforme: number | null
  pctEpp: number | null
  sinRegla: number
}

export function resumenPorCiudad(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): ResumenCiudad[] {
  const evaluados = evaluarActivos(d, hoy, reglas)
  const ciudades = Array.from(new Set(evaluados.map(({ c }) => c.ciudad)))
  return ciudades.sort().map((ciudad) => {
    const deCiudad = evaluados.filter(({ c }) => c.ciudad === ciudad).map(({ e }) => e)
    return {
      ciudad,
      activos: deCiudad.length,
      pctCapacitacion: deCiudad.filter((e) => e.capacitacionOk).length / deCiudad.length,
      ...cumplimiento(deCiudad),
    }
  })
}

export interface ResumenGlobal {
  activos: number
  pctCapacitacion: number
  pctUniforme: number | null
  pctEpp: number | null
  sinRegla: number
  vencidos: number
  porVencer: number
}

// Porcentajes como suma de numeradores sobre suma de activos; d ya viene filtrado por ciudad.
export function resumenGlobal(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): ResumenGlobal {
  const evaluados = evaluarActivos(d, hoy, reglas).map(({ e }) => e)
  const alertas = alertasVencimiento(d, hoy)
  return {
    activos: evaluados.length,
    pctCapacitacion: evaluados.length === 0 ? 0 : evaluados.filter((e) => e.capacitacionOk).length / evaluados.length,
    ...cumplimiento(evaluados),
    vencidos: alertas.filter((a) => a.estado === 'vencido').length,
    porVencer: alertas.filter((a) => a.estado === 'por_vencer').length,
  }
}

export interface Pendiente {
  colaborador: Colaborador
  capacitacionPendiente: boolean
  sinRegla: boolean
  prendasFaltantes: string[]
  eppFaltantes: string[]
}

export function pendientesPorColaborador(d: DatosOperativos, hoy: Date, reglas: ReglaDotacion[] = []): Pendiente[] {
  return evaluarActivos(d, hoy, reglas)
    .map(({ c, e }) => ({
      colaborador: c,
      capacitacionPendiente: !e.capacitacionOk,
      sinRegla: e.sinRegla,
      prendasFaltantes: [...e.prendasFaltantes],
      eppFaltantes: [...e.eppFaltantes],
    }))
    .filter((p) => p.capacitacionPendiente || p.sinRegla || p.prendasFaltantes.length > 0 || p.eppFaltantes.length > 0)
}

```

- [ ] **Step 5: Verificar que pasan**

Run: `npx vitest run src/application`
Expected: PASS (incluido `dashboard-graficas.test.ts`). `npx tsc --noEmit` todavía reportará errores en `src/presentation/dashboard/*` y `columnas-operativo.test.ts`: es esperado y los corrige la Tarea 4.

---

### Task 4: Dashboard: lectura de reglas y presentación de "sin regla"

**Files:**
- Create: `src/presentation/datos/useReglas.ts`
- Delete: `src/presentation/dashboard/useRequisitos.ts`
- Modify: `src/presentation/dashboard/graficas/Medidor.tsx`
- Modify: `src/presentation/dashboard/graficas/BarrasCiudad.tsx`
- Modify: `src/presentation/dashboard/TarjetasResumen.tsx`
- Modify: `src/presentation/dashboard/columnas-operativo.ts` (+ `columnas-operativo.test.ts`)
- Modify: `src/presentation/dashboard/DashboardOperativo.tsx`

**Interfaces:**
- Consumes: `aRegla`, `ReglaDotacion` (Tarea 1); `ResumenCiudad`, `ResumenGlobal`, `Pendiente` (Tarea 3).
- Produces: `useReglas(): { reglas: ReglaDotacion[]; cargando: boolean; error: string | null }` (la Tarea 5 lo reutiliza).

- [ ] **Step 1: Pruebas de columnas (fallarán)**

En `src/presentation/dashboard/columnas-operativo.test.ts`:

1. En el literal `Pendiente`, cambiar `capacitacionPendiente: false, prendasFaltantes: [], eppFaltantes: ['casco', 'guantes'],` por `capacitacionPendiente: false, sinRegla: false, prendasFaltantes: [], eppFaltantes: ['casco', 'guantes'],`.
2. En el literal `ResumenCiudad`, cambiar `pctEpp: 0 }` por `pctEpp: 0, sinRegla: 0 }`.
3. Antes del `})` final del `describe`, agregar:

```ts
  it('por ciudad: sin reglas el porcentaje queda vacío y se cuentan los colaboradores sin regla', () => {
    const r: ResumenCiudad = { ciudad: 'ciudad-a', activos: 3, pctCapacitacion: 1, pctUniforme: null, pctEpp: null, sinRegla: 3 }
    const col = (id: string) => columnasPorCiudad(etiqueta).find((c) => c.id === id)!
    expect(col('uniforme').valor(r)).toBeNull()
    expect(col('uniforme').celda?.(r)).toBe('—')
    expect(col('sinregla').valor(r)).toBe(3)
  })
  it('pendientes: indica si el colaborador tiene regla', () => {
    const base: Pendiente = {
      colaborador: { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-a', linea_negocio: 'linea-x' },
      capacitacionPendiente: false, sinRegla: true, prendasFaltantes: [], eppFaltantes: [],
    }
    const regla = columnasPendientes(etiqueta).find((c) => c.id === 'regla')!
    expect(regla.valor(base)).toBe('Sin regla')
    expect(regla.valor({ ...base, sinRegla: false })).toBe('Definida')
  })
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/presentation/dashboard/columnas-operativo.test.ts`
Expected: FAIL (no existen las columnas `sinregla` ni `regla`).

- [ ] **Step 3: Columnas**

En `src/presentation/dashboard/columnas-operativo.ts`:

1. En `columnasPendientes`, después de la columna `cuadrilla` agregar:

```ts
    { id: 'regla', encabezado: 'Regla', tipo: 'categoria', valor: (p) => (p.sinRegla ? 'Sin regla' : 'Definida'), anchoInicial: 130 },
```

2. Reemplazar la función `pct` y las columnas de `columnasPorCiudad` por:

```ts
export function columnasPorCiudad(etiqueta: Etiqueta): ColumnaTabla<ResumenCiudad>[] {
  const pct = (id: string, encabezado: string, f: (r: ResumenCiudad) => number | null): ColumnaTabla<ResumenCiudad> => ({
    id, encabezado, tipo: 'numero', alinear: 'derecha', anchoInicial: 140,
    valor: (r) => { const x = f(r); return x === null ? null : porcentaje(x) },
    celda: (r) => { const x = f(r); return x === null ? '—' : `${porcentaje(x)}%` },
  })
  return [
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (r) => etiqueta(r.ciudad) },
    { id: 'activos', encabezado: 'Activos', tipo: 'numero', valor: (r) => r.activos, alinear: 'derecha', anchoInicial: 110 },
    pct('cap', '% capacitación', (r) => r.pctCapacitacion),
    pct('uniforme', '% uniforme', (r) => r.pctUniforme),
    pct('epp', '% EPP', (r) => r.pctEpp),
    { id: 'sinregla', encabezado: 'Sin regla', tipo: 'numero', valor: (r) => r.sinRegla, alinear: 'derecha', anchoInicial: 110 },
  ]
}
```

- [ ] **Step 4: Hook de reglas**

Crear `src/presentation/datos/useReglas.ts`:

```ts
'use client'

import { useMemo } from 'react'
import { aRegla } from '@/domain/reglas-dotacion'
import { useColeccion } from './useColeccion'

export function useReglas() {
  const { registros, cargando, error } = useColeccion('reglas_dotacion')
  const reglas = useMemo(() => registros.map((r) => aRegla(r)), [registros])
  return { reglas, cargando, error }
}
```

- [ ] **Step 5: Medidor con estado vacío**

En `src/presentation/dashboard/graficas/Medidor.tsx`, reemplazar la firma y agregar el caso `null` al inicio de la función:

```tsx
export function Medidor({ rotulo, fraccion }: { rotulo: string; fraccion: number | null }) {
  if (fraccion === null) {
    return (
      <figure className="kpi tarjeta flex min-w-0 flex-col items-center p-4" aria-label={`${rotulo}: sin datos, ninguna regla definida`}>
        <svg viewBox="0 0 100 100" className="h-28 w-28" role="img" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIO} fill="none" stroke="var(--borde)" strokeWidth="10" />
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--texto)">—</text>
        </svg>
        <figcaption className="mt-2 text-center">
          <span className="rotulo block">{rotulo}</span>
          <span className="text-xs font-medium text-texto-suave">Sin reglas definidas</span>
        </figcaption>
      </figure>
    )
  }
  const valor = Math.min(Math.max(fraccion, 0), 1)
```

(El resto de la función queda igual; borrar la línea original `const valor = Math.min(Math.max(fraccion, 0), 1)` que ahora está duplicada.)

- [ ] **Step 6: Barras por ciudad**

En `src/presentation/dashboard/graficas/BarrasCiudad.tsx`:

1. Reemplazar la línea `const ordenadas = …` por:

```tsx
  const orden = (f: ResumenCiudad) => f[indicador] ?? -1
  const ordenadas = [...filas].sort((a, b) => orden(a) - orden(b) || a.ciudad.localeCompare(b.ciudad))
```

2. Reemplazar el cuerpo del `ordenadas.map` por:

```tsx
          {ordenadas.map((f) => {
            const valor = f[indicador]
            const fuera = indicador !== 'pctCapacitacion' && f.sinRegla > 0 ? ` · ${f.sinRegla} sin regla` : ''
            return (
              <li key={f.ciudad} title={`${etiqueta(f.ciudad)}${fuera}`} className="grid grid-cols-[minmax(5rem,9rem)_1fr_3rem] items-center gap-2 text-sm">
                <span className="truncate">{etiqueta(f.ciudad)}</span>
                <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-3 w-full" role="img"
                  aria-label={valor === null ? `${etiqueta(f.ciudad)}: sin reglas` : `${etiqueta(f.ciudad)}: ${porcentaje(valor)}%${fuera}`}>
                  <rect width="100" height="8" fill="var(--borde)" />
                  {valor !== null && <rect width={valor * 100} height="8" fill={COLOR_SEMAFORO[semaforo(valor)]} />}
                </svg>
                <span className="text-right tabular-nums">{valor === null ? '—' : `${porcentaje(valor)}%`}</span>
              </li>
            )
          })}
```

- [ ] **Step 7: Tarjeta "Sin regla"**

En `src/presentation/dashboard/TarjetasResumen.tsx`: agregar `import Link from 'next/link'` al inicio y reemplazar el bloque `<dl><Tarjeta rotulo="Colaboradores activos" … /></dl>` por:

```tsx
        <dl>
          <Tarjeta rotulo="Colaboradores activos" valor={String(resumen.activos)} />
          {resumen.sinRegla > 0 && <Tarjeta rotulo="Sin regla de dotación" valor={String(resumen.sinRegla)} />}
        </dl>
        {resumen.sinRegla > 0 && (
          <Link href="/admin/reglas-dotacion" className="text-sm underline">Definir reglas de dotación</Link>
        )}
```

- [ ] **Step 8: Conectar el dashboard**

En `src/presentation/dashboard/DashboardOperativo.tsx`:

1. Reemplazar `import { useRequisitos } from './useRequisitos'` por `import { useReglas } from '@/presentation/datos/useReglas'` (junto a los otros imports de `@/presentation`).
2. Reemplazar `const requisitos = useRequisitos()` por:

```tsx
  const { reglas, cargando: cargandoReglas, error: errorReglas } = useReglas()
```

3. En los tres `useMemo` de `resumen`, `porCiudad` y `pendientes`, cambiar `requisitos` por `reglas` (en la llamada y en el arreglo de dependencias).
4. Reemplazar:

```tsx
  if (cargando) return <Cargando />
  if (error) return <AvisoError>{error}</AvisoError>
```

por:

```tsx
  if (cargando || cargandoReglas) return <Cargando />
  const fallo = error ?? errorReglas
  if (fallo) return <AvisoError>{fallo}</AvisoError>
```

5. Borrar `src/presentation/dashboard/useRequisitos.ts` con `rm src/presentation/dashboard/useRequisitos.ts`.

- [ ] **Step 9: Verificar**

Run: `npx vitest run src/presentation src/application` y `npx tsc --noEmit`
Expected: PASS, sin errores de tipos.

---

### Task 5: Pantalla de reglas: lista, editor y guardado

**Files:**
- Create: `src/infrastructure/firestore/reglas.ts`
- Create: `src/presentation/reglas/EditorRegla.tsx`
- Create: `src/presentation/reglas/ListaReglas.tsx`
- Create: `src/presentation/reglas/ReglasDotacion.tsx`
- Create: `src/app/(app)/admin/reglas-dotacion/page.tsx`
- Modify: `src/presentation/navegacion/enlaces.ts:32` (+ `enlaces.test.ts`)

**Interfaces:**
- Consumes: Tarea 1 (todo el dominio), `useReglas` (Tarea 4), `guardarCatalogo` de `@/infrastructure/firestore/catalogos`, `resolverEntradaCatalogo` de `@/domain/colaboradores-hoja`.
- Produces (la Tarea 6 lo extiende):
  - `DatosRegla = { linea_negocio: string; puesto_etiqueta: string; ciudad: string | null; prendas: string[]; tipos_epp: string[] }`
  - `guardarRegla(r: DatosRegla, uid: string): Promise<string>` y `eliminarRegla(id: string): Promise<void>`
  - `BorradorRegla` (exportado de `EditorRegla.tsx`): `{ id: string | null; linea_negocio; puesto_etiqueta; ciudad: string | null; prendas: string[]; tipos_epp: string[]; lote?: { linea_negocio: string; puesto_etiqueta: string }[] }`

La interfaz no tiene pruebas automáticas en este repo (Vitest corre en entorno `node`); se verifica con `tsc`, `lint` y la revisión manual de la Tarea 9.

- [ ] **Step 1: Enlace en el menú (prueba primero)**

En `src/presentation/navegacion/enlaces.test.ts`, cambiar:

```ts
    expect(h).toEqual(expect.arrayContaining(['/admin/usuarios', '/admin/catalogos', '/admin/configuracion']))
```

por:

```ts
    expect(h).toEqual(expect.arrayContaining(['/admin/usuarios', '/admin/catalogos', '/admin/reglas-dotacion', '/admin/configuracion']))
```

Run: `npx vitest run src/presentation/navegacion/enlaces.test.ts` → Expected: FAIL.

En `src/presentation/navegacion/enlaces.ts`, después de la línea de `/admin/articulos-hoja` agregar:

```ts
        { href: '/admin/reglas-dotacion', titulo: 'Reglas de dotación', icono: 'catalogos' },
```

Run de nuevo → Expected: PASS.

- [ ] **Step 2: Persistencia**

Crear `src/infrastructure/firestore/reglas.ts`:

```ts
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { idRegla, normalizarPuesto, type ReglaDotacion } from '@/domain/reglas-dotacion'
import { aTitulo } from '@/domain/texto'
import { conAuditoria } from './conversion'

export type DatosRegla = Pick<ReglaDotacion, 'linea_negocio' | 'puesto_etiqueta' | 'ciudad' | 'prendas' | 'tipos_epp'>

// El identificador sale de empresa + puesto + ciudad: guardar de nuevo actualiza, no duplica
export async function guardarRegla(r: DatosRegla, uid: string): Promise<string> {
  const puesto = normalizarPuesto(r.puesto_etiqueta)
  const id = idRegla(r.linea_negocio, puesto, r.ciudad)
  const ref = doc(db, 'reglas_dotacion', id)
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria({
    linea_negocio: r.linea_negocio, puesto, puesto_etiqueta: aTitulo(r.puesto_etiqueta), ciudad: r.ciudad,
    prendas: r.prendas, tipos_epp: r.tipos_epp,
  }, uid, !existe), { merge: true })
  return id
}

export async function eliminarRegla(id: string): Promise<void> {
  await deleteDoc(doc(db, 'reglas_dotacion', id))
}
```

- [ ] **Step 3: Editor**

Crear `src/presentation/reglas/EditorRegla.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import {
  colaboradoresAbarcados, idRegla, normalizarPuesto, type ColaboradorRegla, type ReglaDotacion,
} from '@/domain/reglas-dotacion'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

export interface BorradorRegla {
  id: string | null
  linea_negocio: string
  puesto_etiqueta: string
  ciudad: string | null
  prendas: string[]
  tipos_epp: string[]
  // Varias combinaciones empresa x puesto a la vez; siempre para todas las plazas
  lote?: { linea_negocio: string; puesto_etiqueta: string }[]
}

interface CasillasProps {
  titulo: string
  opciones: Opcion[]
  marcadas: string[]
  alCambiar: (valores: string[]) => void
  alAgregar: (texto: string) => Promise<string | null>
}

function Casillas({ titulo, opciones, marcadas, alCambiar, alAgregar }: CasillasProps) {
  const [nuevo, setNuevo] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)

  async function agregar() {
    setFallo(null)
    try {
      const valor = await alAgregar(nuevo)
      if (valor) {
        if (!marcadas.includes(valor)) alCambiar([...marcadas, valor])
        setNuevo('')
      }
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo agregar al catálogo')
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="etiqueta">{titulo}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {opciones.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="casilla" checked={marcadas.includes(o.valor)}
              onChange={(e) => alCambiar(e.target.checked ? [...marcadas, o.valor] : marcadas.filter((v) => v !== o.valor))} />
            {o.etiqueta}
          </label>
        ))}
        {opciones.length === 0 && <p className="text-sm text-texto-suave">El catálogo está vacío; agrega la primera entrada abajo.</p>}
      </div>
      <div className="flex gap-2">
        <input aria-label={`Nueva entrada de ${titulo}`} className="control" value={nuevo}
          onChange={(e) => setNuevo(e.target.value)} placeholder="Agregar al catálogo" />
        <button type="button" className="boton-secundario" disabled={!nuevo.trim()} onClick={() => void agregar()}>Agregar</button>
      </div>
      {fallo && <AvisoError>{fallo}</AvisoError>}
    </fieldset>
  )
}

interface Props {
  inicial: BorradorRegla
  reglas: ReglaDotacion[]
  colaboradores: ColaboradorRegla[]
  puestos: string[]
  lineas: Opcion[]
  ciudades: Opcion[]
  prendas: Opcion[]
  tiposEpp: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alGuardar: (borrador: BorradorRegla) => Promise<void>
  alCancelar: () => void
  alAgregar: (catalogo: 'prendas' | 'tipos_epp', texto: string) => Promise<string | null>
}

export function EditorRegla({
  inicial, reglas, colaboradores, puestos, lineas, ciudades, prendas, tiposEpp, etiquetaDe, alGuardar, alCancelar, alAgregar,
}: Props) {
  const [b, setB] = useState(inicial)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editando = inicial.id !== null
  const lote = b.lote !== undefined
  const completa = lote || (b.linea_negocio !== '' && normalizarPuesto(b.puesto_etiqueta) !== '')

  const abarcados = useMemo(() => {
    if (lote || !completa) return null
    const candidata: ReglaDotacion = {
      id: idRegla(b.linea_negocio, b.puesto_etiqueta, b.ciudad), linea_negocio: b.linea_negocio,
      puesto: normalizarPuesto(b.puesto_etiqueta), puesto_etiqueta: b.puesto_etiqueta, ciudad: b.ciudad,
      prendas: b.prendas, tipos_epp: b.tipos_epp,
    }
    return colaboradoresAbarcados(candidata, reglas, colaboradores)
  }, [b, lote, completa, reglas, colaboradores])

  async function guardar() {
    setOcupado(true)
    setError(null)
    try { await alGuardar(b) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setOcupado(false) }
  }

  const descripcion = (r: ReglaDotacion) =>
    `${etiquetaDe(lineas, r.linea_negocio)} · ${r.puesto_etiqueta} · ${r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las plazas'}`

  return (
    <section className="tarjeta space-y-4 p-4" aria-label="Editor de regla">
      <h2 className="text-base">{editando ? 'Editar regla' : lote ? `Definir ${b.lote!.length} combinaciones` : 'Nueva regla'}</h2>
      {lote ? (
        <p className="text-sm text-texto-suave">
          Se guardará una regla por cada empresa y puesto seleccionados, para todas las plazas: {b.lote!.map((d) => `${etiquetaDe(lineas, d.linea_negocio)} · ${d.puesto_etiqueta}`).join('; ')}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label id="regla-empresa-et" htmlFor="regla-empresa" className="etiqueta">Empresa</label>
            {editando ? <p className="text-sm">{etiquetaDe(lineas, b.linea_negocio)}</p> : (
              <SelectBuscable id="regla-empresa" etiqueta="Empresa" etiquetaId="regla-empresa-et" opciones={lineas}
                valor={b.linea_negocio} textoVacio="Selecciona" alCambiar={(v) => setB({ ...b, linea_negocio: v })} />
            )}
          </div>
          <div>
            <label htmlFor="regla-puesto" className="etiqueta">Puesto</label>
            {editando ? <p className="text-sm">{b.puesto_etiqueta}</p> : (
              <>
                <input id="regla-puesto" list="puestos-dotacion" className="control" value={b.puesto_etiqueta}
                  onChange={(e) => setB({ ...b, puesto_etiqueta: e.target.value })} />
                <datalist id="puestos-dotacion">{puestos.map((p) => <option key={p} value={p} />)}</datalist>
              </>
            )}
          </div>
          <div>
            <label htmlFor="regla-ciudad" className="etiqueta">Ciudad</label>
            {editando ? <p className="text-sm">{b.ciudad ? etiquetaDe(ciudades, b.ciudad) : 'Todas las plazas'}</p> : (
              <select id="regla-ciudad" className="control" value={b.ciudad ?? ''}
                onChange={(e) => setB({ ...b, ciudad: e.target.value || null })}>
                <option value="">Todas las plazas</option>
                {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
              </select>
            )}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="regla-copiar" className="etiqueta">Copiar artículos de otra regla</label>
        <select id="regla-copiar" className="control" value=""
          onChange={(e) => {
            const r = reglas.find((x) => x.id === e.target.value)
            if (r) setB({ ...b, prendas: r.prendas, tipos_epp: r.tipos_epp })
          }}>
          <option value="">Copiar de…</option>
          {reglas.map((r) => <option key={r.id} value={r.id}>{descripcion(r)}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Casillas titulo="Uniforme obligatorio" opciones={prendas} marcadas={b.prendas}
          alCambiar={(prendasNuevas) => setB({ ...b, prendas: prendasNuevas })} alAgregar={(t) => alAgregar('prendas', t)} />
        <Casillas titulo="EPP obligatorio" opciones={tiposEpp} marcadas={b.tipos_epp}
          alCambiar={(eppNuevo) => setB({ ...b, tipos_epp: eppNuevo })} alAgregar={(t) => alAgregar('tipos_epp', t)} />
      </div>
      {abarcados !== null && (
        <p role="status" className="text-sm text-texto-suave">Esta regla aplicaría a {abarcados} colaboradores activos.</p>
      )}
      {error && <AvisoError>{error}</AvisoError>}
      <div className="flex gap-2">
        <button type="button" className="boton-primario" disabled={!completa || ocupado} onClick={() => void guardar()}>
          {ocupado ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="boton-secundario" disabled={ocupado} onClick={alCancelar}>Cancelar</button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Lista de reglas definidas**

Crear `src/presentation/reglas/ListaReglas.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import { normalizarPuesto, type ReglaDotacion } from '@/domain/reglas-dotacion'
import { AvisoError } from '@/presentation/ui/Estado'

interface Props {
  reglas: ReglaDotacion[]
  lineas: Opcion[]
  ciudades: Opcion[]
  prendas: Opcion[]
  tiposEpp: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alEditar: (regla: ReglaDotacion) => void
  alEliminar: (id: string) => Promise<void>
}

export function ListaReglas({ reglas, lineas, ciudades, prendas, tiposEpp, etiquetaDe, alEditar, alEliminar }: Props) {
  const [texto, setTexto] = useState('')
  const [linea, setLinea] = useState('')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibles = useMemo(() => {
    const q = normalizarPuesto(texto)
    return reglas
      .filter((r) => (!linea || r.linea_negocio === linea) && (!q || r.puesto.includes(q)))
      .sort((a, b) => a.linea_negocio.localeCompare(b.linea_negocio) || a.puesto.localeCompare(b.puesto)
        || (a.ciudad ?? '').localeCompare(b.ciudad ?? ''))
  }, [reglas, texto, linea])

  async function eliminar(id: string) {
    setError(null)
    try { await alEliminar(id); setConfirmando(null) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar') }
  }

  const articulos = (valores: string[], opciones: Opcion[]) => valores.map((v) => etiquetaDe(opciones, v)).join(', ') || 'Ninguno'

  return (
    <section>
      <h2 className="mb-2 text-base">Definidas ({reglas.length})</h2>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input type="search" aria-label="Buscar puesto" placeholder="Buscar puesto" className="control max-w-xs"
          value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select aria-label="Filtrar por empresa" className="control max-w-xs" value={linea} onChange={(e) => setLinea(e.target.value)}>
          <option value="">Todas las empresas</option>
          {lineas.map((l) => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)}
        </select>
      </div>
      {error && <div className="mb-3"><AvisoError>{error}</AvisoError></div>}
      <ul className="tarjeta divide-y divide-borde">
        {visibles.length === 0 && <li className="p-4 text-sm text-texto-suave">No hay reglas para mostrar.</li>}
        {visibles.map((r) => (
          <li key={r.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="font-medium">{r.puesto_etiqueta}</p>
              <p className="text-xs text-texto-suave">
                {etiquetaDe(lineas, r.linea_negocio)} · {r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las plazas'}
              </p>
              <p className="mt-1 text-sm">Uniforme: {articulos(r.prendas, prendas)}</p>
              <p className="text-sm">EPP: {articulos(r.tipos_epp, tiposEpp)}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="boton-secundario" onClick={() => alEditar(r)}>Editar</button>
              {confirmando === r.id ? (
                <button type="button" className="boton-secundario border-error text-error" onClick={() => void eliminar(r.id)}>Confirmar</button>
              ) : (
                <button type="button" className="boton-secundario text-error" onClick={() => setConfirmando(r.id)}>Eliminar</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 5: Contenedor y página**

Crear `src/presentation/reglas/ReglasDotacion.tsx` (la lista "Por definir" se agrega en la Tarea 6):

```tsx
'use client'

import { useMemo, useState } from 'react'
import { resolverEntradaCatalogo } from '@/domain/colaboradores-hoja'
import type { Opcion } from '@/domain/modulos'
import { normalizarPuesto, type ColaboradorRegla, type ReglaDotacion } from '@/domain/reglas-dotacion'
import { aTitulo } from '@/domain/texto'
import { guardarCatalogo } from '@/infrastructure/firestore/catalogos'
import { eliminarRegla, guardarRegla } from '@/infrastructure/firestore/reglas'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useReglas } from '@/presentation/datos/useReglas'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { EditorRegla, type BorradorRegla } from './EditorRegla'
import { ListaReglas } from './ListaReglas'

const etiquetaDe = (opciones: Opcion[], valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor
const VACIO: BorradorRegla = { id: null, linea_negocio: '', puesto_etiqueta: '', ciudad: null, prendas: [], tipos_epp: [] }

export function ReglasDotacion() {
  const { uid } = useSesion()
  const { reglas, cargando, error } = useReglas()
  const personas = useColeccion('colaboradores')
  const lineas = useCatalogo('lineas_negocio')
  const ciudades = useCatalogo('ciudades')
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const [editor, setEditor] = useState<BorradorRegla | null>(null)

  const colaboradores = personas.registros as unknown as ColaboradorRegla[]
  const puestos = useMemo(() => {
    const porClave = new Map<string, string>()
    for (const c of colaboradores) {
      const clave = normalizarPuesto(c.puesto ?? '')
      if (clave && !porClave.has(clave)) porClave.set(clave, aTitulo(c.puesto ?? ''))
    }
    return Array.from(porClave.values()).sort((a, b) => a.localeCompare(b, 'es'))
  }, [colaboradores])

  async function agregarEntrada(catalogo: 'prendas' | 'tipos_epp', texto: string): Promise<string | null> {
    const items = catalogo === 'prendas' ? prendas : tiposEpp
    const entrada = resolverEntradaCatalogo(items, texto)
    if (!entrada) return null
    if (entrada.nueva) await guardarCatalogo(catalogo, [...items, { valor: entrada.valor, etiqueta: entrada.etiqueta }], uid ?? '')
    return entrada.valor
  }

  async function guardar(b: BorradorRegla) {
    const destinos = b.lote ?? [{ linea_negocio: b.linea_negocio, puesto_etiqueta: b.puesto_etiqueta }]
    for (const d of destinos) {
      await guardarRegla({ ...d, ciudad: b.lote ? null : b.ciudad, prendas: b.prendas, tipos_epp: b.tipos_epp }, uid ?? '')
    }
    setEditor(null)
  }

  const editar = (r: ReglaDotacion) => setEditor({
    id: r.id, linea_negocio: r.linea_negocio, puesto_etiqueta: r.puesto_etiqueta, ciudad: r.ciudad,
    prendas: r.prendas, tipos_epp: r.tipos_epp,
  })

  if (cargando || personas.cargando) return <Cargando />
  const fallo = error ?? personas.error

  return (
    <div className="space-y-6">
      {fallo && <AvisoError>{fallo}</AvisoError>}
      {editor ? (
        <EditorRegla key={`${editor.id ?? 'nueva'}|${editor.linea_negocio}|${editor.puesto_etiqueta}|${editor.lote?.length ?? 0}`}
          inicial={editor} reglas={reglas} colaboradores={colaboradores} puestos={puestos} lineas={lineas} ciudades={ciudades}
          prendas={prendas} tiposEpp={tiposEpp} etiquetaDe={etiquetaDe} alGuardar={guardar}
          alCancelar={() => setEditor(null)} alAgregar={agregarEntrada} />
      ) : (
        <button type="button" className="boton-primario" onClick={() => setEditor(VACIO)}>Nueva regla</button>
      )}
      <ListaReglas reglas={reglas} lineas={lineas} ciudades={ciudades} prendas={prendas} tiposEpp={tiposEpp}
        etiquetaDe={etiquetaDe} alEditar={editar} alEliminar={eliminarRegla} />
    </div>
  )
}
```

Crear `src/app/(app)/admin/reglas-dotacion/page.tsx`:

```tsx
'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { ReglasDotacion } from '@/presentation/reglas/ReglasDotacion'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'

export default function ReglasDotacionPage() {
  return (
    <RequireAcceso accion="administrar">
      <section className="aparecer">
        <EncabezadoPagina rotulo="Administración" titulo="Reglas de dotación"
          detalle="Uniforme y EPP obligatorios por empresa, puesto y ciudad." />
        <ReglasDotacion />
      </section>
    </RequireAcceso>
  )
}
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit` y `npm run lint`
Expected: sin errores. Si `useSesion` o `useColeccion` devuelven tipos distintos de los usados (p. ej. `error` no es `string | null`), ajustar solo el tipo en el componente afectado.

---

### Task 6: Pantalla de reglas: lista "Por definir" y captura por lote

**Files:**
- Create: `src/presentation/reglas/ListaPorDefinir.tsx`
- Modify: `src/presentation/reglas/ReglasDotacion.tsx`

**Interfaces:**
- Consumes: `combinacionesSinRegla`, `CombinacionPendiente` (Tarea 1), `BorradorRegla` con `lote` (Tarea 5).
- Produces: la pantalla completa. Decisión de diseño: **"Definir" precarga empresa y puesto con ciudad = "Todas las plazas"** (no la ciudad de la fila) y el lote guarda **una regla por empresa × puesto para todas las plazas**; así una sola regla cubre varias filas de la lista y no explota la matriz. Las excepciones por ciudad se crean después con "Nueva regla".

- [ ] **Step 1: Lista por definir**

Crear `src/presentation/reglas/ListaPorDefinir.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Opcion } from '@/domain/modulos'
import type { CombinacionPendiente } from '@/domain/reglas-dotacion'

const clave = (p: CombinacionPendiente) => `${p.linea_negocio}|${p.puesto}|${p.ciudad}`

interface Props {
  pendientes: CombinacionPendiente[]
  lineas: Opcion[]
  ciudades: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
  alDefinir: (p: CombinacionPendiente) => void
  alDefinirVarias: (ps: CombinacionPendiente[]) => void
}

export function ListaPorDefinir({ pendientes, lineas, ciudades, etiquetaDe, alDefinir, alDefinirVarias }: Props) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const elegidas = pendientes.filter((p) => marcadas.has(clave(p)))

  function alternar(p: CombinacionPendiente) {
    const siguiente = new Set(marcadas)
    if (siguiente.has(clave(p))) siguiente.delete(clave(p))
    else siguiente.add(clave(p))
    setMarcadas(siguiente)
  }

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="text-base">Por definir ({pendientes.length})</h2>
        <button type="button" className="boton-secundario" disabled={elegidas.length === 0}
          onClick={() => { alDefinirVarias(elegidas); setMarcadas(new Set()) }}>
          Definir seleccionadas ({elegidas.length})
        </button>
      </div>
      <ul className="tarjeta divide-y divide-borde">
        {pendientes.length === 0 && <li className="p-4 text-sm text-texto-suave">Todos los colaboradores activos tienen regla.</li>}
        {pendientes.map((p) => (
          <li key={clave(p)} className="grid gap-2 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <input type="checkbox" className="casilla" aria-label={`Seleccionar ${p.puesto_etiqueta} en ${etiquetaDe(ciudades, p.ciudad)}`}
              checked={marcadas.has(clave(p))} onChange={() => alternar(p)} />
            <div className="min-w-0">
              <p className="font-medium">{p.puesto_etiqueta}</p>
              <p className="text-xs text-texto-suave">
                {etiquetaDe(lineas, p.linea_negocio)} · {etiquetaDe(ciudades, p.ciudad)} · {p.colaboradores} colaboradores
              </p>
            </div>
            <button type="button" className="boton-primario" onClick={() => alDefinir(p)}>Definir</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Conectar en el contenedor**

En `src/presentation/reglas/ReglasDotacion.tsx`:

1. Cambiar el import de dominio por:

```tsx
import {
  combinacionesSinRegla, normalizarPuesto, type ColaboradorRegla, type CombinacionPendiente, type ReglaDotacion,
} from '@/domain/reglas-dotacion'
```

2. Agregar `import { ListaPorDefinir } from './ListaPorDefinir'` junto a los imports de `./`.
3. Después del `useMemo` de `puestos`, agregar:

```tsx
  const { pendientes, sinDatos } = useMemo(() => combinacionesSinRegla(colaboradores, reglas), [colaboradores, reglas])

  const definir = (p: CombinacionPendiente) => setEditor({ ...VACIO, linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta })
  function definirVarias(ps: CombinacionPendiente[]) {
    const unicos = new Map(ps.map((p) => [`${p.linea_negocio}|${p.puesto}`, { linea_negocio: p.linea_negocio, puesto_etiqueta: p.puesto_etiqueta }]))
    setEditor({ ...VACIO, lote: Array.from(unicos.values()) })
  }
```

4. En el JSX, después de `{fallo && <AvisoError>{fallo}</AvisoError>}` agregar:

```tsx
      {sinDatos > 0 && (
        <p className="text-sm text-texto-suave">
          {sinDatos} colaboradores activos no tienen puesto o empresa en la hoja; no se les puede asignar regla.
        </p>
      )}
```

5. Entre el bloque del editor y `<ListaReglas …/>`, agregar:

```tsx
      <ListaPorDefinir pendientes={pendientes} lineas={lineas} ciudades={ciudades} etiquetaDe={etiquetaDe}
        alDefinir={definir} alDefinirVarias={definirVarias} />
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` y `npm run lint`
Expected: sin errores.

---

### Task 7: Catálogos iniciales sin prendas ni EPP

**Files:**
- Modify: `src/domain/catalogos-iniciales.ts:1-29`
- Test: `src/domain/catalogos-iniciales.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores (la Tarea 3 ya quitó el último uso de `PRENDAS` y `TIPOS_EPP` fuera de este archivo).
- Produces: el botón "Cargar valores iniciales" de `/admin/catalogos` ya no repone `prendas` ni `tipos_epp` tras el reinicio. `tipos_equipo` conserva `extintor`, `botiquin` y `senaletica` porque las alertas del dashboard los referencian por nombre; el botón solo los repone si un administrador lo pulsa a mano.

- [ ] **Step 1: Actualizar la prueba (fallará)**

En `src/domain/catalogos-iniciales.test.ts`:

1. Cambiar el import por `import { CATALOGOS_INICIALES, unirItems } from './catalogos-iniciales'`.
2. Cambiar la lista del primer test por `['ciudades', 'areas', 'lineas_negocio', 'normas', 'cuadrillas', 'prendas', 'tipos_epp']`.
3. Borrar el test `'deriva prendas y EPP de las constantes'`.

Run: `npx vitest run src/domain/catalogos-iniciales.test.ts`
Expected: FAIL (`prendas` y `tipos_epp` aún traen valores).

- [ ] **Step 2: Implementar**

En `src/domain/catalogos-iniciales.ts`:

1. Borrar `PRENDAS`, `TIPOS_EPP`, `ETIQUETAS` y `desdeValores` (líneas 3-20).
2. Cambiar `tipos_epp: desdeValores(TIPOS_EPP),` por `tipos_epp: [],` y `prendas: desdeValores(PRENDAS),` por `prendas: [],`.

- [ ] **Step 3: Verificar**

Run: `npx vitest run` y `npx tsc --noEmit`
Expected: todo PASS, sin importaciones rotas de `PRENDAS` o `TIPOS_EPP`.

---

### Task 8: Script de reinicio de dotación

**Files:**
- Create: `scripts/lib/reinicio-dotacion.mjs`
- Test: `scripts/lib/reinicio-dotacion.test.mjs`
- Create: `scripts/reiniciar-dotacion.mjs`
- Modify: `package.json` (sección `scripts`)

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: `CATALOGOS_A_VACIAR`, `COLECCIONES_A_BORRAR`, `planearReinicio({ catalogos, colecciones })`, `confirmacionValida(argumento, baseDatos)`.

- [ ] **Step 1: Pruebas que fallan**

Crear `scripts/lib/reinicio-dotacion.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { COLECCIONES_A_BORRAR, confirmacionValida, planearReinicio } from './reinicio-dotacion.mjs'

const entrada = {
  catalogos: {
    prendas: { items: [{ valor: 'botas', etiqueta: 'Botas' }] },
    ciudades: { items: [{ valor: 'leon', etiqueta: 'León' }] },
  },
  colecciones: {
    entregas_epp: [{ id: 'e1', data: { tipo: 'casco' } }, { id: 'e2', data: {} }],
    colaboradores: [{ id: 'c1', data: {} }],
  },
}

describe('planearReinicio', () => {
  const plan = planearReinicio(entrada)

  it('vacía solo los tres catálogos de dotación', () => {
    expect(plan.vaciar).toEqual(['prendas', 'tipos_epp', 'tipos_equipo'])
  })
  it('borra solo las tres colecciones y nunca colaboradores', () => {
    expect(plan.borrar.map((b) => b.coleccion)).toEqual(COLECCIONES_A_BORRAR)
    expect(plan.borrar.find((b) => b.coleccion === 'entregas_epp')?.ids).toEqual(['e1', 'e2'])
    expect(plan.borrar.find((b) => b.coleccion === 'articulos_hoja')?.ids).toEqual([])
    expect(JSON.stringify(plan.borrar)).not.toContain('c1')
  })
  it('respalda el contenido completo de lo que se toca y nada más', () => {
    expect(plan.respaldo.catalogos.prendas).toEqual(entrada.catalogos.prendas)
    expect(plan.respaldo.catalogos.tipos_epp).toBeNull()
    expect(plan.respaldo.catalogos).not.toHaveProperty('ciudades')
    expect(plan.respaldo.colecciones.entregas_epp).toEqual(entrada.colecciones.entregas_epp)
    expect(plan.respaldo.colecciones).not.toHaveProperty('colaboradores')
  })
  it('resume cuántos documentos se tocan', () => {
    expect(plan.resumen).toContain('prendas: 1 entradas')
    expect(plan.resumen).toContain('tipos_epp: 0 entradas')
    expect(plan.resumen).toContain('entregas_epp: 2 documentos')
  })
})

describe('confirmacionValida', () => {
  it('exige el nombre exacto de la base de datos', () => {
    expect(confirmacionValida('--confirmar=base-app', 'base-app')).toBe(true)
    expect(confirmacionValida('--confirmar=otra', 'base-app')).toBe(false)
    expect(confirmacionValida('--confirmar', 'base-app')).toBe(false)
    expect(confirmacionValida(undefined, 'base-app')).toBe(false)
  })
})
```

Run: `npx vitest run scripts/lib/reinicio-dotacion.test.mjs`
Expected: FAIL (no existe el módulo).

- [ ] **Step 2: Función pura**

Crear `scripts/lib/reinicio-dotacion.mjs`:

```js
// Qué se respalda y qué se borra al reiniciar la dotación; no toca nada más.
export const CATALOGOS_A_VACIAR = ['prendas', 'tipos_epp', 'tipos_equipo']
export const COLECCIONES_A_BORRAR = ['articulos_hoja', 'entregas_uniforme', 'entregas_epp']

// catalogos: id -> documento actual; colecciones: nombre -> [{ id, data }]
export function planearReinicio({ catalogos = {}, colecciones = {} }) {
  const respaldo = {
    catalogos: Object.fromEntries(CATALOGOS_A_VACIAR.map((id) => [id, catalogos[id] ?? null])),
    colecciones: Object.fromEntries(COLECCIONES_A_BORRAR.map((c) => [c, colecciones[c] ?? []])),
  }
  const borrar = COLECCIONES_A_BORRAR.map((coleccion) => ({ coleccion, ids: (colecciones[coleccion] ?? []).map((d) => d.id) }))
  const resumen = [
    ...CATALOGOS_A_VACIAR.map((id) => `${id}: ${(catalogos[id]?.items ?? []).length} entradas`),
    ...borrar.map((b) => `${b.coleccion}: ${b.ids.length} documentos`),
  ]
  return { respaldo, vaciar: [...CATALOGOS_A_VACIAR], borrar, resumen }
}

// Borrar exige teclear el nombre de la base: --confirmar=<base>
export const confirmacionValida = (argumento, baseDatos) => argumento === `--confirmar=${baseDatos}`
```

Run: `npx vitest run scripts/lib/reinicio-dotacion.test.mjs`
Expected: PASS.

- [ ] **Step 3: Script**

Crear `scripts/reiniciar-dotacion.mjs`:

```js
// Reinicia los catálogos de dotación y las entregas, con respaldo previo.
// Uso: node --env-file=.env.local scripts/reiniciar-dotacion.mjs [--confirmar=<nombre de la base de datos>]
// Sin --confirmar solo respalda y cuenta; no borra nada.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { CATALOGOS_A_VACIAR, COLECCIONES_A_BORRAR, confirmacionValida, planearReinicio } from './lib/reinicio-dotacion.mjs'

const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
const baseDatos = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE
if (!baseDatos) { console.error('Falta NEXT_PUBLIC_FIRESTORE_DATABASE'); process.exit(1) }

const argumento = process.argv.find((a) => a.startsWith('--confirmar'))
if (argumento && !confirmacionValida(argumento, baseDatos)) {
  console.error(`Confirmación inválida: usa --confirmar=${baseDatos}`)
  process.exit(1)
}

const app = initializeApp({
  credential: json ? cert(JSON.parse(json)) : applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app, baseDatos)

const serializable = (v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString()
  if (Array.isArray(v)) return v.map(serializable)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializable(x)]))
  return v
}

const catalogos = {}
for (const id of CATALOGOS_A_VACIAR) {
  const snap = await db.doc(`catalogos/${id}`).get()
  catalogos[id] = snap.exists ? serializable(snap.data()) : undefined
}
const colecciones = {}
for (const coleccion of COLECCIONES_A_BORRAR) {
  const snap = await db.collection(coleccion).get()
  colecciones[coleccion] = snap.docs.map((d) => ({ id: d.id, data: serializable(d.data()) }))
}

const plan = planearReinicio({ catalogos, colecciones })
plan.resumen.forEach((linea) => console.log(linea))

mkdirSync('respaldos', { recursive: true })
const archivo = `respaldos/dotacion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(archivo, JSON.stringify(plan.respaldo, null, 2))
if (!existsSync(archivo) || statSync(archivo).size === 0) { console.error('No se pudo escribir el respaldo; no se borra nada.'); process.exit(1) }
console.log(`Respaldo guardado en ${archivo}`)

if (!argumento) {
  console.log(`No se eliminó nada. Para borrar: --confirmar=${baseDatos}`)
} else {
  for (const { coleccion, ids } of plan.borrar) {
    for (let i = 0; i < ids.length; i += 400) {
      const lote = db.batch()
      for (const id of ids.slice(i, i + 400)) lote.delete(db.collection(coleccion).doc(id))
      await lote.commit()
    }
  }
  for (const id of plan.vaciar) await db.doc(`catalogos/${id}`).set({ items: [] }, { merge: true })
  console.log('Reinicio completado.')
}
```

En `package.json`, después de `"limpiar:entregas": …,` agregar:

```json
    "reiniciar:dotacion": "node --env-file=.env.local scripts/reiniciar-dotacion.mjs",
```

- [ ] **Step 4: Verificar sin tocar la base real**

Run: `node --check scripts/reiniciar-dotacion.mjs` y `npx vitest run scripts`
Expected: sin errores de sintaxis y pruebas en PASS. **No ejecutar** `npm run reiniciar:dotacion`: lo corre el usuario (ver la guía de ejecución al final).

---

### Task 9: Verificación final

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa**

Run: `npx vitest run` → Expected: todo PASS.
Run: `npx tsc --noEmit` → Expected: sin errores.
Run: `npm run lint` → Expected: sin errores.
Run: `npm run test:rules` → Expected: PASS (si falta Java o `firebase-tools`, decirlo explícitamente en el reporte).

- [ ] **Step 2: Revisión manual con `npm run dev`**

Con el usuario o con un administrador de prueba:

1. `/admin/reglas-dotacion` carga; "Por definir" lista combinaciones con su conteo.
2. Crear una regla desde "Definir": el editor trae empresa y puesto; elegir prendas y EPP; el texto "aplicaría a N colaboradores" se actualiza; Guardar la mueve de "Por definir" a "Definidas".
3. Definir varias a la vez con las casillas; verificar que se crea una regla por empresa × puesto.
4. Crear una excepción por ciudad con "Nueva regla" y comprobar que esa plaza usa la suya.
5. En el editor, agregar una entrada nueva al catálogo y verificar que queda marcada.
6. Editar y eliminar (con confirmación).
7. Dashboard: la tarjeta "Sin regla de dotación" aparece con el conteo y el enlace; los medidores muestran "—" cuando nadie tiene regla; los porcentajes cambian al definir reglas; la tabla de pendientes muestra la columna "Regla".

- [ ] **Step 3: Reporte**

Reportar qué pasó y qué no se pudo ejecutar, sin hacer commit.

---

## Guía de ejecución del reinicio (la hace el usuario, después de aprobar todo lo anterior)

1. `npm run reiniciar:dotacion` (sin `--confirmar`): respalda en `respaldos/dotacion-<fecha>.json` y cuenta. Revisar el conteo y abrir el JSON.
2. Con confirmación explícita: `npm run reiniciar:dotacion -- --confirmar=<nombre de la base>`.
3. En `/admin/reglas-dotacion`, definir las reglas; las entradas de catálogo que falten se crean desde el editor.
4. En `/admin/articulos-hoja`, volver a mapear los artículos de la hoja. El botón "Cargar propuesta inicial" recrea desde `src/data/articulos-hoja-inicial.json` tanto el mapeo como sus entradas de catálogo; úsalo solo si quieres partir de esa propuesta.
5. En `/admin/entregas-hoja`, "Simular" y luego "Sincronizar" para volver a traer las entregas.

## Notas y límites conocidos

- Borrar una entrada de catálogo que una regla ya usa deja el valor huérfano en la regla (el dashboard lo mostraría tal cual). `/admin/catalogos` solo revisa el uso en registros, no en reglas; queda fuera de este alcance.
- Quien no trae puesto o empresa en la hoja cuenta como "sin regla" en el dashboard, pero no aparece en "Por definir" (no se le puede definir regla); la pantalla muestra cuántos son.
