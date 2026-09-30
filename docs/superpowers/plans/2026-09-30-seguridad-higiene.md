# Seguridad e Higiene Implementation Plan

> Documento histórico de planificación: los valores de la empresa se reemplazaron por marcadores (`<PROYECTO>`, `<BASE>`, `ejemplo.test`, `Ciudad A`, ...) y el código puede diferir de la implementación final.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app web de Seguridad e Higiene (captura, dashboard operativo, dashboard analítico y migración única desde Excel) sobre Firestore.

**Architecture:** Next.js 14 con Clean Architecture. `domain` guarda entidades, permisos y cálculo de indicadores sin dependencias de Firebase. `application` guarda funciones puras que arman el dashboard. `infrastructure` guarda el acceso a Firestore. `presentation`, `app` y `components` guardan la UI. Los módulos de captura se generan a partir de definiciones declarativas (`ModuloDef`) para no repetir formularios.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, pnpm, Tailwind, Firebase Auth + Firestore, Vitest, `@firebase/rules-unit-testing`, Python 3 con `openpyxl`, `firebase-admin` y `pytest` (solo migración).

**Spec:** `docs/superpowers/specs/2026-09-30-seguridad-higiene-design.md`

## Global Constraints

- Next.js 14 (App Router), React 18, TypeScript. Gestor de paquetes: pnpm.
- Firebase: proyecto `<PROYECTO>`, base de datos con nombre `<BASE>`. Las reglas viven en `firestore.seguridad-higiene.rules` y `firebase.json` no declara la base por defecto.
- Login con Google restringido a `@ejemplo.test`. Roles: `admin`, `capturista`, `consulta`.
- Gráficas con SVG y CSS propios. No usar Recharts.
- Clean Architecture: `domain` no importa Firebase ni React.
- Fechas de calendario: `Timestamp` a las 12:00 UTC, mostradas con `timeZone: 'UTC'`. Fecha ausente: `null`. `periodo` es `YYYY-MM`.
- Ciudad, línea de negocio y demás valores de catálogo se guardan como slug.
- Todos los documentos llevan `creado_en`, `creado_por`, `actualizado_en`, `actualizado_por`.
- IDs automáticos de Firestore, salvo `indicadores_mensuales/{ciudad}_{periodo}`.
- Constantes de indicadores: 240 horas por persona al mes, K mensual 20000, K anual 240000.
- Sin emojis en código ni UI: solo SVG o fuentes de iconos. Comentarios de una línea como máximo. La UI debe ser responsive en cada cambio.
- Diseño visual con el skill `frontend-design`.
- No leer, crear ni editar `.env.local` ni ningún archivo de credenciales. Los crea el usuario a partir de `.env.example`.
- No arrancar `pnpm dev` ni `next dev` por iniciativa propia. Si hace falta ver la UI, pedirle al usuario que la levante.
- Commits locales, sin push. Cada commit termina con el trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## File Structure

```
firebase.json, .firebaserc, .env.example
firestore.seguridad-higiene.rules
firestore.seguridad-higiene.indexes.json
vitest.config.ts, vitest.rules.config.ts
src/domain/
  fechas.ts, slug.ts, indicadores.ts, permisos.ts
  modulos.ts, modulos-definiciones.ts
  catalogos-iniciales.ts, entidades.ts
src/application/dashboard.ts
src/infrastructure/firebase/cliente.ts
src/infrastructure/firestore/{conversion.ts, repositorio.ts, catalogos.ts}
src/presentation/auth/{AuthProvider.tsx, RequireAcceso.tsx}
src/presentation/datos/{useColeccion.ts, useCatalogo.ts, useOpciones.ts, useConfigIndicadores.ts,
                        FormularioModulo.tsx, TablaModulo.tsx, PaginaModulo.tsx}
src/presentation/graficas/{geometria.ts, GraficaBarrasApiladas.tsx, GraficaLinea.tsx}
src/app/(app)/... , src/app/login/page.tsx
tests/rules/firestore.rules.test.ts
scripts/migracion/{slug.py, leer_excel.py, transformar.py, cargar.py, migrar.py, tests/}
README.md
```

---

### Task 1: Scaffold, herramientas y ajustes al spec

**Files:**
- Create: proyecto Next.js en la raíz, `vitest.config.ts`, `.env.example`
- Modify: `package.json` (scripts), `.gitignore`, `docs/superpowers/specs/2026-09-30-seguridad-higiene-design.md`

**Interfaces:**
- Produces: scripts `pnpm test`, `pnpm typecheck`, `pnpm lint`; alias `@/` a `src/`.

- [ ] **Step 1: Crear el proyecto Next 14 con pnpm**

Run (desde la carpeta del proyecto):
```bash
pnpm dlx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
pnpm add firebase
pnpm add -D vitest @firebase/rules-unit-testing firebase-tools
```
Expected: se crea `src/app`, `package.json`, `pnpm-lock.yaml`. Si pregunta por sobrescribir, la carpeta `docs` y `.git` no deben tocarse.

- [ ] **Step 2: Configurar Vitest y scripts**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
```

Create `vitest.rules.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
})
```

Modify `package.json`, agregando en `scripts`:
```json
"test": "vitest run",
"typecheck": "tsc --noEmit",
"test:rules": "firebase emulators:exec --only firestore --project demo-seguridad-higiene \"vitest run --config vitest.rules.config.ts\""
```

- [ ] **Step 3: Plantilla de variables y .gitignore**

Create `.env.example`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<PROYECTO>
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Append a `.gitignore`:
```
scripts/migracion/salida/
scripts/migracion/.venv/
__pycache__/
.pytest_cache/
```

- [ ] **Step 4: Aplicar los ajustes al spec**

En `docs/superpowers/specs/2026-09-30-seguridad-higiene-design.md`:

1. En "Acceso y roles", después de la viñeta que empieza con "Iniciar sesión no da acceso", agregar:
`- Al primer inicio de sesión la app crea `usuarios/{uid}` con `rol: 'sin_rol'` y `activo: false`. Las reglas solo permiten ese alta a la propia cuenta y con esos valores. Un admin asigna el rol y activa la cuenta.`
2. En la tabla, fila `vehiculos`: reemplazar `` `extintor`, `botiquin` `` por `` `extintor_vencimiento`, `botiquin_caducidad` ``.
3. En "Notas", reemplazar la viñeta de `detalle` por:
`- `detalle` en `oficinas_equipo` es texto libre (por ejemplo `CO2 6.8 kg` o el contenido del botiquín).`
4. En la viñeta de `estado` de capacitación, agregar al final: ` Se calcula al guardar a partir de `fecha` y `vencimiento`.`
5. En "Migración inicial", agregar estas viñetas:
   - `Las columnas SI/NO de cumplimiento y EPP traen los dos textos como etiqueta fija en todas las filas, así que no informan nada. Una capacitación cumple si tiene fecha; una entrega de EPP existe si tiene fecha. Sin fecha no se crea registro.`
   - `El Excel de colaboradores no trae días de incapacidad por accidente ni población histórica. Los accidentes migrados llevan `dias_incapacidad: 0` y la población se captura en la app.`

- [ ] **Step 5: Verificar y commit**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

```bash
git add -A
git commit -m "chore: scaffold Next 14 con pnpm, Vitest y ajustes al spec" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Dominio de fechas y vencimientos

**Files:**
- Create: `src/domain/fechas.ts`
- Test: `src/domain/fechas.test.ts`

**Interfaces:**
- Produces:
  - `fechaCalendario(anio: number, mes: number, dia: number): Date`
  - `periodoDe(fecha: Date): string`
  - `formatearFecha(fecha: Date | null): string`
  - `aTextoIso(fecha: Date | null): string` y `deTextoIso(texto: string): Date | null` (para `<input type="date">`)
  - `diasParaVencer(vencimiento: Date, hoy: Date): number`
  - `type EstadoVencimiento = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencido'`
  - `estadoVencimiento(vencimiento: Date | null, hoy: Date, diasAviso?: number): EstadoVencimiento`
  - `estadoCapacitacion(fecha: Date | null, vencimiento: Date | null, hoy: Date): 'pendiente' | 'vigente' | 'vencido'`
  - `DIAS_AVISO_VENCIMIENTO = 30`

- [ ] **Step 1: Escribir las pruebas que fallan**

Create `src/domain/fechas.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  aTextoIso, deTextoIso, diasParaVencer, estadoCapacitacion, estadoVencimiento,
  fechaCalendario, formatearFecha, periodoDe,
} from './fechas'

const hoy = new Date(2026, 8, 30)

describe('fechas de calendario', () => {
  it('guarda a las 12:00 UTC', () => {
    expect(fechaCalendario(2026, 8, 31).toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })
  it('calcula el periodo', () => {
    expect(periodoDe(fechaCalendario(2026, 8, 31))).toBe('2026-08')
    expect(periodoDe(fechaCalendario(2026, 1, 1))).toBe('2026-01')
  })
  it('formatea en UTC y maneja null', () => {
    expect(formatearFecha(fechaCalendario(2026, 8, 31))).toBe('31/08/2026')
    expect(formatearFecha(null)).toBe('-')
  })
  it('convierte a y desde texto ISO', () => {
    expect(aTextoIso(fechaCalendario(2026, 8, 31))).toBe('2026-08-31')
    expect(aTextoIso(null)).toBe('')
    expect(deTextoIso('2026-08-31')?.toISOString()).toBe('2026-08-31T12:00:00.000Z')
    expect(deTextoIso('')).toBeNull()
  })
})

describe('vencimientos', () => {
  it('cuenta días', () => {
    expect(diasParaVencer(fechaCalendario(2026, 9, 29), hoy)).toBe(-1)
    expect(diasParaVencer(fechaCalendario(2026, 9, 30), hoy)).toBe(0)
  })
  it('clasifica el estado', () => {
    expect(estadoVencimiento(null, hoy)).toBe('sin_fecha')
    expect(estadoVencimiento(fechaCalendario(2026, 9, 29), hoy)).toBe('vencido')
    expect(estadoVencimiento(fechaCalendario(2026, 9, 30), hoy)).toBe('por_vencer')
    expect(estadoVencimiento(fechaCalendario(2026, 10, 30), hoy)).toBe('por_vencer')
    expect(estadoVencimiento(fechaCalendario(2026, 10, 31), hoy)).toBe('vigente')
  })
  it('calcula el estado de capacitación', () => {
    expect(estadoCapacitacion(null, null, hoy)).toBe('pendiente')
    expect(estadoCapacitacion(fechaCalendario(2026, 5, 4), null, hoy)).toBe('vigente')
    expect(estadoCapacitacion(fechaCalendario(2025, 5, 4), fechaCalendario(2026, 5, 4), hoy)).toBe('vencido')
    expect(estadoCapacitacion(fechaCalendario(2026, 5, 4), fechaCalendario(2027, 5, 4), hoy)).toBe('vigente')
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/domain/fechas.test.ts`
Expected: FAIL, no se encuentra `./fechas`.

- [ ] **Step 3: Implementar**

Create `src/domain/fechas.ts`:
```ts
export const DIAS_AVISO_VENCIMIENTO = 30

export function fechaCalendario(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
}

export function periodoDe(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatearFecha(fecha: Date | null): string {
  if (!fecha) return '-'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(fecha)
}

export function aTextoIso(fecha: Date | null): string {
  return fecha ? fecha.toISOString().slice(0, 10) : ''
}

export function deTextoIso(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  return m ? fechaCalendario(Number(m[1]), Number(m[2]), Number(m[3])) : null
}

export function diasParaVencer(vencimiento: Date, hoy: Date): number {
  const v = Date.UTC(vencimiento.getUTCFullYear(), vencimiento.getUTCMonth(), vencimiento.getUTCDate())
  const h = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((v - h) / 86_400_000)
}

export type EstadoVencimiento = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencido'

export function estadoVencimiento(
  vencimiento: Date | null, hoy: Date, diasAviso = DIAS_AVISO_VENCIMIENTO,
): EstadoVencimiento {
  if (!vencimiento) return 'sin_fecha'
  const dias = diasParaVencer(vencimiento, hoy)
  if (dias < 0) return 'vencido'
  return dias <= diasAviso ? 'por_vencer' : 'vigente'
}

export function estadoCapacitacion(
  fecha: Date | null, vencimiento: Date | null, hoy: Date,
): 'pendiente' | 'vigente' | 'vencido' {
  if (!fecha) return 'pendiente'
  return vencimiento && diasParaVencer(vencimiento, hoy) < 0 ? 'vencido' : 'vigente'
}
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/domain/fechas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/fechas.ts src/domain/fechas.test.ts
git commit -m "feat(domain): fechas de calendario y estados de vencimiento" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Dominio de indicadores (HHT, IF, IS, ILI)

**Files:**
- Create: `src/domain/indicadores.ts`
- Test: `src/domain/indicadores.test.ts`

**Interfaces:**
- Produces:
  - `interface ConfigIndicadores { horasPorPersonaMes; kMensual; kAnual; umbralSupera; umbralMeta; umbralMinimo; referenciaInterpretacion }` (todos `number`)
  - `CONFIG_INDICADORES_INICIAL: ConfigIndicadores`
  - `configDesdeDoc(doc: Record<string, unknown> | null): ConfigIndicadores` (lee los campos snake_case de Firestore)
  - `interface MesBase { poblacion: number; eventos: number; dias: number }`
  - `interface Indices { hht: number; eventos: number; dias: number; indiceFrecuencia: number | null; indiceSeveridad: number | null; ili: number | null }`
  - `calcularHht(poblacion: number, cfg: ConfigIndicadores): number`
  - `calcularIndices(meses: MesBase[], cfg: ConfigIndicadores, k: number): Indices`
  - `calcularMes(mes: MesBase, cfg): Indices` y `calcularAnual(meses: MesBase[], cfg): Indices`
  - `type NivelIli = 'supera' | 'meta' | 'minimo' | 'fuera_de_meta' | 'sin_dato'`
  - `clasificarIli(ili: number | null, cfg): NivelIli`

- [ ] **Step 1: Escribir las pruebas que fallan**

Create `src/domain/indicadores.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  CONFIG_INDICADORES_INICIAL as cfg, calcularAnual, calcularHht, calcularMes,
  clasificarIli, configDesdeDoc,
} from './indicadores'

// Serie ficticia, simple de verificar a mano
const poblacion = [5, 5, 5, 5, 5, 5, 10, 10, 0, 0, 0, 0]
const eventos = [0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0]
const dias = [0, 0, 4, 0, 0, 0, 0, 6, 0, 0, 0, 0]
const meses = poblacion.map((p, i) => ({ poblacion: p, eventos: eventos[i], dias: dias[i] }))

describe('indicadores', () => {
  it('calcula HHT', () => {
    expect(calcularHht(5, cfg)).toBe(1200)
  })
  it('calcula el acumulado anual de la serie', () => {
    const r = calcularAnual(meses, cfg)
    expect(r.hht).toBe(12000)
    expect(r.indiceFrecuencia).toBeCloseTo(60, 6)
    expect(r.indiceSeveridad).toBeCloseTo(200, 6)
    expect(r.ili).toBeCloseTo(12, 6)
  })
  it('calcula un mes', () => {
    const r = calcularMes({ poblacion: 10, eventos: 1, dias: 3 }, cfg)
    expect(r.indiceFrecuencia).toBeCloseTo(8.333333333, 6)
    expect(r.indiceSeveridad).toBeCloseTo(25, 6)
    expect(r.ili).toBeCloseTo(0.2083333333, 6)
  })
  it('devuelve null sin HHT', () => {
    const r = calcularMes({ poblacion: 0, eventos: 0, dias: 0 }, cfg)
    expect(r.indiceFrecuencia).toBeNull()
    expect(r.ili).toBeNull()
  })
  it('consolida sumando antes de calcular', () => {
    const r = calcularAnual([
      { poblacion: 10, eventos: 1, dias: 5 },
      { poblacion: 30, eventos: 0, dias: 0 },
    ], cfg)
    expect(r.indiceFrecuencia).toBeCloseTo(25, 6)
    expect(r.indiceSeveridad).toBeCloseTo(125, 6)
    expect(r.ili).toBeCloseTo(3.125, 6)
  })
})

describe('semáforo del ILI', () => {
  it.each([
    [0.3, 'supera'], [0.4, 'supera'], [0.5, 'meta'], [0.7, 'meta'],
    [0.9, 'minimo'], [1, 'minimo'], [1.01, 'fuera_de_meta'], [null, 'sin_dato'],
  ])('%s -> %s', (valor, nivel) => {
    expect(clasificarIli(valor as number | null, cfg)).toBe(nivel)
  })
})

describe('configDesdeDoc', () => {
  it('usa los valores iniciales si no hay documento', () => {
    expect(configDesdeDoc(null)).toEqual(cfg)
  })
  it('lee campos snake_case y completa los que faltan', () => {
    const r = configDesdeDoc({ horas_por_persona_mes: 200, k_anual: 100 })
    expect(r.horasPorPersonaMes).toBe(200)
    expect(r.kAnual).toBe(100)
    expect(r.kMensual).toBe(20000)
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/domain/indicadores.test.ts`
Expected: FAIL, no se encuentra `./indicadores`.

- [ ] **Step 3: Implementar**

Create `src/domain/indicadores.ts`:
```ts
export interface ConfigIndicadores {
  horasPorPersonaMes: number
  kMensual: number
  kAnual: number
  umbralSupera: number
  umbralMeta: number
  umbralMinimo: number
  referenciaInterpretacion: number
}

export const CONFIG_INDICADORES_INICIAL: ConfigIndicadores = {
  horasPorPersonaMes: 240,
  kMensual: 20000,
  kAnual: 240000,
  umbralSupera: 0.4,
  umbralMeta: 0.7,
  umbralMinimo: 1,
  referenciaInterpretacion: 0.2,
}

const CAMPOS_DOC: Record<keyof ConfigIndicadores, string> = {
  horasPorPersonaMes: 'horas_por_persona_mes',
  kMensual: 'k_mensual',
  kAnual: 'k_anual',
  umbralSupera: 'umbral_supera',
  umbralMeta: 'umbral_meta',
  umbralMinimo: 'umbral_minimo',
  referenciaInterpretacion: 'referencia_interpretacion',
}

export function configDesdeDoc(doc: Record<string, unknown> | null): ConfigIndicadores {
  const cfg = { ...CONFIG_INDICADORES_INICIAL }
  if (!doc) return cfg
  for (const clave of Object.keys(CAMPOS_DOC) as (keyof ConfigIndicadores)[]) {
    const valor = doc[CAMPOS_DOC[clave]]
    if (typeof valor === 'number' && Number.isFinite(valor)) cfg[clave] = valor
  }
  return cfg
}

export interface MesBase { poblacion: number; eventos: number; dias: number }

export interface Indices {
  hht: number
  eventos: number
  dias: number
  indiceFrecuencia: number | null
  indiceSeveridad: number | null
  ili: number | null
}

export function calcularHht(poblacion: number, cfg: ConfigIndicadores): number {
  return poblacion * cfg.horasPorPersonaMes
}

function indice(numerador: number, hht: number, k: number): number | null {
  return hht > 0 ? (numerador / hht) * k : null
}

export function calcularIndices(meses: MesBase[], cfg: ConfigIndicadores, k: number): Indices {
  const hht = meses.reduce((s, m) => s + calcularHht(m.poblacion, cfg), 0)
  const eventos = meses.reduce((s, m) => s + m.eventos, 0)
  const dias = meses.reduce((s, m) => s + m.dias, 0)
  const indiceFrecuencia = indice(eventos, hht, k)
  const indiceSeveridad = indice(dias, hht, k)
  const ili = indiceFrecuencia !== null && indiceSeveridad !== null
    ? (indiceFrecuencia * indiceSeveridad) / 1000
    : null
  return { hht, eventos, dias, indiceFrecuencia, indiceSeveridad, ili }
}

export const calcularMes = (mes: MesBase, cfg: ConfigIndicadores): Indices =>
  calcularIndices([mes], cfg, cfg.kMensual)

export const calcularAnual = (meses: MesBase[], cfg: ConfigIndicadores): Indices =>
  calcularIndices(meses, cfg, cfg.kAnual)

export type NivelIli = 'supera' | 'meta' | 'minimo' | 'fuera_de_meta' | 'sin_dato'

export function clasificarIli(ili: number | null, cfg: ConfigIndicadores): NivelIli {
  if (ili === null) return 'sin_dato'
  if (ili <= cfg.umbralSupera) return 'supera'
  if (ili <= cfg.umbralMeta) return 'meta'
  if (ili <= cfg.umbralMinimo) return 'minimo'
  return 'fuera_de_meta'
}
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/domain/indicadores.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/indicadores.ts src/domain/indicadores.test.ts
git commit -m "feat(domain): cálculo de HHT, IF, IS e ILI con semáforo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Dominio de permisos y acceso

**Files:**
- Create: `src/domain/permisos.ts`
- Test: `src/domain/permisos.test.ts`

**Interfaces:**
- Produces:
  - `type Rol = 'admin' | 'capturista' | 'consulta' | 'sin_rol'`
  - `interface UsuarioDoc { email: string; rol: Rol; activo: boolean }`
  - `DOMINIO_PERMITIDO = 'ejemplo.test'`
  - `esCorreoPermitido(email: string | null | undefined): boolean`
  - `type Accion = 'leer' | 'capturar' | 'administrar'`
  - `puede(usuario: UsuarioDoc | null, accion: Accion): boolean`
  - `type EstadoAcceso = 'sin_sesion' | 'dominio_no_permitido' | 'sin_registro' | 'pendiente' | 'inactivo' | 'autorizado'`
  - `resolverAcceso(email: string | null, usuario: UsuarioDoc | null): EstadoAcceso`

- [ ] **Step 1: Escribir las pruebas que fallan**

Create `src/domain/permisos.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { esCorreoPermitido, puede, resolverAcceso, type UsuarioDoc } from './permisos'

const u = (rol: UsuarioDoc['rol'], activo = true): UsuarioDoc => ({ email: 'a@ejemplo.test', rol, activo })

describe('esCorreoPermitido', () => {
  it('acepta solo el dominio de la empresa', () => {
    expect(esCorreoPermitido('a@ejemplo.test')).toBe(true)
    expect(esCorreoPermitido('A@Ejemplo.TEST')).toBe(true)
    expect(esCorreoPermitido('a@gmail.com')).toBe(false)
    expect(esCorreoPermitido('a@ejemplo.test.evil.com')).toBe(false)
    expect(esCorreoPermitido(null)).toBe(false)
  })
})

describe('puede', () => {
  it('admin puede todo', () => {
    for (const a of ['leer', 'capturar', 'administrar'] as const) expect(puede(u('admin'), a)).toBe(true)
  })
  it('capturista lee y captura, no administra', () => {
    expect(puede(u('capturista'), 'capturar')).toBe(true)
    expect(puede(u('capturista'), 'administrar')).toBe(false)
  })
  it('consulta solo lee', () => {
    expect(puede(u('consulta'), 'leer')).toBe(true)
    expect(puede(u('consulta'), 'capturar')).toBe(false)
  })
  it('inactivo, sin rol y null no pueden nada', () => {
    expect(puede(u('admin', false), 'leer')).toBe(false)
    expect(puede(u('sin_rol'), 'leer')).toBe(false)
    expect(puede(null, 'leer')).toBe(false)
  })
})

describe('resolverAcceso', () => {
  it('recorre todos los estados', () => {
    expect(resolverAcceso(null, null)).toBe('sin_sesion')
    expect(resolverAcceso('a@gmail.com', null)).toBe('dominio_no_permitido')
    expect(resolverAcceso('a@ejemplo.test', null)).toBe('sin_registro')
    expect(resolverAcceso('a@ejemplo.test', u('sin_rol', false))).toBe('pendiente')
    expect(resolverAcceso('a@ejemplo.test', u('consulta', false))).toBe('inactivo')
    expect(resolverAcceso('a@ejemplo.test', u('consulta'))).toBe('autorizado')
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/domain/permisos.test.ts`
Expected: FAIL, no se encuentra `./permisos`.

- [ ] **Step 3: Implementar**

Create `src/domain/permisos.ts`:
```ts
export type Rol = 'admin' | 'capturista' | 'consulta' | 'sin_rol'

export interface UsuarioDoc { email: string; rol: Rol; activo: boolean }

export const DOMINIO_PERMITIDO = 'ejemplo.test'

export function esCorreoPermitido(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${DOMINIO_PERMITIDO}`)
}

export type Accion = 'leer' | 'capturar' | 'administrar'

export function puede(usuario: UsuarioDoc | null, accion: Accion): boolean {
  if (!usuario || !usuario.activo) return false
  switch (usuario.rol) {
    case 'admin': return true
    case 'capturista': return accion !== 'administrar'
    case 'consulta': return accion === 'leer'
    default: return false
  }
}

export type EstadoAcceso =
  | 'sin_sesion' | 'dominio_no_permitido' | 'sin_registro' | 'pendiente' | 'inactivo' | 'autorizado'

export function resolverAcceso(email: string | null, usuario: UsuarioDoc | null): EstadoAcceso {
  if (!email) return 'sin_sesion'
  if (!esCorreoPermitido(email)) return 'dominio_no_permitido'
  if (!usuario) return 'sin_registro'
  if (usuario.rol === 'sin_rol') return 'pendiente'
  if (!usuario.activo) return 'inactivo'
  return 'autorizado'
}
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/domain/permisos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/permisos.ts src/domain/permisos.test.ts
git commit -m "feat(domain): roles, permisos y resolución de acceso" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Reglas de Firestore, índices y pruebas con emulador

**Prerrequisitos:** Java instalado (lo exige el emulador de Firestore).

**Files:**
- Create: `firestore.seguridad-higiene.rules`, `firestore.seguridad-higiene.indexes.json`, `firebase.json`, `.firebaserc`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: roles de la Task 4 (`admin`, `capturista`, `consulta`, `sin_rol`).
- Produces: reglas desplegables con `firebase deploy --only firestore:<BASE>`.

- [ ] **Step 1: Configuración de Firebase**

Create `firebase.json`:
```json
{
  "firestore": [
    {
      "database": "<BASE>",
      "rules": "firestore.seguridad-higiene.rules",
      "indexes": "firestore.seguridad-higiene.indexes.json"
    }
  ],
  "emulators": {
    "firestore": { "host": "127.0.0.1", "port": 8080 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

Create `.firebaserc`:
```json
{ "projects": { "default": "<PROYECTO>" } }
```

Create `firestore.seguridad-higiene.indexes.json`:
```json
{
  "indexes": [
    { "collectionGroup": "capacitaciones", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "ciudad", "order": "ASCENDING" }, { "fieldPath": "vencimiento", "order": "ASCENDING" } ] },
    { "collectionGroup": "entregas_epp", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "ciudad", "order": "ASCENDING" }, { "fieldPath": "vencimiento", "order": "ASCENDING" } ] },
    { "collectionGroup": "oficinas_equipo", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "ciudad", "order": "ASCENDING" }, { "fieldPath": "vencimiento", "order": "ASCENDING" } ] },
    { "collectionGroup": "accidentes", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "ciudad", "order": "ASCENDING" }, { "fieldPath": "periodo", "order": "ASCENDING" } ] },
    { "collectionGroup": "entregas_uniforme", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "ciudad", "order": "ASCENDING" }, { "fieldPath": "periodo", "order": "ASCENDING" } ] }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Create `tests/rules/firestore.rules.test.ts`:
```ts
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

const como = (uid: string, email = `${uid}@ejemplo.test`) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-seguridad-higiene',
    firestore: {
      rules: readFileSync('firestore.seguridad-higiene.rules', 'utf8'),
      host: '127.0.0.1', port: 8080,
    },
  })
})

afterAll(async () => { await env.cleanup() })

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios/admin1'), { email: 'admin1@ejemplo.test', rol: 'admin', activo: true })
    await setDoc(doc(db, 'usuarios/capt1'), { email: 'capt1@ejemplo.test', rol: 'capturista', activo: true })
    await setDoc(doc(db, 'usuarios/cons1'), { email: 'cons1@ejemplo.test', rol: 'consulta', activo: true })
    await setDoc(doc(db, 'usuarios/inact1'), { email: 'inact1@ejemplo.test', rol: 'consulta', activo: false })
    await setDoc(doc(db, 'usuarios/ext1'), { email: 'ext1@gmail.com', rol: 'admin', activo: true })
    await setDoc(doc(db, 'colaboradores/c1'), { nombre: 'Prueba', ciudad: 'ciudad-b' })
  })
})

describe('lectura', () => {
  it('consulta, capturista y admin leen', async () => {
    for (const uid of ['cons1', 'capt1', 'admin1']) {
      await assertSucceeds(getDoc(doc(como(uid), 'colaboradores/c1')))
    }
  })
  it('sin sesión, sin registro, inactivo y correo externo no leen', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('nuevo1'), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('inact1'), 'colaboradores/c1')))
    await assertFails(getDoc(doc(como('ext1', 'ext1@gmail.com'), 'colaboradores/c1')))
  })
})

describe('escritura de datos', () => {
  it('consulta no escribe', async () => {
    await assertFails(setDoc(doc(como('cons1'), 'colaboradores/c2'), { nombre: 'X' }))
    await assertFails(updateDoc(doc(como('cons1'), 'colaboradores/c1'), { nombre: 'X' }))
  })
  it('capturista crea y edita, pero no borra', async () => {
    await assertSucceeds(setDoc(doc(como('capt1'), 'accidentes/a1'), { ciudad: 'ciudad-b' }))
    await assertSucceeds(updateDoc(doc(como('capt1'), 'colaboradores/c1'), { nombre: 'Y' }))
    await assertFails(deleteDoc(doc(como('capt1'), 'colaboradores/c1')))
  })
  it('admin borra', async () => {
    await assertSucceeds(deleteDoc(doc(como('admin1'), 'colaboradores/c1')))
  })
})

describe('usuarios', () => {
  it('cada quien lee su documento, solo admin lista', async () => {
    await assertSucceeds(getDoc(doc(como('cons1'), 'usuarios/cons1')))
    await assertFails(getDoc(doc(como('cons1'), 'usuarios/admin1')))
    await assertFails(getDocs(collection(como('capt1'), 'usuarios')))
    await assertSucceeds(getDocs(collection(como('admin1'), 'usuarios')))
  })
  it('un usuario nuevo solo puede registrarse como sin_rol inactivo', async () => {
    const db = como('nuevo1')
    await assertSucceeds(setDoc(doc(db, 'usuarios/nuevo1'),
      { email: 'nuevo1@ejemplo.test', rol: 'sin_rol', activo: false }))
  })
  it('no puede registrarse con rol propio ni por otra cuenta', async () => {
    await assertFails(setDoc(doc(como('nuevo2'), 'usuarios/nuevo2'),
      { email: 'nuevo2@ejemplo.test', rol: 'admin', activo: true }))
    await assertFails(setDoc(doc(como('nuevo3'), 'usuarios/otro'),
      { email: 'nuevo3@ejemplo.test', rol: 'sin_rol', activo: false }))
    await assertFails(setDoc(doc(como('nuevo4', 'nuevo4@gmail.com'), 'usuarios/nuevo4'),
      { email: 'nuevo4@gmail.com', rol: 'sin_rol', activo: false }))
  })
  it('solo admin cambia roles', async () => {
    await assertFails(updateDoc(doc(como('capt1'), 'usuarios/capt1'), { rol: 'admin' }))
    await assertSucceeds(updateDoc(doc(como('admin1'), 'usuarios/cons1'), { rol: 'capturista' }))
  })
})

describe('catálogos y configuración', () => {
  it('todos leen, solo admin escribe', async () => {
    await assertSucceeds(getDoc(doc(como('cons1'), 'catalogos/ciudades')))
    await assertFails(setDoc(doc(como('capt1'), 'catalogos/ciudades'), { items: [] }))
    await assertSucceeds(setDoc(doc(como('admin1'), 'configuracion/indicadores'), { k_mensual: 20000 }))
  })
})
```

- [ ] **Step 3: Ver que fallan**

Run: `pnpm test:rules`
Expected: FAIL (no existe el archivo de reglas).

- [ ] **Step 4: Escribir las reglas**

Create `firestore.seguridad-higiene.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function correoPermitido() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email.matches('.*@ejemplo[.]test');
    }

    function tieneRegistro() {
      return correoPermitido()
        && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid));
    }

    function usuarioActual() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data;
    }

    function activoConRol(roles) {
      return tieneRegistro() && usuarioActual().activo == true && usuarioActual().rol in roles;
    }

    function puedeLeer() { return activoConRol(['admin', 'capturista', 'consulta']); }
    function puedeCapturar() { return activoConRol(['admin', 'capturista']); }
    function esAdmin() { return activoConRol(['admin']); }

    match /usuarios/{uid} {
      allow get: if correoPermitido() && (request.auth.uid == uid || esAdmin());
      allow list: if esAdmin();
      allow create: if correoPermitido()
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['email', 'rol', 'activo'])
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.rol == 'sin_rol'
        && request.resource.data.activo == false;
      allow update, delete: if esAdmin();
    }

    match /catalogos/{id} {
      allow read: if puedeLeer();
      allow write: if esAdmin();
    }

    match /configuracion/{id} {
      allow read: if puedeLeer();
      allow write: if esAdmin();
    }

    match /{coleccion}/{id} {
      allow read: if coleccion in [
          'colaboradores', 'capacitaciones', 'entregas_uniforme', 'entregas_epp',
          'accidentes', 'oficinas_equipo', 'vehiculos', 'indicadores_mensuales'
        ] && puedeLeer();
      allow create, update: if coleccion in [
          'colaboradores', 'capacitaciones', 'entregas_uniforme', 'entregas_epp',
          'accidentes', 'oficinas_equipo', 'vehiculos', 'indicadores_mensuales'
        ] && puedeCapturar();
      allow delete: if coleccion in [
          'colaboradores', 'capacitaciones', 'entregas_uniforme', 'entregas_epp',
          'accidentes', 'oficinas_equipo', 'vehiculos', 'indicadores_mensuales'
        ] && esAdmin();
    }
  }
}
```

- [ ] **Step 5: Ver que pasan**

Run: `pnpm test:rules`
Expected: todas las pruebas PASS.

- [ ] **Step 6: Commit**

```bash
git add firebase.json .firebaserc firestore.seguridad-higiene.rules firestore.seguridad-higiene.indexes.json tests/rules
git commit -m "feat(firestore): reglas por rol, índices y pruebas con emulador" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cliente Firebase, sesión y guardia de acceso

**Files:**
- Create: `src/infrastructure/firebase/cliente.ts`, `src/presentation/auth/AuthProvider.tsx`, `src/presentation/auth/RequireAcceso.tsx`, `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/page.tsx` (lo reemplaza `src/app/(app)/page.tsx` en la Task 13)

**Interfaces:**
- Consumes: `resolverAcceso`, `esCorreoPermitido`, `puede`, tipos de `permisos.ts`.
- Produces:
  - `auth`, `db` desde `@/infrastructure/firebase/cliente` (`db` apunta a `<BASE>`)
  - `useSesion(): { cargando: boolean; acceso: EstadoAcceso; usuario: UsuarioDoc | null; uid: string | null; correo: string | null; iniciarSesion(): Promise<void>; cerrarSesion(): Promise<void> }`
  - `<RequireAcceso accion={Accion}>{children}</RequireAcceso>`

- [ ] **Step 1: Cliente Firebase**

Create `src/infrastructure/firebase/cliente.ts`:
```ts
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })

export const auth = getAuth(app)
export const db = getFirestore(app, 'seguridad-higiene')
```

- [ ] **Step 2: Proveedor de sesión**

Create `src/presentation/auth/AuthProvider.tsx`:
```tsx
'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '@/infrastructure/firebase/cliente'
import {
  DOMINIO_PERMITIDO, esCorreoPermitido, resolverAcceso,
  type EstadoAcceso, type UsuarioDoc,
} from '@/domain/permisos'

interface Sesion {
  cargando: boolean
  acceso: EstadoAcceso
  usuario: UsuarioDoc | null
  uid: string | null
  correo: string | null
  iniciarSesion: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelarDoc = () => {}
    const cancelarAuth = onAuthStateChanged(auth, (u) => {
      cancelarDoc()
      cancelarDoc = () => {}
      setUser(u)
      if (!u || !esCorreoPermitido(u.email)) {
        setUsuario(null)
        setCargando(false)
        return
      }
      setCargando(true)
      cancelarDoc = onSnapshot(
        doc(db, 'usuarios', u.uid),
        async (snap) => {
          if (!snap.exists()) {
            await setDoc(doc(db, 'usuarios', u.uid), { email: u.email, rol: 'sin_rol', activo: false })
            return
          }
          setUsuario(snap.data() as UsuarioDoc)
          setCargando(false)
        },
        () => { setUsuario(null); setCargando(false) },
      )
    })
    return () => { cancelarAuth(); cancelarDoc() }
  }, [])

  const valor = useMemo<Sesion>(() => ({
    cargando,
    acceso: resolverAcceso(user?.email ?? null, usuario),
    usuario,
    uid: user?.uid ?? null,
    correo: user?.email ?? null,
    iniciarSesion: async () => {
      const proveedor = new GoogleAuthProvider()
      proveedor.setCustomParameters({ hd: DOMINIO_PERMITIDO })
      await signInWithPopup(auth, proveedor)
    },
    cerrarSesion: () => signOut(auth),
  }), [cargando, user, usuario])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): Sesion {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useSesion requiere AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Guardia de acceso**

Create `src/presentation/auth/RequireAcceso.tsx`:
```tsx
'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { puede, type Accion, type EstadoAcceso } from '@/domain/permisos'
import { useSesion } from './AuthProvider'

const MENSAJES: Record<Exclude<EstadoAcceso, 'sin_sesion' | 'autorizado'>, string> = {
  dominio_no_permitido: 'Solo se permiten cuentas del dominio de la empresa.',
  sin_registro: 'Estamos registrando tu cuenta, un momento.',
  pendiente: 'Tu cuenta está pendiente de autorización. Pide a un administrador que te asigne un rol.',
  inactivo: 'Tu cuenta está desactivada. Contacta a un administrador.',
}

export function RequireAcceso({ accion, children }: { accion: Accion; children: ReactNode }) {
  const { cargando, acceso, usuario, correo, cerrarSesion } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && acceso === 'sin_sesion') router.replace('/login')
  }, [cargando, acceso, router])

  if (cargando) return <p role="status">Cargando...</p>
  if (acceso === 'sin_sesion') return null
  if (acceso !== 'autorizado') {
    return (
      <div role="alert">
        <p>{MENSAJES[acceso]}</p>
        {correo && <p>Sesión: {correo}</p>}
        <button type="button" onClick={() => void cerrarSesion()}>Cerrar sesión</button>
      </div>
    )
  }
  if (!puede(usuario, accion)) return <p role="alert">No tienes permiso para ver esta sección.</p>
  return <>{children}</>
}
```

- [ ] **Step 4: Login y layout raíz**

Create `src/app/login/page.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSesion } from '@/presentation/auth/AuthProvider'

export default function LoginPage() {
  const { cargando, acceso, iniciarSesion } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && acceso !== 'sin_sesion') router.replace('/')
  }, [cargando, acceso, router])

  return (
    <main>
      <h1>Seguridad e Higiene</h1>
      <button type="button" onClick={() => void iniciarSesion()}>Iniciar sesión con Google</button>
    </main>
  )
}
```

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/presentation/auth/AuthProvider'

export const metadata: Metadata = {
  title: 'Seguridad e Higiene',
  description: 'Captura y seguimiento de seguridad e higiene por ciudad',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

Delete `src/app/page.tsx`.

- [ ] **Step 5: Verificar y commit**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

```bash
git add -A
git commit -m "feat(auth): sesión con Google, registro sin_rol y guardia de acceso" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Definición de módulos, validación y capa de datos

**Files:**
- Create: `src/domain/modulos.ts`, `src/infrastructure/firestore/conversion.ts`, `src/infrastructure/firestore/repositorio.ts`
- Test: `src/domain/modulos.test.ts`, `src/infrastructure/firestore/conversion.test.ts`

**Interfaces:**
- Consumes: `periodoDe`, `formatearFecha` de `fechas.ts`; `db` de `cliente.ts`.
- Produces:
  - Tipos: `Valor`, `Valores`, `TipoCampo`, `OrigenOpciones`, `Opcion`, `CampoDef`, `ContextoModulo`, `ModuloDef`
  - `validarRegistro(def: ModuloDef, valores: Valores): Record<string, string>`
  - `formatearValor(campo: CampoDef, valor: Valor | undefined, opciones?: Opcion[]): string`
  - `derivarCiudad(v: Valores, ctx: ContextoModulo): Valores`, `derivarPeriodo(v: Valores, campoFecha: string): Valores`
  - `aFirestore(valores): Record<string, unknown>`, `deFirestore(data): Record<string, unknown>`, `conAuditoria(datos, uid, esNuevo, marca?)`
  - `type Registro = { id: string } & Record<string, unknown>`
  - `suscribir(coleccion: string, alCambiar: (r: Registro[]) => void, alError?: (e: Error) => void): () => void`
  - `guardar(coleccion: string, valores: Valores, uid: string, id?: string): Promise<string>`

- [ ] **Step 1: Pruebas de módulos que fallan**

Create `src/domain/modulos.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import {
  derivarCiudad, derivarPeriodo, formatearValor, validarRegistro,
  type CampoDef, type ModuloDef,
} from './modulos'

const def: ModuloDef = {
  id: 'x', coleccion: 'x', titulo: 'X', columnas: [],
  campos: [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano', requerido: true },
    { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'texto', patron: /^\d{4}-\d{2}$/, mensajePatron: 'Formato AAAA-MM' },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: [{ valor: 'a', etiqueta: 'A' }] },
  ],
}

describe('validarRegistro', () => {
  it('marca obligatorios vacíos, pero no booleanos en false', () => {
    const e = validarRegistro(def, { nombre: '', cantidad: null, activo: false })
    expect(e).toEqual({ nombre: 'Obligatorio', cantidad: 'Obligatorio' })
  })
  it('valida números, fechas, patrón y opciones', () => {
    const e = validarRegistro(def, {
      nombre: 'a', cantidad: -1, activo: true, fecha: new Date('x'), periodo: '2026', tipo: 'z',
    })
    expect(e).toEqual({
      cantidad: 'Número inválido', fecha: 'Fecha inválida', periodo: 'Formato AAAA-MM', tipo: 'Opción inválida',
    })
  })
  it('acepta un registro correcto', () => {
    const v = { nombre: 'a', cantidad: 0, activo: true, fecha: fechaCalendario(2026, 8, 1), periodo: '2026-08', tipo: 'a' }
    expect(validarRegistro(def, v)).toEqual({})
  })
})

describe('formatearValor', () => {
  const campo = (tipo: CampoDef['tipo']): CampoDef => ({ nombre: 'c', etiqueta: 'C', tipo })
  it('formatea por tipo', () => {
    expect(formatearValor(campo('fecha'), fechaCalendario(2026, 8, 31))).toBe('31/08/2026')
    expect(formatearValor(campo('booleano'), true)).toBe('Sí')
    expect(formatearValor(campo('booleano'), false)).toBe('No')
    expect(formatearValor(campo('seleccion'), 'a', [{ valor: 'a', etiqueta: 'Alfa' }])).toBe('Alfa')
    expect(formatearValor(campo('seleccion'), 'zz')).toBe('zz')
    expect(formatearValor(campo('texto'), null)).toBe('-')
  })
})

describe('derivaciones', () => {
  it('toma la ciudad del colaborador', () => {
    const ctx = { ciudadDeColaborador: (id: string) => (id === 'c1' ? 'ciudad-b' : null) }
    expect(derivarCiudad({ colaborador_id: 'c1' }, ctx).ciudad).toBe('ciudad-b')
    expect(derivarCiudad({ colaborador_id: 'x' }, ctx).ciudad).toBeNull()
  })
  it('calcula el periodo desde una fecha', () => {
    expect(derivarPeriodo({ fecha: fechaCalendario(2026, 8, 24) }, 'fecha').periodo).toBe('2026-08')
    expect(derivarPeriodo({ fecha: null }, 'fecha').periodo).toBeNull()
  })
})
```

- [ ] **Step 2: Pruebas de conversión que fallan**

Create `src/infrastructure/firestore/conversion.test.ts`:
```ts
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { aFirestore, conAuditoria, deFirestore } from './conversion'

describe('conversión', () => {
  it('convierte Date a Timestamp y de vuelta', () => {
    const fecha = new Date('2026-08-31T12:00:00.000Z')
    const escrito = aFirestore({ fecha, nombre: 'a', vacio: undefined as never })
    expect(escrito.fecha).toBeInstanceOf(Timestamp)
    expect(escrito.vacio).toBeNull()
    expect((deFirestore(escrito).fecha as Date).toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })
  it('agrega auditoría de alta o de edición', () => {
    const marca = { marca: true }
    expect(conAuditoria({ a: 1 }, 'u1', true, marca)).toEqual({
      a: 1, creado_por: 'u1', creado_en: marca, actualizado_por: 'u1', actualizado_en: marca,
    })
    expect(conAuditoria({ a: 1 }, 'u1', false, marca)).toEqual({
      a: 1, actualizado_por: 'u1', actualizado_en: marca,
    })
  })
})
```

- [ ] **Step 3: Ver que fallan**

Run: `pnpm vitest run src/domain/modulos.test.ts src/infrastructure/firestore/conversion.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 4: Implementar el dominio de módulos**

Create `src/domain/modulos.ts`:
```ts
import { formatearFecha, periodoDe } from './fechas'

export type Valor = string | number | boolean | Date | null
export type Valores = Record<string, Valor>
export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'booleano' | 'seleccion'
export type OrigenOpciones = { tipo: 'catalogo'; id: string } | { tipo: 'colaboradores' }
export interface Opcion { valor: string; etiqueta: string }

export interface CampoDef {
  nombre: string
  etiqueta: string
  tipo: TipoCampo
  requerido?: boolean
  origen?: OrigenOpciones
  opciones?: Opcion[]
  patron?: RegExp
  mensajePatron?: string
}

export interface ContextoModulo { ciudadDeColaborador(id: string): string | null }

export interface ModuloDef {
  id: string
  coleccion: string
  titulo: string
  campos: CampoDef[]
  columnas: string[]
  inicial?: Valores
  derivar?: (valores: Valores, ctx: ContextoModulo, hoy: Date) => Valores
  idFijo?: (valores: Valores) => string
  bloquearEnEdicion?: string[]
}

export function validarRegistro(def: ModuloDef, valores: Valores): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const c of def.campos) {
    const v = valores[c.nombre]
    const vacio = v === null || v === undefined || v === ''
    if (vacio) {
      if (c.requerido && c.tipo !== 'booleano') errores[c.nombre] = 'Obligatorio'
      continue
    }
    if (c.tipo === 'numero' && !(typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
      errores[c.nombre] = 'Número inválido'
    } else if (c.tipo === 'fecha' && !(v instanceof Date && !Number.isNaN(v.getTime()))) {
      errores[c.nombre] = 'Fecha inválida'
    } else if (c.tipo === 'seleccion' && c.opciones && !c.opciones.some((o) => o.valor === v)) {
      errores[c.nombre] = 'Opción inválida'
    } else if (c.patron && !(typeof v === 'string' && c.patron.test(v))) {
      errores[c.nombre] = c.mensajePatron ?? 'Formato inválido'
    }
  }
  return errores
}

export function formatearValor(campo: CampoDef, valor: Valor | undefined, opciones: Opcion[] = []): string {
  if (valor === null || valor === undefined || valor === '') return '-'
  switch (campo.tipo) {
    case 'fecha': return valor instanceof Date ? formatearFecha(valor) : '-'
    case 'booleano': return valor ? 'Sí' : 'No'
    case 'seleccion': return opciones.find((o) => o.valor === valor)?.etiqueta ?? String(valor)
    default: return String(valor)
  }
}

export function derivarCiudad(v: Valores, ctx: ContextoModulo): Valores {
  const id = v.colaborador_id
  return { ...v, ciudad: typeof id === 'string' ? ctx.ciudadDeColaborador(id) : null }
}

export function derivarPeriodo(v: Valores, campoFecha: string): Valores {
  const f = v[campoFecha]
  return { ...v, periodo: f instanceof Date ? periodoDe(f) : null }
}
```

- [ ] **Step 5: Implementar conversión y repositorio**

Create `src/infrastructure/firestore/conversion.ts`:
```ts
import { serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore'
import type { Valores } from '@/domain/modulos'

export function aFirestore(valores: Valores): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(valores)) {
    if (v === undefined) salida[k] = null
    else salida[k] = v instanceof Date ? Timestamp.fromDate(v) : v
  }
  return salida
}

export function deFirestore(data: DocumentData): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    salida[k] = v instanceof Timestamp ? v.toDate() : v
  }
  return salida
}

export function conAuditoria(
  datos: Record<string, unknown>, uid: string, esNuevo: boolean, marca: unknown = serverTimestamp(),
): Record<string, unknown> {
  const base = { ...datos, actualizado_por: uid, actualizado_en: marca }
  return esNuevo ? { ...base, creado_por: uid, creado_en: marca } : base
}
```

Create `src/infrastructure/firestore/repositorio.ts`:
```ts
import { addDoc, collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import type { Valores } from '@/domain/modulos'
import { aFirestore, conAuditoria, deFirestore } from './conversion'

export type Registro = { id: string } & Record<string, unknown>

export function suscribir(
  coleccion: string,
  alCambiar: (registros: Registro[]) => void,
  alError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, coleccion),
    (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...deFirestore(d.data()) }))),
    alError,
  )
}

export async function guardar(coleccion: string, valores: Valores, uid: string, id?: string): Promise<string> {
  const datos = aFirestore(valores)
  if (!id) {
    const ref = await addDoc(collection(db, coleccion), conAuditoria(datos, uid, true))
    return ref.id
  }
  const ref = doc(db, coleccion, id)
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria(datos, uid, !existe), { merge: true })
  return id
}
```

- [ ] **Step 6: Ver que pasan y commit**

Run: `pnpm vitest run src/domain/modulos.test.ts src/infrastructure/firestore/conversion.test.ts && pnpm typecheck`
Expected: PASS y sin errores de tipos.

```bash
git add src/domain/modulos.ts src/domain/modulos.test.ts src/infrastructure/firestore
git commit -m "feat: definición de módulos, validación y repositorio de Firestore" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Catálogos iniciales, slug y valores de configuración

**Files:**
- Create: `src/domain/slug.ts`, `src/domain/catalogos-iniciales.ts`, `src/infrastructure/firestore/catalogos.ts`
- Test: `src/domain/slug.test.ts`, `src/domain/catalogos-iniciales.test.ts`

**Interfaces:**
- Consumes: `db` de `cliente.ts`, `CONFIG_INDICADORES_INICIAL`.
- Produces:
  - `slug(texto: string): string`
  - `interface ItemCatalogo { valor: string; etiqueta: string }`
  - `PRENDAS: readonly string[]`, `TIPOS_EPP: readonly string[]`
  - `CATALOGOS_INICIALES: Record<string, ItemCatalogo[]>` con las claves `ciudades`, `areas`, `lineas_negocio`, `normas`, `tipos_epp`, `prendas`, `tipos_accidente`, `tipos_equipo`, `cuadrillas`
  - `unirItems(existentes: ItemCatalogo[], nuevos: ItemCatalogo[]): ItemCatalogo[]`
  - `sembrarValoresIniciales(uid: string): Promise<void>` (crea o completa catálogos y crea `configuracion/indicadores` si falta)
  - `guardarCatalogo(id: string, items: ItemCatalogo[], uid: string): Promise<void>`

- [ ] **Step 1: Pruebas que fallan**

Create `src/domain/slug.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { slug } from './slug'

describe('slug', () => {
  it.each([
    ['Ciudad G', 'ciudad-g'],
    ['Ciudad B-Area Uno', 'ciudad-b-area-uno'],
    ['Ciudad H', 'ciudad-h'],
    ['  CUA001 ', 'cua001'],
    ['Línea de vida de doble punto', 'linea-de-vida-de-doble-punto'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(slug(entrada)).toBe(esperado)
  })
})
```

Create `src/domain/catalogos-iniciales.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CATALOGOS_INICIALES, PRENDAS, TIPOS_EPP, unirItems } from './catalogos-iniciales'

describe('catálogos iniciales', () => {
  it('cubre las 13 ciudades y las 4 áreas de Ciudad B', () => {
    expect(CATALOGOS_INICIALES.ciudades).toHaveLength(13)
    expect(CATALOGOS_INICIALES.areas.map((a) => a.valor)).toEqual(['area-uno', 'area-dos', 'area-tres', 'area-cuatro'])
  })
  it('deriva prendas y EPP de las constantes', () => {
    expect(CATALOGOS_INICIALES.prendas.map((i) => i.valor)).toEqual([...PRENDAS])
    expect(CATALOGOS_INICIALES.tipos_epp.map((i) => i.valor)).toEqual([...TIPOS_EPP])
  })
  it('une sin duplicar y conserva lo existente', () => {
    const r = unirItems(
      [{ valor: 'a', etiqueta: 'Alfa editada' }],
      [{ valor: 'a', etiqueta: 'Alfa' }, { valor: 'b', etiqueta: 'Beta' }],
    )
    expect(r).toEqual([{ valor: 'a', etiqueta: 'Alfa editada' }, { valor: 'b', etiqueta: 'Beta' }])
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/domain/slug.test.ts src/domain/catalogos-iniciales.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar el dominio**

Create `src/domain/slug.ts`:
```ts
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

Create `src/domain/catalogos-iniciales.ts`:
```ts
export interface ItemCatalogo { valor: string; etiqueta: string }

export const PRENDAS = ['botas', 'playera', 'camisola', 'pantalon'] as const
export const TIPOS_EPP = [
  'guantes', 'lentes', 'casco',
  'linea-vida-doble-punto', 'arnes-cuerpo-completo', 'linea-posicionamiento',
] as const

const ETIQUETAS: Record<string, string> = {
  pantalon: 'Pantalón',
  'linea-vida-doble-punto': 'Línea de vida de doble punto',
  'arnes-cuerpo-completo': 'Arnés de cuerpo completo',
  'linea-posicionamiento': 'Línea de posicionamiento',
}

const desdeValores = (valores: readonly string[]): ItemCatalogo[] =>
  valores.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS[valor] ?? valor.charAt(0).toUpperCase() + valor.slice(1),
  }))

export const CATALOGOS_INICIALES: Record<string, ItemCatalogo[]> = {
  ciudades: [
    { valor: 'ciudad-a', etiqueta: 'Ciudad A' },
    { valor: 'ciudad-c', etiqueta: 'Ciudad C' },
    { valor: 'ciudad-e', etiqueta: 'Ciudad E' },
    { valor: 'ciudad-f', etiqueta: 'Ciudad F' },
    { valor: 'ciudad-g', etiqueta: 'Ciudad G' },
    { valor: 'ciudad-d', etiqueta: 'Ciudad D' },
    { valor: 'ciudad-h', etiqueta: 'Ciudad H' },
    { valor: 'ciudad-i', etiqueta: 'Ciudad I' },
    { valor: 'ciudad-j', etiqueta: 'Ciudad J' },
    { valor: 'ciudad-k', etiqueta: 'Ciudad K' },
    { valor: 'ciudad-l', etiqueta: 'Ciudad L' },
    { valor: 'ciudad-m', etiqueta: 'Ciudad M' },
    { valor: 'ciudad-b', etiqueta: 'Ciudad B' },
  ],
  areas: [
    { valor: 'area-uno', etiqueta: 'Area Uno' },
    { valor: 'area-dos', etiqueta: 'Area Dos' },
    { valor: 'area-tres', etiqueta: 'Area Tres' },
    { valor: 'area-cuatro', etiqueta: 'Area Cuatro' },
  ],
  lineas_negocio: [{ valor: 'linea-x', etiqueta: 'LINEA X' }],
  normas: [{ valor: 'norma-001', etiqueta: 'NORMA-001' }],
  tipos_epp: desdeValores(TIPOS_EPP),
  prendas: desdeValores(PRENDAS),
  tipos_accidente: [
    { valor: 'trayecto', etiqueta: 'Trayecto' },
    { valor: 'laboral', etiqueta: 'Laboral' },
  ],
  tipos_equipo: [
    { valor: 'extintor', etiqueta: 'Extintor' },
    { valor: 'botiquin', etiqueta: 'Botiquín' },
    { valor: 'senaletica', etiqueta: 'Señalética' },
  ],
  cuadrillas: [],
}

export function unirItems(existentes: ItemCatalogo[], nuevos: ItemCatalogo[]): ItemCatalogo[] {
  const vistos = new Set(existentes.map((i) => i.valor))
  return [...existentes, ...nuevos.filter((i) => !vistos.has(i.valor))]
}
```

- [ ] **Step 4: Implementar la escritura de catálogos**

Create `src/infrastructure/firestore/catalogos.ts`:
```ts
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { CATALOGOS_INICIALES, unirItems, type ItemCatalogo } from '@/domain/catalogos-iniciales'
import { CONFIG_INDICADORES_INICIAL } from '@/domain/indicadores'
import { conAuditoria } from './conversion'

export async function guardarCatalogo(id: string, items: ItemCatalogo[], uid: string): Promise<void> {
  await setDoc(doc(db, 'catalogos', id), conAuditoria({ items }, uid, false), { merge: true })
}

export async function sembrarValoresIniciales(uid: string): Promise<void> {
  for (const [id, iniciales] of Object.entries(CATALOGOS_INICIALES)) {
    const ref = doc(db, 'catalogos', id)
    const snap = await getDoc(ref)
    const existentes = snap.exists() ? ((snap.data().items ?? []) as ItemCatalogo[]) : []
    await setDoc(ref, conAuditoria({ items: unirItems(existentes, iniciales) }, uid, !snap.exists()), { merge: true })
  }
  const refConfig = doc(db, 'configuracion', 'indicadores')
  if (!(await getDoc(refConfig)).exists()) {
    const c = CONFIG_INDICADORES_INICIAL
    await setDoc(refConfig, conAuditoria({
      horas_por_persona_mes: c.horasPorPersonaMes,
      k_mensual: c.kMensual,
      k_anual: c.kAnual,
      umbral_supera: c.umbralSupera,
      umbral_meta: c.umbralMeta,
      umbral_minimo: c.umbralMinimo,
      referencia_interpretacion: c.referenciaInterpretacion,
    }, uid, true))
  }
}
```

- [ ] **Step 5: Verificar y commit**

Run: `pnpm vitest run src/domain && pnpm typecheck`
Expected: PASS y sin errores de tipos.

```bash
git add src/domain/slug.ts src/domain/slug.test.ts src/domain/catalogos-iniciales.ts src/domain/catalogos-iniciales.test.ts src/infrastructure/firestore/catalogos.ts
git commit -m "feat: catálogos iniciales, slug y siembra de configuración" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Definiciones de los módulos de captura

**Files:**
- Create: `src/domain/modulos-definiciones.ts`
- Test: `src/domain/modulos-definiciones.test.ts`

**Interfaces:**
- Consumes: `ModuloDef`, `derivarCiudad`, `derivarPeriodo`, `estadoCapacitacion`.
- Produces:
  - `MODULOS: Record<string, ModuloDef>` con las claves `colaboradores`, `capacitaciones`, `entregas_uniforme`, `entregas_epp`, `accidentes`, `oficinas_equipo`, `vehiculos`, `indicadores_mensuales`
  - `MODULO_CONFIGURACION: ModuloDef` (documento `configuracion/indicadores`, para la pantalla del admin)

- [ ] **Step 1: Pruebas que fallan**

Create `src/domain/modulos-definiciones.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fechaCalendario } from './fechas'
import { MODULO_CONFIGURACION, MODULOS } from './modulos-definiciones'
import { validarRegistro } from './modulos'

const ctx = { ciudadDeColaborador: (id: string) => (id === 'c1' ? 'ciudad-b' : null) }
const hoy = new Date(2026, 8, 30)

describe('definiciones', () => {
  it('las columnas existen como campos', () => {
    for (const def of [...Object.values(MODULOS), MODULO_CONFIGURACION]) {
      const nombres = def.campos.map((c) => c.nombre)
      for (const col of def.columnas) expect(nombres, `${def.id}.${col}`).toContain(col)
    }
  })

  it('accidentes derivan ciudad y periodo', () => {
    const r = MODULOS.accidentes.derivar!(
      { colaborador_id: 'c1', fecha: fechaCalendario(2026, 8, 24), tipo: 'laboral', dias_incapacidad: 2 }, ctx, hoy)
    expect(r.ciudad).toBe('ciudad-b')
    expect(r.periodo).toBe('2026-08')
  })

  it('capacitaciones derivan ciudad y estado', () => {
    const vencida = MODULOS.capacitaciones.derivar!({
      colaborador_id: 'c1', fecha: fechaCalendario(2025, 5, 4), vencimiento: fechaCalendario(2026, 5, 4),
    }, ctx, hoy)
    expect(vencida.ciudad).toBe('ciudad-b')
    expect(vencida.estado).toBe('vencido')
    expect(MODULOS.capacitaciones.derivar!({ colaborador_id: 'c1', fecha: null }, ctx, hoy).estado).toBe('pendiente')
  })

  it('población mensual usa ID fijo ciudad_periodo y valida el formato', () => {
    const v = { ciudad: 'ciudad-b', periodo: '2026-08', poblacion: 20 }
    expect(MODULOS.indicadores_mensuales.idFijo!(v)).toBe('ciudad-b_2026-08')
    expect(validarRegistro(MODULOS.indicadores_mensuales, { ...v, periodo: '2026-8' }).periodo).toBeDefined()
  })

  it('la configuración usa ID fijo', () => {
    expect(MODULO_CONFIGURACION.idFijo!({})).toBe('indicadores')
  })

  it('colaboradores nace activo', () => {
    expect(MODULOS.colaboradores.inicial).toEqual({ activo: true })
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/domain/modulos-definiciones.test.ts`
Expected: FAIL, no se encuentra `./modulos-definiciones`.

- [ ] **Step 3: Implementar**

Create `src/domain/modulos-definiciones.ts`:
```ts
import { estadoCapacitacion } from './fechas'
import { derivarCiudad, derivarPeriodo, type CampoDef, type ModuloDef } from './modulos'

const catalogo = (id: string) => ({ tipo: 'catalogo', id }) as const
const colaborador: CampoDef = {
  nombre: 'colaborador_id', etiqueta: 'Colaborador', tipo: 'seleccion',
  requerido: true, origen: { tipo: 'colaboradores' },
}

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
    { nombre: 'fecha_recarga', etiqueta: 'Fecha de recarga', tipo: 'fecha' },
    { nombre: 'vencimiento', etiqueta: 'Vencimiento o caducidad', tipo: 'fecha' },
  ],
  columnas: ['ciudad', 'tipo', 'detalle', 'fecha_recarga', 'vencimiento'],
}

const vehiculos: ModuloDef = {
  id: 'vehiculos', coleccion: 'vehiculos', titulo: 'Vehículos',
  campos: [
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', requerido: true, origen: catalogo('ciudades') },
    { nombre: 'placa', etiqueta: 'Placa', tipo: 'texto', requerido: true },
    { nombre: 'extintor_vencimiento', etiqueta: 'Vencimiento del extintor', tipo: 'fecha' },
    { nombre: 'botiquin_caducidad', etiqueta: 'Caducidad del botiquín', tipo: 'fecha' },
  ],
  columnas: ['ciudad', 'placa', 'extintor_vencimiento', 'botiquin_caducidad'],
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
```

- [ ] **Step 4: Ver que pasan y commit**

Run: `pnpm vitest run src/domain/modulos-definiciones.test.ts && pnpm typecheck`
Expected: PASS y sin errores de tipos.

```bash
git add src/domain/modulos-definiciones.ts src/domain/modulos-definiciones.test.ts
git commit -m "feat(domain): definiciones declarativas de los módulos de captura" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Hooks y UI genérica de captura

**Files:**
- Create: `src/presentation/datos/useColeccion.ts`, `useCatalogo.ts`, `useOpciones.ts`, `useConfigIndicadores.ts`, `FormularioModulo.tsx`, `TablaModulo.tsx`, `PaginaModulo.tsx`
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/datos/[modulo]/page.tsx`

**Interfaces:**
- Consumes: `suscribir`, `guardar`, `Registro`; `ModuloDef` y helpers de `modulos.ts`; `MODULOS`; `useSesion`; `RequireAcceso`.
- Produces:
  - `useColeccion(coleccion: string | null): { registros: Registro[]; cargando: boolean; error: string | null }`
  - `useCatalogo(id: string | null): Opcion[]`
  - `useOpciones(campo: CampoDef): Opcion[]`
  - `useConfigIndicadores(): ConfigIndicadores`
  - `<PaginaModulo def={ModuloDef} />`
  - Ruta `/datos/[modulo]` para cada clave de `MODULOS`

- [ ] **Step 1: Hooks de datos**

Create `src/presentation/datos/useColeccion.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { suscribir, type Registro } from '@/infrastructure/firestore/repositorio'

export function useColeccion(coleccion: string | null) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(coleccion !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coleccion) return
    setCargando(true)
    return suscribir(
      coleccion,
      (r) => { setRegistros(r); setCargando(false) },
      (e) => { setError(e.message); setCargando(false) },
    )
  }, [coleccion])

  return { registros, cargando, error }
}
```

Create `src/presentation/datos/useCatalogo.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import type { Opcion } from '@/domain/modulos'

export function useCatalogo(id: string | null): Opcion[] {
  const [items, setItems] = useState<Opcion[]>([])

  useEffect(() => {
    if (!id) return
    return onSnapshot(doc(db, 'catalogos', id), (snap) => {
      const datos = snap.data()
      setItems(((datos?.items ?? []) as { valor: string; etiqueta: string }[]).map(({ valor, etiqueta }) => ({ valor, etiqueta })))
    })
  }, [id])

  return items
}
```

Create `src/presentation/datos/useOpciones.ts`:
```ts
'use client'

import type { CampoDef, Opcion } from '@/domain/modulos'
import { useCatalogo } from './useCatalogo'
import { useColeccion } from './useColeccion'

export function useOpciones(campo: CampoDef): Opcion[] {
  const catalogo = useCatalogo(campo.origen?.tipo === 'catalogo' ? campo.origen.id : null)
  const { registros } = useColeccion(campo.origen?.tipo === 'colaboradores' ? 'colaboradores' : null)

  if (campo.opciones) return campo.opciones
  if (campo.origen?.tipo === 'catalogo') return catalogo
  if (campo.origen?.tipo === 'colaboradores') {
    return registros
      .filter((r) => r.activo !== false)
      .map((r) => ({ valor: r.id, etiqueta: String(r.nombre ?? r.id) }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
  }
  return []
}
```

Create `src/presentation/datos/useConfigIndicadores.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { CONFIG_INDICADORES_INICIAL, configDesdeDoc, type ConfigIndicadores } from '@/domain/indicadores'

export function useConfigIndicadores(): ConfigIndicadores {
  const [cfg, setCfg] = useState<ConfigIndicadores>(CONFIG_INDICADORES_INICIAL)

  useEffect(() => onSnapshot(doc(db, 'configuracion', 'indicadores'), (snap) => {
    setCfg(configDesdeDoc(snap.exists() ? snap.data() : null))
  }), [])

  return cfg
}
```

- [ ] **Step 2: Formulario genérico**

Create `src/presentation/datos/FormularioModulo.tsx`:
```tsx
'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { aTextoIso, deTextoIso } from '@/domain/fechas'
import {
  validarRegistro, type CampoDef, type ContextoModulo, type ModuloDef, type Valor, type Valores,
} from '@/domain/modulos'
import { guardar, type Registro } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useColeccion } from './useColeccion'
import { useOpciones } from './useOpciones'

interface Props {
  def: ModuloDef
  registro?: Registro
  alTerminar: () => void
}

function valoresDe(def: ModuloDef, registro?: Registro): Valores {
  const base: Valores = { ...(def.inicial ?? {}) }
  for (const c of def.campos) {
    if (registro && c.nombre in registro) base[c.nombre] = registro[c.nombre] as Valor
  }
  return base
}

function Entrada({ campo, valor, error, deshabilitado, alCambiar }: {
  campo: CampoDef; valor: Valor | undefined; error?: string; deshabilitado: boolean
  alCambiar: (v: Valor) => void
}) {
  const opciones = useOpciones(campo)
  const id = `campo-${campo.nombre}`
  let control
  if (campo.tipo === 'booleano') {
    control = <input id={id} type="checkbox" checked={valor === true} disabled={deshabilitado}
      onChange={(e) => alCambiar(e.target.checked)} />
  } else if (campo.tipo === 'seleccion') {
    control = (
      <select id={id} value={typeof valor === 'string' ? valor : ''} disabled={deshabilitado}
        onChange={(e) => alCambiar(e.target.value || null)}>
        <option value="">Selecciona</option>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    )
  } else if (campo.tipo === 'fecha') {
    control = <input id={id} type="date" value={valor instanceof Date ? aTextoIso(valor) : ''}
      disabled={deshabilitado} onChange={(e) => alCambiar(deTextoIso(e.target.value))} />
  } else if (campo.tipo === 'numero') {
    control = <input id={id} type="number" min={0} step="any" value={typeof valor === 'number' ? valor : ''}
      disabled={deshabilitado} onChange={(e) => alCambiar(e.target.value === '' ? null : Number(e.target.value))} />
  } else {
    control = <input id={id} type="text" value={typeof valor === 'string' ? valor : ''}
      disabled={deshabilitado} onChange={(e) => alCambiar(e.target.value)} />
  }
  return (
    <div>
      <label htmlFor={id}>{campo.etiqueta}{campo.requerido && ' *'}</label>
      {control}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export function FormularioModulo({ def, registro, alTerminar }: Props) {
  const { uid } = useSesion()
  const { registros: colaboradores } = useColeccion('colaboradores')
  const [valores, setValores] = useState<Valores>(() => valoresDe(def, registro))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const ctx = useMemo<ContextoModulo>(() => ({
    ciudadDeColaborador: (id) => {
      const c = colaboradores.find((x) => x.id === id)
      return typeof c?.ciudad === 'string' ? c.ciudad : null
    },
  }), [colaboradores])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errs = validarRegistro(def, valores)
    setErrores(errs)
    if (Object.keys(errs).length || !uid) return
    setGuardando(true)
    setFallo(null)
    try {
      const final = def.derivar ? def.derivar(valores, ctx, new Date()) : valores
      await guardar(def.coleccion, final, uid, def.idFijo ? def.idFijo(final) : registro?.id)
      alTerminar()
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {def.campos.map((c) => (
        <Entrada key={c.nombre} campo={c} valor={valores[c.nombre]} error={errores[c.nombre]}
          deshabilitado={!!registro && !!def.bloquearEnEdicion?.includes(c.nombre)}
          alCambiar={(v) => setValores((prev) => ({ ...prev, [c.nombre]: v }))} />
      ))}
      {fallo && <p role="alert">{fallo}</p>}
      <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
      <button type="button" onClick={alTerminar}>Cancelar</button>
    </form>
  )
}
```

- [ ] **Step 3: Tabla y página genéricas**

Create `src/presentation/datos/TablaModulo.tsx`:
```tsx
'use client'

import { formatearValor, type CampoDef, type ModuloDef, type Opcion, type Valor } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { useOpciones } from './useOpciones'

function Celda({ campo, valor }: { campo: CampoDef; valor: unknown }) {
  const opciones: Opcion[] = useOpciones(campo)
  return <td>{formatearValor(campo, valor as Valor, opciones)}</td>
}

export function TablaModulo({ def, registros, alSeleccionar }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
}) {
  const campos = def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!)
  return (
    <table>
      <thead>
        <tr>{campos.map((c) => <th key={c.nombre} scope="col">{c.etiqueta}</th>)}</tr>
      </thead>
      <tbody>
        {registros.length === 0 && (
          <tr><td colSpan={campos.length}>Sin registros</td></tr>
        )}
        {registros.map((r) => (
          <tr key={r.id} onClick={alSeleccionar ? () => alSeleccionar(r) : undefined}>
            {campos.map((c) => <Celda key={c.nombre} campo={c} valor={r[c.nombre]} />)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

Create `src/presentation/datos/PaginaModulo.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { puede } from '@/domain/permisos'
import type { ModuloDef } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { FormularioModulo } from './FormularioModulo'
import { TablaModulo } from './TablaModulo'
import { useColeccion } from './useColeccion'

export function PaginaModulo({ def }: { def: ModuloDef }) {
  const { usuario } = useSesion()
  const { registros, cargando, error } = useColeccion(def.coleccion)
  const [editando, setEditando] = useState<Registro | 'nuevo' | null>(null)
  const capturista = puede(usuario, 'capturar')

  return (
    <section>
      <h1>{def.titulo}</h1>
      {capturista && editando === null && (
        <button type="button" onClick={() => setEditando('nuevo')}>Nuevo</button>
      )}
      {editando !== null ? (
        <FormularioModulo def={def} registro={editando === 'nuevo' ? undefined : editando}
          alTerminar={() => setEditando(null)} />
      ) : (
        <>
          {error && <p role="alert">{error}</p>}
          {cargando ? <p role="status">Cargando...</p> : (
            <TablaModulo def={def} registros={registros}
              alSeleccionar={capturista ? setEditando : undefined} />
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Rutas**

Create `src/app/(app)/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireAcceso accion="leer">{children}</RequireAcceso>
}
```

Create `src/app/(app)/datos/[modulo]/page.tsx`:
```tsx
'use client'

import { notFound, useParams } from 'next/navigation'
import { MODULOS } from '@/domain/modulos-definiciones'
import { PaginaModulo } from '@/presentation/datos/PaginaModulo'

export default function ModuloPage() {
  const { modulo } = useParams<{ modulo: string }>()
  const def = MODULOS[modulo]
  if (!def) notFound()
  return <PaginaModulo def={def} />
}
```

- [ ] **Step 5: Verificar y commit**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

```bash
git add -A
git commit -m "feat: hooks de datos y UI genérica de captura por módulo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Administración de usuarios, catálogos y configuración

**Files:**
- Create: `src/app/(app)/admin/usuarios/page.tsx`, `src/app/(app)/admin/catalogos/page.tsx`, `src/app/(app)/admin/configuracion/page.tsx`

**Interfaces:**
- Consumes: `useColeccion`, `useCatalogo`, `RequireAcceso`, `sembrarValoresIniciales`, `guardarCatalogo`, `slug`, `MODULO_CONFIGURACION`, `FormularioModulo`, `db`.
- Produces: rutas `/admin/usuarios`, `/admin/catalogos`, `/admin/configuracion` (solo `admin`).

- [ ] **Step 1: Usuarios**

Create `src/app/(app)/admin/usuarios/page.tsx`:
```tsx
'use client'

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import type { Rol } from '@/domain/permisos'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useColeccion } from '@/presentation/datos/useColeccion'

const ROLES: Rol[] = ['sin_rol', 'consulta', 'capturista', 'admin']

function Usuarios() {
  const { uid } = useSesion()
  const { registros, cargando, error } = useColeccion('usuarios')

  const actualizar = (id: string, cambios: { rol?: Rol; activo?: boolean }) =>
    updateDoc(doc(db, 'usuarios', id), { ...cambios, actualizado_por: uid, actualizado_en: serverTimestamp() })

  return (
    <section>
      <h1>Usuarios</h1>
      {error && <p role="alert">{error}</p>}
      {cargando ? <p role="status">Cargando...</p> : (
        <table>
          <thead>
            <tr><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Activo</th></tr>
          </thead>
          <tbody>
            {registros.map((u) => (
              <tr key={u.id}>
                <td>{String(u.email)}</td>
                <td>
                  <select aria-label={`Rol de ${u.email}`} value={String(u.rol)}
                    onChange={(e) => void actualizar(u.id, { rol: e.target.value as Rol })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <input type="checkbox" aria-label={`Activo: ${u.email}`} checked={u.activo === true}
                    onChange={(e) => void actualizar(u.id, { activo: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default function UsuariosPage() {
  return <RequireAcceso accion="administrar"><Usuarios /></RequireAcceso>
}
```

- [ ] **Step 2: Catálogos**

Create `src/app/(app)/admin/catalogos/page.tsx`:
```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { CATALOGOS_INICIALES, unirItems } from '@/domain/catalogos-iniciales'
import { slug } from '@/domain/slug'
import { guardarCatalogo, sembrarValoresIniciales } from '@/infrastructure/firestore/catalogos'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'

const IDS = Object.keys(CATALOGOS_INICIALES)

function Catalogos() {
  const { uid } = useSesion()
  const [id, setId] = useState(IDS[0])
  const [etiqueta, setEtiqueta] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const items = useCatalogo(id)

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const valor = slug(etiqueta)
    if (!valor || !uid) return
    await guardarCatalogo(id, unirItems(items, [{ valor, etiqueta: etiqueta.trim() }]), uid)
    setEtiqueta('')
  }

  async function sembrar() {
    if (!uid) return
    setOcupado(true)
    try { await sembrarValoresIniciales(uid) } finally { setOcupado(false) }
  }

  return (
    <section>
      <h1>Catálogos</h1>
      <button type="button" onClick={() => void sembrar()} disabled={ocupado}>
        Cargar valores iniciales
      </button>
      <label htmlFor="catalogo">Catálogo</label>
      <select id="catalogo" value={id} onChange={(e) => setId(e.target.value)}>
        {IDS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <ul>{items.map((i) => <li key={i.valor}>{i.etiqueta} ({i.valor})</li>)}</ul>
      <form onSubmit={agregar}>
        <label htmlFor="nuevo-item">Nuevo valor</label>
        <input id="nuevo-item" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} />
        <button type="submit">Agregar</button>
      </form>
    </section>
  )
}

export default function CatalogosPage() {
  return <RequireAcceso accion="administrar"><Catalogos /></RequireAcceso>
}
```

- [ ] **Step 3: Configuración**

Create `src/app/(app)/admin/configuracion/page.tsx`:
```tsx
'use client'

import { MODULO_CONFIGURACION } from '@/domain/modulos-definiciones'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { FormularioModulo } from '@/presentation/datos/FormularioModulo'
import { useColeccion } from '@/presentation/datos/useColeccion'

function Configuracion() {
  const { registros, cargando } = useColeccion('configuracion')
  const actual = registros.find((r) => r.id === 'indicadores')
  if (cargando) return <p role="status">Cargando...</p>
  return (
    <section>
      <h1>{MODULO_CONFIGURACION.titulo}</h1>
      <FormularioModulo key={actual ? 'con-datos' : 'vacio'} def={MODULO_CONFIGURACION}
        registro={actual} alTerminar={() => {}} />
    </section>
  )
}

export default function ConfiguracionPage() {
  return <RequireAcceso accion="administrar"><Configuracion /></RequireAcceso>
}
```

- [ ] **Step 4: Verificar y commit**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

```bash
git add -A
git commit -m "feat(admin): gestión de usuarios, catálogos y configuración de indicadores" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Lógica del dashboard (funciones puras)

**Files:**
- Create: `src/domain/entidades.ts`, `src/application/dashboard.ts`
- Test: `src/application/dashboard.test.ts`

**Interfaces:**
- Consumes: `estadoVencimiento`, `diasParaVencer` de `fechas.ts`; `PRENDAS`, `TIPOS_EPP`; `calcularMes`, `calcularAnual`, `clasificarIli`, tipos de `indicadores.ts`.
- Produces:
  - Entidades: `Colaborador`, `Capacitacion`, `EntregaUniforme`, `EntregaEpp`, `Accidente`, `EquipoOficina`, `Vehiculo`, `Poblacion` y `DatosOperativos`
  - `resumenPorCiudad(d: DatosOperativos, hoy: Date): ResumenCiudad[]`
  - `alertasVencimiento(d: DatosOperativos, hoy: Date, dias?: number): Alerta[]`
  - `pendientesPorColaborador(d: DatosOperativos, hoy: Date): Pendiente[]`
  - `serieMensual(accidentes, poblaciones, cfg, anio, ciudad?): PuntoMes[]`
  - `acumuladoAnual(puntos: PuntoMes[], cfg): Indices`
  - `comparativoCiudades(accidentes, poblaciones, cfg, anio, ciudades: string[]): FilaComparativo[]`

- [ ] **Step 1: Entidades**

Create `src/domain/entidades.ts`:
```ts
export interface Colaborador {
  id: string
  nombre: string
  ciudad: string
  area?: string | null
  linea_negocio: string
  cuadrilla?: string | null
  activo: boolean
}

export interface Capacitacion {
  colaborador_id: string
  ciudad: string
  cumple: boolean
  fecha: Date | null
  vencimiento: Date | null
}

export interface EntregaUniforme { colaborador_id: string; prenda: string }

export interface EntregaEpp {
  colaborador_id: string
  tipo: string
  entregado: boolean
  vencimiento: Date | null
}

export interface Accidente {
  ciudad: string
  periodo: string
  tipo: 'trayecto' | 'laboral'
  dias_incapacidad: number
}

export interface EquipoOficina {
  ciudad: string
  tipo: 'extintor' | 'botiquin' | 'senaletica'
  vencimiento: Date | null
}

export interface Vehiculo {
  ciudad: string
  placa: string
  extintor_vencimiento: Date | null
  botiquin_caducidad: Date | null
}

export interface Poblacion { ciudad: string; periodo: string; poblacion: number }

export interface DatosOperativos {
  colaboradores: Colaborador[]
  capacitaciones: Capacitacion[]
  entregasUniforme: EntregaUniforme[]
  entregasEpp: EntregaEpp[]
  equipoOficinas: EquipoOficina[]
  vehiculos: Vehiculo[]
}
```

- [ ] **Step 2: Pruebas que fallan**

Create `src/application/dashboard.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { DatosOperativos } from '@/domain/entidades'
import { fechaCalendario } from '@/domain/fechas'
import { CONFIG_INDICADORES_INICIAL as cfg } from '@/domain/indicadores'
import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'
import {
  acumuladoAnual, alertasVencimiento, comparativoCiudades, pendientesPorColaborador,
  resumenPorCiudad, serieMensual,
} from './dashboard'

const hoy = new Date(2026, 8, 30)

const datos: DatosOperativos = {
  colaboradores: [
    { id: 'c1', nombre: 'Ana', ciudad: 'ciudad-b', linea_negocio: 'linea-x', activo: true },
    { id: 'c2', nombre: 'Beto', ciudad: 'ciudad-b', linea_negocio: 'linea-x', activo: true },
    { id: 'c3', nombre: 'Cami', ciudad: 'ciudad-d', linea_negocio: 'linea-x', activo: false },
  ],
  capacitaciones: [
    { colaborador_id: 'c1', ciudad: 'ciudad-b', cumple: true, fecha: fechaCalendario(2026, 5, 4), vencimiento: fechaCalendario(2027, 5, 4) },
    { colaborador_id: 'c2', ciudad: 'ciudad-b', cumple: true, fecha: fechaCalendario(2025, 5, 4), vencimiento: fechaCalendario(2026, 9, 1) },
  ],
  entregasUniforme: PRENDAS.map((prenda) => ({ colaborador_id: 'c1', prenda })),
  entregasEpp: TIPOS_EPP.map((tipo) => ({ colaborador_id: 'c1', tipo, entregado: true, vencimiento: null })),
  equipoOficinas: [{ ciudad: 'ciudad-b', tipo: 'extintor', vencimiento: fechaCalendario(2026, 10, 15) }],
  vehiculos: [{ ciudad: 'ciudad-b', placa: 'ABC-1', extintor_vencimiento: fechaCalendario(2026, 9, 20), botiquin_caducidad: null }],
}

describe('resumenPorCiudad', () => {
  it('calcula activos y porcentajes solo con colaboradores activos', () => {
    const ciudadB = resumenPorCiudad(datos, hoy).find((r) => r.ciudad === 'ciudad-b')!
    expect(ciudadB.activos).toBe(2)
    expect(ciudadB.pctCapacitacion).toBeCloseTo(0.5)
    expect(ciudadB.pctUniforme).toBeCloseTo(0.5)
    expect(ciudadB.pctEpp).toBeCloseTo(0.5)
  })
  it('omite ciudades sin colaboradores activos', () => {
    expect(resumenPorCiudad(datos, hoy).some((r) => r.ciudad === 'ciudad-d')).toBe(false)
  })
})

describe('pendientesPorColaborador', () => {
  it('lista a quien tiene pendientes', () => {
    const p = pendientesPorColaborador(datos, hoy)
    expect(p).toHaveLength(1)
    expect(p[0].colaborador.id).toBe('c2')
    expect(p[0].capacitacionPendiente).toBe(true)
    expect(p[0].prendasFaltantes).toEqual([...PRENDAS])
    expect(p[0].eppFaltantes).toEqual([...TIPOS_EPP])
  })
})

describe('alertasVencimiento', () => {
  it('incluye vencidos y por vencer, ordenados por días', () => {
    const a = alertasVencimiento(datos, hoy)
    expect(a.map((x) => [x.origen, x.estado, x.dias])).toEqual([
      ['capacitacion', 'vencido', -29],
      ['vehiculo_extintor', 'vencido', -10],
      ['extintor', 'por_vencer', 15],
    ])
    expect(a[0].referencia).toBe('Beto')
    expect(a[1].referencia).toBe('ABC-1')
  })
})

describe('serie e indicadores', () => {
  const accidentes = [
    { ciudad: 'ciudad-b', periodo: '2026-06', tipo: 'laboral' as const, dias_incapacidad: 3 },
    { ciudad: 'ciudad-b', periodo: '2026-08', tipo: 'trayecto' as const, dias_incapacidad: 2 },
    { ciudad: 'ciudad-d', periodo: '2026-08', tipo: 'laboral' as const, dias_incapacidad: 0 },
  ]
  const poblaciones = [
    { ciudad: 'ciudad-b', periodo: '2026-06', poblacion: 10 },
    { ciudad: 'ciudad-b', periodo: '2026-08', poblacion: 20 },
    { ciudad: 'ciudad-d', periodo: '2026-08', poblacion: 10 },
  ]

  it('arma 12 meses y cuenta trayecto y laboral por separado', () => {
    const s = serieMensual(accidentes, poblaciones, cfg, 2026, 'ciudad-b')
    expect(s).toHaveLength(12)
    expect(s[5]).toMatchObject({ periodo: '2026-06', laboral: 1, trayecto: 0, dias: 3, poblacion: 10 })
    expect(s[7]).toMatchObject({ periodo: '2026-08', laboral: 0, trayecto: 1, eventos: 1 })
    expect(s[5].indiceFrecuencia).toBeCloseTo(8.333333333, 6)
    expect(s[0].ili).toBeNull()
  })
  it('sin ciudad consolida todas', () => {
    const s = serieMensual(accidentes, poblaciones, cfg, 2026)
    expect(s[7]).toMatchObject({ eventos: 2, poblacion: 30 })
  })
  it('acumulado anual suma HHT y eventos de los meses', () => {
    const r = acumuladoAnual(serieMensual(accidentes, poblaciones, cfg, 2026, 'ciudad-b'), cfg)
    expect(r.hht).toBe((10 + 20) * 240)
    expect(r.eventos).toBe(2)
    expect(r.dias).toBe(5)
  })
  it('compara ciudades ordenando por ILI descendente y dejando al final las que no tienen dato', () => {
    const r = comparativoCiudades(accidentes, poblaciones, cfg, 2026, ['ciudad-d', 'ciudad-b', 'ciudad-j'])
    expect(r.map((f) => f.ciudad)).toEqual(['ciudad-b', 'ciudad-d', 'ciudad-j'])
    expect(r[2].nivel).toBe('sin_dato')
  })
})
```

- [ ] **Step 3: Ver que fallan**

Run: `pnpm vitest run src/application/dashboard.test.ts`
Expected: FAIL, no se encuentra `./dashboard`.

- [ ] **Step 4: Implementar**

Create `src/application/dashboard.ts`:
```ts
import { PRENDAS, TIPOS_EPP } from '@/domain/catalogos-iniciales'
import type {
  Accidente, Capacitacion, Colaborador, DatosOperativos, Poblacion,
} from '@/domain/entidades'
import { diasParaVencer, estadoVencimiento, DIAS_AVISO_VENCIMIENTO } from '@/domain/fechas'
import {
  calcularAnual, calcularMes, clasificarIli,
  type ConfigIndicadores, type Indices, type NivelIli,
} from '@/domain/indicadores'

function capacitacionVigente(id: string, caps: Capacitacion[], hoy: Date): boolean {
  return caps.some((c) => c.colaborador_id === id && c.cumple && estadoVencimiento(c.vencimiento, hoy) !== 'vencido')
}

function evaluar(c: Colaborador, d: DatosOperativos, hoy: Date) {
  return {
    capacitacionOk: capacitacionVigente(c.id, d.capacitaciones, hoy),
    prendasFaltantes: PRENDAS.filter((p) => !d.entregasUniforme.some((e) => e.colaborador_id === c.id && e.prenda === p)),
    eppFaltantes: TIPOS_EPP.filter((t) => !d.entregasEpp.some((e) => e.colaborador_id === c.id && e.tipo === t && e.entregado)),
  }
}

export interface ResumenCiudad {
  ciudad: string
  activos: number
  pctCapacitacion: number
  pctUniforme: number
  pctEpp: number
}

export function resumenPorCiudad(d: DatosOperativos, hoy: Date): ResumenCiudad[] {
  const ciudades = [...new Set(d.colaboradores.filter((c) => c.activo).map((c) => c.ciudad))]
  return ciudades.sort().map((ciudad) => {
    const activos = d.colaboradores.filter((c) => c.activo && c.ciudad === ciudad)
    const evaluados = activos.map((c) => evaluar(c, d, hoy))
    const pct = (n: number) => n / activos.length
    return {
      ciudad,
      activos: activos.length,
      pctCapacitacion: pct(evaluados.filter((e) => e.capacitacionOk).length),
      pctUniforme: pct(evaluados.filter((e) => e.prendasFaltantes.length === 0).length),
      pctEpp: pct(evaluados.filter((e) => e.eppFaltantes.length === 0).length),
    }
  })
}

export interface Pendiente {
  colaborador: Colaborador
  capacitacionPendiente: boolean
  prendasFaltantes: string[]
  eppFaltantes: string[]
}

export function pendientesPorColaborador(d: DatosOperativos, hoy: Date): Pendiente[] {
  return d.colaboradores
    .filter((c) => c.activo)
    .map((colaborador) => {
      const e = evaluar(colaborador, d, hoy)
      return {
        colaborador,
        capacitacionPendiente: !e.capacitacionOk,
        prendasFaltantes: [...e.prendasFaltantes],
        eppFaltantes: [...e.eppFaltantes],
      }
    })
    .filter((p) => p.capacitacionPendiente || p.prendasFaltantes.length > 0 || p.eppFaltantes.length > 0)
}

export type OrigenAlerta =
  | 'capacitacion' | 'epp' | 'extintor' | 'botiquin' | 'vehiculo_extintor' | 'vehiculo_botiquin'

export interface Alerta {
  origen: OrigenAlerta
  ciudad: string
  referencia: string
  vencimiento: Date
  dias: number
  estado: 'vencido' | 'por_vencer'
}

export function alertasVencimiento(d: DatosOperativos, hoy: Date, dias = DIAS_AVISO_VENCIMIENTO): Alerta[] {
  const alertas: Alerta[] = []
  const nombre = (id: string) => d.colaboradores.find((c) => c.id === id)?.nombre ?? id
  const agregar = (origen: OrigenAlerta, ciudad: string, referencia: string, vencimiento: Date | null) => {
    const estado = estadoVencimiento(vencimiento, hoy, dias)
    if (!vencimiento || (estado !== 'vencido' && estado !== 'por_vencer')) return
    alertas.push({ origen, ciudad, referencia, vencimiento, dias: diasParaVencer(vencimiento, hoy), estado })
  }
  for (const c of d.capacitaciones) agregar('capacitacion', c.ciudad, nombre(c.colaborador_id), c.vencimiento)
  for (const e of d.entregasEpp) {
    if (e.entregado) agregar('epp', d.colaboradores.find((c) => c.id === e.colaborador_id)?.ciudad ?? '', nombre(e.colaborador_id), e.vencimiento)
  }
  for (const o of d.equipoOficinas) {
    if (o.tipo === 'extintor' || o.tipo === 'botiquin') agregar(o.tipo, o.ciudad, o.tipo === 'extintor' ? 'Extintor' : 'Botiquín', o.vencimiento)
  }
  for (const v of d.vehiculos) {
    agregar('vehiculo_extintor', v.ciudad, v.placa, v.extintor_vencimiento)
    agregar('vehiculo_botiquin', v.ciudad, v.placa, v.botiquin_caducidad)
  }
  return alertas.sort((a, b) => a.dias - b.dias)
}

export interface PuntoMes extends Indices {
  periodo: string
  trayecto: number
  laboral: number
  poblacion: number
}

export function serieMensual(
  accidentes: Accidente[], poblaciones: Poblacion[], cfg: ConfigIndicadores, anio: number, ciudad?: string,
): PuntoMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const periodo = `${anio}-${String(i + 1).padStart(2, '0')}`
    const delMes = accidentes.filter((a) => a.periodo === periodo && (!ciudad || a.ciudad === ciudad))
    const trayecto = delMes.filter((a) => a.tipo === 'trayecto').length
    const laboral = delMes.filter((a) => a.tipo === 'laboral').length
    const dias = delMes.reduce((s, a) => s + a.dias_incapacidad, 0)
    const poblacion = poblaciones
      .filter((p) => p.periodo === periodo && (!ciudad || p.ciudad === ciudad))
      .reduce((s, p) => s + p.poblacion, 0)
    return { periodo, trayecto, laboral, poblacion, ...calcularMes({ poblacion, eventos: trayecto + laboral, dias }, cfg) }
  })
}

export function acumuladoAnual(puntos: PuntoMes[], cfg: ConfigIndicadores): Indices {
  return calcularAnual(puntos.map((p) => ({ poblacion: p.poblacion, eventos: p.eventos, dias: p.dias })), cfg)
}

export interface FilaComparativo { ciudad: string; indices: Indices; nivel: NivelIli }

export function comparativoCiudades(
  accidentes: Accidente[], poblaciones: Poblacion[], cfg: ConfigIndicadores, anio: number, ciudades: string[],
): FilaComparativo[] {
  return ciudades
    .map((ciudad) => {
      const indices = acumuladoAnual(serieMensual(accidentes, poblaciones, cfg, anio, ciudad), cfg)
      return { ciudad, indices, nivel: clasificarIli(indices.ili, cfg) }
    })
    .sort((a, b) => (b.indices.ili ?? -1) - (a.indices.ili ?? -1))
}
```

- [ ] **Step 5: Ver que pasan y commit**

Run: `pnpm vitest run src/application/dashboard.test.ts && pnpm typecheck`
Expected: PASS y sin errores de tipos.

```bash
git add src/domain/entidades.ts src/application
git commit -m "feat(application): resumen, alertas, pendientes y series de indicadores" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Sistema visual y estructura de navegación

**Files:**
- Modify: `src/app/globals.css`, `tailwind.config.ts`, `src/app/login/page.tsx`, `src/app/(app)/layout.tsx`, `src/presentation/auth/RequireAcceso.tsx`, `src/presentation/datos/*.tsx` (solo estilos y marcado)
- Create: `src/presentation/navegacion/AppShell.tsx`

**Interfaces:**
- Consumes: `useSesion`, `puede`, `MODULOS`.
- Produces: `<AppShell>{children}</AppShell>` con navegación por rol. Enlaces: Operativo (`/`), Analítico (`/analitico`), un enlace por cada `MODULOS[id].titulo` (`/datos/{id}`), y para admin: Usuarios, Catálogos, Configuración (`/admin/...`). Tokens de color, tipografía y espaciado como variables CSS reutilizables por las Tasks 14 y 15, incluidos los colores de los niveles del ILI (`supera`, `meta`, `minimo`, `fuera_de_meta`, `sin_dato`) y de las series trayecto y laboral.

- [ ] **Step 1: Invocar el skill de diseño**

Invocar el skill `frontend-design` con este brief:
- App interna de seguridad e higiene para una empresa de servicios. Usuarios: un capturista que pasa mucho tiempo en formularios y tablas, y gerentes que consultan el dashboard.
- Tono: sobrio, claro, legible. Prioridad a la densidad de información y a la lectura de estados (vigente, por vencer, vencido, niveles de ILI). Evitar el aspecto genérico de plantilla.
- Todo en español. Sin emojis: iconos como SVG. Tema claro y oscuro si el costo es bajo.
- Entregar: tokens en `globals.css`, `AppShell` (barra lateral en escritorio, menú colapsable en teléfono, nombre y correo del usuario, botón de cerrar sesión), y el restilizado de login, tablas, formularios, mensajes de acceso y estados de carga o error de los componentes de `src/presentation/datos` y `RequireAcceso` sin cambiar sus props ni su lógica.

- [ ] **Step 2: Integrar el shell**

Modificar `src/app/(app)/layout.tsx` para envolver `children` con `<AppShell>` dentro de `RequireAcceso accion="leer"`. La navegación oculta los enlaces de administración a quien no tenga `puede(usuario, 'administrar')` y los de captura a `consulta` solo si la ruta exige captura; los enlaces de `/datos/*` los ve todo rol que pueda leer (la tabla ya oculta "Nuevo" y la edición sin permiso de captura).

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sin errores; las pruebas anteriores siguen en PASS.

Pedirle al usuario que levante `pnpm dev` y revise a 360 px y a 1280 px de ancho: login, un módulo con tabla y formulario, y el menú móvil. No arrancar el servidor sin que lo pida.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): sistema visual, navegación por rol y estilos base" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Dashboard operativo

**Files:**
- Create: `src/presentation/dashboard/useDatosOperativos.ts`, `src/presentation/dashboard/DashboardOperativo.tsx`, `src/app/(app)/page.tsx`
- Modify: (estilos) usando los tokens de la Task 13

**Interfaces:**
- Consumes: `useColeccion`, `resumenPorCiudad`, `alertasVencimiento`, `pendientesPorColaborador`, `DatosOperativos`, `formatearFecha`, `CATALOGOS_INICIALES` (solo para etiquetas de ciudad vía `useCatalogo('ciudades')`).
- Produces:
  - `useDatosOperativos(): { cargando: boolean; error: string | null; datos: DatosOperativos }`
  - Ruta `/` con tarjetas por ciudad, alertas de los próximos 30 días y tabla de pendientes filtrable por ciudad, área y cuadrilla.

- [ ] **Step 1: Hook de datos**

Create `src/presentation/dashboard/useDatosOperativos.ts`:
```ts
'use client'

import { useMemo } from 'react'
import type { DatosOperativos } from '@/domain/entidades'
import { useColeccion } from '@/presentation/datos/useColeccion'

export function useDatosOperativos() {
  const colaboradores = useColeccion('colaboradores')
  const capacitaciones = useColeccion('capacitaciones')
  const entregasUniforme = useColeccion('entregas_uniforme')
  const entregasEpp = useColeccion('entregas_epp')
  const equipoOficinas = useColeccion('oficinas_equipo')
  const vehiculos = useColeccion('vehiculos')
  const fuentes = [colaboradores, capacitaciones, entregasUniforme, entregasEpp, equipoOficinas, vehiculos]

  const datos = useMemo<DatosOperativos>(() => ({
    colaboradores: colaboradores.registros as unknown as DatosOperativos['colaboradores'],
    capacitaciones: capacitaciones.registros as unknown as DatosOperativos['capacitaciones'],
    entregasUniforme: entregasUniforme.registros as unknown as DatosOperativos['entregasUniforme'],
    entregasEpp: entregasEpp.registros as unknown as DatosOperativos['entregasEpp'],
    equipoOficinas: equipoOficinas.registros as unknown as DatosOperativos['equipoOficinas'],
    vehiculos: vehiculos.registros as unknown as DatosOperativos['vehiculos'],
  }), [colaboradores.registros, capacitaciones.registros, entregasUniforme.registros,
    entregasEpp.registros, equipoOficinas.registros, vehiculos.registros])

  return {
    cargando: fuentes.some((f) => f.cargando),
    error: fuentes.find((f) => f.error)?.error ?? null,
    datos,
  }
}
```

- [ ] **Step 2: Componente y ruta**

Create `src/presentation/dashboard/DashboardOperativo.tsx`:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { alertasVencimiento, pendientesPorColaborador, resumenPorCiudad } from '@/application/dashboard'
import { formatearFecha } from '@/domain/fechas'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useDatosOperativos } from './useDatosOperativos'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function DashboardOperativo() {
  const { cargando, error, datos } = useDatosOperativos()
  const ciudades = useCatalogo('ciudades')
  const [filtroCiudad, setFiltroCiudad] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('')
  const etiqueta = (valor: string) => ciudades.find((c) => c.valor === valor)?.etiqueta ?? valor
  const hoy = useMemo(() => new Date(), [])

  const resumen = useMemo(() => resumenPorCiudad(datos, hoy), [datos, hoy])
  const alertas = useMemo(() => alertasVencimiento(datos, hoy), [datos, hoy])
  const pendientes = useMemo(
    () => pendientesPorColaborador(datos, hoy).filter((p) =>
      (!filtroCiudad || p.colaborador.ciudad === filtroCiudad)
      && (!filtroArea || p.colaborador.area === filtroArea)
      && (!filtroCuadrilla || p.colaborador.cuadrilla === filtroCuadrilla)),
    [datos, hoy, filtroCiudad, filtroArea, filtroCuadrilla],
  )
  const areas = [...new Set(datos.colaboradores.map((c) => c.area).filter(Boolean))] as string[]
  const cuadrillas = [...new Set(datos.colaboradores.map((c) => c.cuadrilla).filter(Boolean))] as string[]

  if (cargando) return <p role="status">Cargando...</p>
  if (error) return <p role="alert">{error}</p>

  return (
    <section>
      <h1>Estado operativo</h1>

      <h2>Cumplimiento por ciudad</h2>
      <ul>
        {resumen.map((r) => (
          <li key={r.ciudad}>
            <h3>{etiqueta(r.ciudad)}</h3>
            <p>Colaboradores activos: {r.activos}</p>
            <p>Capacitación vigente: {pct(r.pctCapacitacion)}</p>
            <p>Uniforme completo: {pct(r.pctUniforme)}</p>
            <p>EPP completo: {pct(r.pctEpp)}</p>
          </li>
        ))}
      </ul>

      <h2>Vencimientos en los próximos 30 días</h2>
      {alertas.length === 0 ? <p>Sin vencimientos próximos.</p> : (
        <table>
          <thead>
            <tr><th scope="col">Estado</th><th scope="col">Origen</th><th scope="col">Referencia</th>
              <th scope="col">Ciudad</th><th scope="col">Vencimiento</th><th scope="col">Días</th></tr>
          </thead>
          <tbody>
            {alertas.map((a, i) => (
              <tr key={`${a.origen}-${a.referencia}-${i}`} data-estado={a.estado}>
                <td>{a.estado === 'vencido' ? 'Vencido' : 'Por vencer'}</td>
                <td>{a.origen.replace('_', ' ')}</td>
                <td>{a.referencia}</td>
                <td>{etiqueta(a.ciudad)}</td>
                <td>{formatearFecha(a.vencimiento)}</td>
                <td>{a.dias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Colaboradores con pendientes</h2>
      <div>
        <label htmlFor="f-ciudad">Ciudad</label>
        <select id="f-ciudad" value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
          <option value="">Todas</option>
          {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
        </select>
        <label htmlFor="f-area">Área</label>
        <select id="f-area" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label htmlFor="f-cuadrilla">Cuadrilla</label>
        <select id="f-cuadrilla" value={filtroCuadrilla} onChange={(e) => setFiltroCuadrilla(e.target.value)}>
          <option value="">Todas</option>
          {cuadrillas.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <table>
        <thead>
          <tr><th scope="col">Colaborador</th><th scope="col">Ciudad</th><th scope="col">Capacitación</th>
            <th scope="col">Uniforme faltante</th><th scope="col">EPP faltante</th></tr>
        </thead>
        <tbody>
          {pendientes.length === 0 && <tr><td colSpan={5}>Sin pendientes.</td></tr>}
          {pendientes.map((p) => (
            <tr key={p.colaborador.id}>
              <td>{p.colaborador.nombre}</td>
              <td>{etiqueta(p.colaborador.ciudad)}</td>
              <td>{p.capacitacionPendiente ? 'Pendiente' : 'Vigente'}</td>
              <td>{p.prendasFaltantes.join(', ') || '-'}</td>
              <td>{p.eppFaltantes.join(', ') || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

Create `src/app/(app)/page.tsx`:
```tsx
import { DashboardOperativo } from '@/presentation/dashboard/DashboardOperativo'

export default function InicioPage() {
  return <DashboardOperativo />
}
```

- [ ] **Step 3: Estilos con el skill de diseño**

Invocar `frontend-design` para dar estilo a este componente con los tokens de la Task 13: tarjetas por ciudad legibles a 360 px, filas de alertas con color según `data-estado` (además del texto, nunca solo color), filtros que se apilan en teléfono y tabla con desplazamiento horizontal contenido. Sin cambiar la lógica ni las props.

- [ ] **Step 4: Verificar y commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sin errores.

```bash
git add -A
git commit -m "feat(dashboard): vista operativa con cumplimiento, vencimientos y pendientes" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Dashboard analítico y gráficas SVG

**Files:**
- Create: `src/presentation/graficas/geometria.ts`, `GraficaBarrasApiladas.tsx`, `GraficaLinea.tsx`, `src/presentation/dashboard/DashboardAnalitico.tsx`, `src/app/(app)/analitico/page.tsx`
- Test: `src/presentation/graficas/geometria.test.ts`

**Interfaces:**
- Consumes: `serieMensual`, `acumuladoAnual`, `comparativoCiudades`, `clasificarIli`, `useConfigIndicadores`, `useColeccion`, `useCatalogo`.
- Produces:
  - `maximoRedondeado(valor: number): number`
  - `segmentosPolilinea(valores: (number | null)[], ancho: number, alto: number, max: number): string[]`
  - `<GraficaBarrasApiladas datos={{ etiqueta: string; valores: number[] }[]} series={{ etiqueta: string; color: string }[]} titulo={string} />`
  - `<GraficaLinea etiquetas={string[]} valores={(number | null)[]} referencias={{ valor: number; etiqueta: string }[]} titulo={string} decimales={number} />`
  - Ruta `/analitico`

- [ ] **Step 1: Pruebas de geometría que fallan**

Create `src/presentation/graficas/geometria.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { maximoRedondeado, segmentosPolilinea } from './geometria'

describe('maximoRedondeado', () => {
  it.each([[0, 1], [1, 1], [2, 2], [3.2, 5], [7, 10], [0.34, 0.5], [12, 20]])('%s -> %s', (v, esperado) => {
    expect(maximoRedondeado(v)).toBeCloseTo(esperado, 10)
  })
})

describe('segmentosPolilinea', () => {
  it('genera un segmento continuo', () => {
    expect(segmentosPolilinea([0, 5, 10], 100, 50, 10)).toEqual(['0.00,50.00 50.00,25.00 100.00,0.00'])
  })
  it('parte el trazo en los valores null', () => {
    expect(segmentosPolilinea([1, null, 1], 100, 10, 1)).toEqual(['0.00,0.00', '100.00,0.00'])
  })
  it('maneja máximo 0 y un solo punto', () => {
    expect(segmentosPolilinea([0], 100, 10, 0)).toEqual(['0.00,10.00'])
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/presentation/graficas/geometria.test.ts`
Expected: FAIL, no se encuentra `./geometria`. Si Vitest no incluye `src/presentation/**/*.test.ts`, confirmar que `vitest.config.ts` usa `include: ['src/**/*.test.ts']` (sí lo hace).

- [ ] **Step 3: Implementar la geometría**

Create `src/presentation/graficas/geometria.ts`:
```ts
export function maximoRedondeado(valor: number): number {
  if (valor <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(valor))
  const f = valor / base
  const bonito = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return bonito * base
}

export function segmentosPolilinea(
  valores: (number | null)[], ancho: number, alto: number, max: number,
): string[] {
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0
  const segmentos: string[][] = [[]]
  valores.forEach((v, i) => {
    if (v === null) {
      if (segmentos[segmentos.length - 1].length) segmentos.push([])
      return
    }
    const y = max > 0 ? alto - (v / max) * alto : alto
    segmentos[segmentos.length - 1].push(`${(i * paso).toFixed(2)},${y.toFixed(2)}`)
  })
  return segmentos.filter((s) => s.length).map((s) => s.join(' '))
}
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/presentation/graficas/geometria.test.ts`
Expected: PASS.

- [ ] **Step 5: Componentes de gráfica**

Create `src/presentation/graficas/GraficaBarrasApiladas.tsx`:
```tsx
import { maximoRedondeado } from './geometria'

interface Props {
  titulo: string
  datos: { etiqueta: string; valores: number[] }[]
  series: { etiqueta: string; color: string }[]
}

const ANCHO = 600
const ALTO = 220
const MARGEN = { izq: 32, abajo: 24, arriba: 8 }

export function GraficaBarrasApiladas({ titulo, datos, series }: Props) {
  const totales = datos.map((d) => d.valores.reduce((a, b) => a + b, 0))
  const max = maximoRedondeado(Math.max(0, ...totales))
  const alto = ALTO - MARGEN.abajo - MARGEN.arriba
  const paso = (ANCHO - MARGEN.izq) / Math.max(datos.length, 1)
  const ancho = paso * 0.6

  return (
    <figure>
      <figcaption>{titulo}</figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} width="100%">
        <title>{titulo}</title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={MARGEN.izq} x2={ANCHO} y1={MARGEN.arriba + alto * (1 - f)} y2={MARGEN.arriba + alto * (1 - f)}
              stroke="currentColor" strokeOpacity={0.15} />
            <text x={MARGEN.izq - 4} y={MARGEN.arriba + alto * (1 - f) + 4} textAnchor="end" fontSize="10" fill="currentColor">
              {+(max * f).toFixed(2)}
            </text>
          </g>
        ))}
        {datos.map((d, i) => {
          let acumulado = 0
          const x = MARGEN.izq + i * paso + (paso - ancho) / 2
          return (
            <g key={d.etiqueta}>
              {d.valores.map((v, s) => {
                const h = (v / max) * alto
                const y = MARGEN.arriba + alto - ((acumulado + v) / max) * alto
                acumulado += v
                return h > 0 ? (
                  <rect key={series[s].etiqueta} x={x} y={y} width={ancho} height={h} fill={series[s].color}>
                    <title>{`${d.etiqueta}: ${series[s].etiqueta} ${v}`}</title>
                  </rect>
                ) : null
              })}
              <text x={x + ancho / 2} y={ALTO - 8} textAnchor="middle" fontSize="10" fill="currentColor">{d.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <ul aria-label="Leyenda">
        {series.map((s) => (
          <li key={s.etiqueta}><span style={{ background: s.color, display: 'inline-block', width: 10, height: 10 }} /> {s.etiqueta}</li>
        ))}
      </ul>
    </figure>
  )
}
```

Create `src/presentation/graficas/GraficaLinea.tsx`:
```tsx
import { maximoRedondeado, segmentosPolilinea } from './geometria'

interface Props {
  titulo: string
  etiquetas: string[]
  valores: (number | null)[]
  referencias?: { valor: number; etiqueta: string }[]
  decimales?: number
}

const ANCHO = 600
const ALTO = 220
const M = { izq: 40, der: 8, arriba: 8, abajo: 24 }

export function GraficaLinea({ titulo, etiquetas, valores, referencias = [], decimales = 2 }: Props) {
  const max = maximoRedondeado(Math.max(0, ...valores.filter((v): v is number => v !== null), ...referencias.map((r) => r.valor)))
  const ancho = ANCHO - M.izq - M.der
  const alto = ALTO - M.arriba - M.abajo
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0
  const y = (v: number) => M.arriba + alto - (v / max) * alto

  return (
    <figure>
      <figcaption>{titulo}</figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} width="100%">
        <title>{titulo}</title>
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={M.izq - 4} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="currentColor">
            {+(max * f).toFixed(2)}
          </text>
        ))}
        {referencias.map((r) => (
          <g key={r.etiqueta}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={y(r.valor)} y2={y(r.valor)} stroke="currentColor" strokeDasharray="4 3" strokeOpacity={0.5} />
            <text x={ANCHO - M.der} y={y(r.valor) - 3} textAnchor="end" fontSize="10" fill="currentColor">{r.etiqueta}</text>
          </g>
        ))}
        <g transform={`translate(${M.izq} ${M.arriba})`}>
          {segmentosPolilinea(valores, ancho, alto, max).map((puntos) => (
            <polyline key={puntos} points={puntos} fill="none" stroke="currentColor" strokeWidth={2} />
          ))}
          {valores.map((v, i) => v === null ? null : (
            <circle key={etiquetas[i]} cx={i * paso} cy={alto - (v / max) * alto} r={3} fill="currentColor">
              <title>{`${etiquetas[i]}: ${v.toFixed(decimales)}`}</title>
            </circle>
          ))}
        </g>
        {etiquetas.map((e, i) => (
          <text key={e} x={M.izq + i * paso} y={ALTO - 8} textAnchor="middle" fontSize="10" fill="currentColor">{e}</text>
        ))}
      </svg>
    </figure>
  )
}
```

- [ ] **Step 6: Página analítica**

Create `src/presentation/dashboard/DashboardAnalitico.tsx`:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { acumuladoAnual, comparativoCiudades, serieMensual } from '@/application/dashboard'
import type { Accidente, Poblacion } from '@/domain/entidades'
import { clasificarIli } from '@/domain/indicadores'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useConfigIndicadores } from '@/presentation/datos/useConfigIndicadores'
import { GraficaBarrasApiladas } from '@/presentation/graficas/GraficaBarrasApiladas'
import { GraficaLinea } from '@/presentation/graficas/GraficaLinea'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const NIVELES = { supera: 'Supera', meta: 'Meta', minimo: 'Mínimo', fuera_de_meta: 'Fuera de meta', sin_dato: 'Sin dato' }
const num = (v: number | null, d = 2) => (v === null ? '-' : v.toFixed(d))

export function DashboardAnalitico() {
  const cfg = useConfigIndicadores()
  const ciudades = useCatalogo('ciudades')
  const accidentesFuente = useColeccion('accidentes')
  const poblacionesFuente = useColeccion('indicadores_mensuales')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [ciudad, setCiudad] = useState('')

  const accidentes = accidentesFuente.registros as unknown as Accidente[]
  const poblaciones = poblacionesFuente.registros as unknown as Poblacion[]
  const serie = useMemo(() => serieMensual(accidentes, poblaciones, cfg, anio, ciudad || undefined), [accidentes, poblaciones, cfg, anio, ciudad])
  const anual = useMemo(() => acumuladoAnual(serie, cfg), [serie, cfg])
  const comparativo = useMemo(
    () => comparativoCiudades(accidentes, poblaciones, cfg, anio, ciudades.map((c) => c.valor)),
    [accidentes, poblaciones, cfg, anio, ciudades],
  )
  const etiqueta = (valor: string) => ciudades.find((c) => c.valor === valor)?.etiqueta ?? valor
  const nivel = clasificarIli(anual.ili, cfg)

  if (accidentesFuente.cargando || poblacionesFuente.cargando) return <p role="status">Cargando...</p>
  const error = accidentesFuente.error ?? poblacionesFuente.error
  if (error) return <p role="alert">{error}</p>

  return (
    <section>
      <h1>Accidentabilidad</h1>
      <div>
        <label htmlFor="a-anio">Año</label>
        <input id="a-anio" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
        <label htmlFor="a-ciudad">Ciudad</label>
        <select id="a-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
          <option value="">Todas (consolidado)</option>
          {ciudades.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
        </select>
      </div>

      <dl>
        <div><dt>HHT anual</dt><dd>{anual.hht.toLocaleString('es-MX')}</dd></div>
        <div><dt>Eventos</dt><dd>{anual.eventos}</dd></div>
        <div><dt>Días de incapacidad</dt><dd>{anual.dias}</dd></div>
        <div><dt>Índice de frecuencia</dt><dd>{num(anual.indiceFrecuencia)}</dd></div>
        <div><dt>Índice de severidad</dt><dd>{num(anual.indiceSeveridad)}</dd></div>
        <div data-nivel={nivel}><dt>ILI</dt><dd>{num(anual.ili, 3)} ({NIVELES[nivel]})</dd></div>
      </dl>

      <GraficaBarrasApiladas
        titulo="Accidentes por mes"
        datos={serie.map((p, i) => ({ etiqueta: MESES[i], valores: [p.laboral, p.trayecto] }))}
        series={[
          { etiqueta: 'Laboral', color: 'var(--serie-laboral, #b45309)' },
          { etiqueta: 'Trayecto', color: 'var(--serie-trayecto, #1d4ed8)' },
        ]}
      />

      <GraficaLinea
        titulo="ILI mensual"
        etiquetas={MESES}
        valores={serie.map((p) => p.ili)}
        decimales={3}
        referencias={[
          { valor: cfg.umbralMeta, etiqueta: 'Meta' },
          { valor: cfg.referenciaInterpretacion, etiqueta: 'Interpretación' },
        ]}
      />

      <h2>Comparativo entre ciudades ({anio})</h2>
      <table>
        <thead>
          <tr><th scope="col">Ciudad</th><th scope="col">HHT</th><th scope="col">Eventos</th>
            <th scope="col">IF</th><th scope="col">IS</th><th scope="col">ILI</th><th scope="col">Nivel</th></tr>
        </thead>
        <tbody>
          {comparativo.map((f) => (
            <tr key={f.ciudad} data-nivel={f.nivel}>
              <td>{etiqueta(f.ciudad)}</td>
              <td>{f.indices.hht.toLocaleString('es-MX')}</td>
              <td>{f.indices.eventos}</td>
              <td>{num(f.indices.indiceFrecuencia)}</td>
              <td>{num(f.indices.indiceSeveridad)}</td>
              <td>{num(f.indices.ili, 3)}</td>
              <td>{NIVELES[f.nivel]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

Create `src/app/(app)/analitico/page.tsx`:
```tsx
import { DashboardAnalitico } from '@/presentation/dashboard/DashboardAnalitico'

export default function AnaliticoPage() {
  return <DashboardAnalitico />
}
```

- [ ] **Step 7: Estilos con el skill de diseño**

Invocar `frontend-design` para dar estilo a esta vista con los tokens de la Task 13: definir `--serie-laboral` y `--serie-trayecto` en claro y oscuro con contraste suficiente, colores por `data-nivel` (además del texto del nivel), tarjetas de la lista `dl` en rejilla que baja a una columna a 360 px y gráficas que escalan al ancho del contenedor. Sin cambiar la lógica ni las props.

- [ ] **Step 8: Verificar y commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sin errores.

```bash
git add -A
git commit -m "feat(dashboard): vista analítica con gráficas SVG e indicadores por ciudad" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Script de migración desde Excel

**Files:**
- Create: `scripts/migracion/requirements.txt`, `pytest.ini`, `slug.py`, `leer_excel.py`, `transformar.py`, `cargar.py`, `migrar.py`, `tests/test_slug.py`, `tests/test_leer_excel.py`, `tests/test_transformar.py`

**Interfaces:**
- Consumes: el Excel `Información Seguridad e Higiene.xlsx` (solo las hojas de colaboradores).
- Produces:
  - `slug(texto) -> str` (mismos resultados que `src/domain/slug.ts`)
  - `encontrar_layout(ws) -> tuple[int, int] | None` (fila del encabezado `Nombre` y columna base, 0-indexada)
  - `filas_de_datos(ws, layout) -> list[tuple[int, list]]`
  - `transformar_fila(numero, fila, base, hoja, hoy) -> tuple[dict | None, list[str]]` con las claves `colaborador`, `capacitaciones`, `uniformes`, `epp`, `accidentes`
  - CLI `python migrar.py --excel RUTA [--commit]`

- [ ] **Step 1: Entorno**

Create `scripts/migracion/requirements.txt`:
```
openpyxl>=3.1
firebase-admin>=6.5
pytest>=8
```

Create `scripts/migracion/pytest.ini`:
```
[pytest]
pythonpath = .
testpaths = tests
```

Run:
```bash
cd scripts/migracion
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```
Expected: instalación sin errores.

- [ ] **Step 2: Prueba de slug que falla**

Create `scripts/migracion/tests/test_slug.py`:
```python
import pytest
from slug import slug


@pytest.mark.parametrize("entrada,esperado", [
    ("Ciudad G", "ciudad-g"),
    ("Ciudad B-Area Uno", "ciudad-b-area-uno"),
    ("Ciudad H", "ciudad-h"),
    ("  CUA001 ", "cua001"),
    ("Línea de vida de doble punto", "linea-de-vida-de-doble-punto"),
])
def test_slug(entrada, esperado):
    assert slug(entrada) == esperado
```

Run: `.venv/Scripts/python -m pytest tests/test_slug.py`
Expected: FAIL, no existe `slug`.

- [ ] **Step 3: Implementar slug**

Create `scripts/migracion/slug.py`:
```python
import re
import unicodedata


def slug(texto) -> str:
    base = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
```

Run: `.venv/Scripts/python -m pytest tests/test_slug.py`
Expected: PASS.

- [ ] **Step 4: Pruebas de lectura que fallan**

Create `scripts/migracion/tests/test_leer_excel.py`:
```python
from openpyxl import Workbook

from leer_excel import OFF, encontrar_layout, filas_de_datos


def poner(ws, fila, base, off, valor):
    ws.cell(row=fila, column=base + off + 1, value=valor)


def hoja_completa(fila_nombre=5, base=5):
    wb = Workbook()
    ws = wb.active
    poner(ws, fila_nombre, base, 0, "Nombre")
    poner(ws, fila_nombre - 1, base, OFF["botas"], "Botas")
    poner(ws, fila_nombre - 1, base, OFF["guantes"], "Guantes")
    poner(ws, fila_nombre - 2, base, OFF["acc_fecha"], "Accidentes")
    return ws


def test_encuentra_el_layout_completo():
    assert encontrar_layout(hoja_completa(5, 5)) == (5, 5)
    assert encontrar_layout(hoja_completa(4, 6)) == (4, 6)


def test_rechaza_hojas_reducidas():
    wb = Workbook()
    ws = wb.active
    ws.cell(row=3, column=6, value="Personal")
    ws.cell(row=3, column=9, value="Curso")
    assert encontrar_layout(ws) is None


def test_lee_filas_despues_del_encabezado():
    ws = hoja_completa(5, 5)
    poner(ws, 6, 5, 0, "Ana")
    poner(ws, 7, 5, 0, "Beto")
    filas = filas_de_datos(ws, (5, 5))
    assert [n for n, _ in filas][:2] == [6, 7]
```

Run: `.venv/Scripts/python -m pytest tests/test_leer_excel.py`
Expected: FAIL, no existe `leer_excel`.

- [ ] **Step 5: Implementar lectura**

Create `scripts/migracion/leer_excel.py`:
```python
from slug import slug

# Desplazamientos respecto de la columna "Nombre" (0-indexados), medidos en Ciudad A, Ciudad C y Ciudad B
OFF = {
    "linea": -4, "ciudad": -2, "ingreso": 2, "cuadrilla": 3, "norma": 4,
    "cap_fecha": 8, "cap_venc": 9, "botas": 11, "guantes": 24,
    "acc_fecha": 43, "acc_trayecto": 44, "acc_laboral": 45,
}
PRENDAS = ["botas", "playera", "camisola", "pantalon"]
EPP = [
    "guantes", "lentes", "casco",
    "linea-vida-doble-punto", "arnes-cuerpo-completo", "linea-posicionamiento",
]


def _texto(ws, fila, col):
    if fila < 1 or col < 0:
        return ""
    v = ws.cell(row=fila, column=col + 1).value
    return slug(v) if isinstance(v, str) else ""


def _valida(ws, fila, base):
    return (
        _texto(ws, fila - 1, base + OFF["botas"]) == "botas"
        and _texto(ws, fila - 1, base + OFF["guantes"]) == "guantes"
        and _texto(ws, fila - 2, base + OFF["acc_fecha"]) == "accidentes"
    )


def encontrar_layout(ws):
    for fila in range(1, 9):
        for celda in ws[fila]:
            if isinstance(celda.value, str) and slug(celda.value) == "nombre":
                base = celda.column - 1
                if _valida(ws, fila, base):
                    return fila, base
    return None


def filas_de_datos(ws, layout):
    fila_nombre, _ = layout
    return [
        (n, list(fila))
        for n, fila in enumerate(ws.iter_rows(min_row=fila_nombre + 1, values_only=True), start=fila_nombre + 1)
    ]


def es_hoja_de_colaboradores(titulo: str) -> bool:
    return "oficina" not in slug(titulo)
```

Run: `.venv/Scripts/python -m pytest tests/test_leer_excel.py`
Expected: PASS.

- [ ] **Step 6: Pruebas de transformación que fallan**

Create `scripts/migracion/tests/test_transformar.py`:
```python
from datetime import datetime, timezone

from leer_excel import EPP, OFF, PRENDAS
from transformar import transformar_fila

HOY = datetime(2026, 9, 30)
BASE = 5


def fila_vacia():
    return [None] * (BASE + 60)


def poner(fila, off, valor):
    fila[BASE + off] = valor


def fila_base(nombre="Ana Pérez", ciudad="Ciudad A"):
    f = fila_vacia()
    poner(f, 0, nombre)
    poner(f, OFF["ciudad"], ciudad)
    poner(f, OFF["linea"], "LINEA X")
    poner(f, OFF["ingreso"], datetime(2026, 5, 22))
    poner(f, OFF["cuadrilla"], "CUA001")
    return f


def test_colaborador_con_slugs_y_fecha_al_mediodia_utc():
    reg, avisos = transformar_fila(6, fila_base(), BASE, "Ciudad A Colaboradores", HOY)
    c = reg["colaborador"]
    assert c["nombre"] == "Ana Pérez"
    assert (c["ciudad"], c["area"], c["linea_negocio"], c["cuadrilla"]) == ("ciudad-a", None, "linea-x", "cua001")
    assert c["fecha_ingreso"] == datetime(2026, 5, 22, 12, tzinfo=timezone.utc)
    assert avisos == []


def test_ciudad_b_separa_ciudad_y_area():
    reg, _ = transformar_fila(5, fila_base(ciudad="Ciudad B-Area Uno"), BASE, "Ciudad B-Area Uno", HOY)
    assert reg["colaborador"]["ciudad"] == "ciudad-b"
    assert reg["colaborador"]["area"] == "area-uno"


def test_capacitacion_con_fecha_cumple_y_pendiente_no():
    f = fila_base()
    poner(f, OFF["norma"], "NORMA-001")
    poner(f, OFF["cap_fecha"], datetime(2026, 5, 4))
    poner(f, OFF["cap_venc"], datetime(2027, 5, 4))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    cap = reg["capacitaciones"][0]
    assert cap["norma"] == "norma-001" and cap["cumple"] is True and cap["estado"] == "vigente"

    f = fila_base()
    poner(f, OFF["norma"], "NORMA-001")
    poner(f, OFF["cap_fecha"], "Pendiente")
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    cap = reg["capacitaciones"][0]
    assert cap["fecha"] is None and cap["cumple"] is False and cap["estado"] == "pendiente"


def test_uniformes_por_prenda():
    f = fila_base()
    for i, prenda in enumerate(PRENDAS):
        base = OFF["botas"] + 3 * i
        poner(f, base, 26 if prenda == "botas" else "G")
        poner(f, base + 1, 2.0)
        poner(f, base + 2, datetime(2026, 8, 31))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    assert [u["prenda"] for u in reg["uniformes"]] == PRENDAS
    assert reg["uniformes"][0]["talla"] == "26" and reg["uniformes"][0]["cantidad"] == 2
    assert reg["uniformes"][1]["talla"] == "G"


def test_epp_solo_si_hay_fecha_y_las_etiquetas_si_no_no_cuentan():
    f = fila_base()
    for i in range(len(EPP)):
        poner(f, OFF["guantes"] + 3 * i, "SI")
        poner(f, OFF["guantes"] + 3 * i + 1, "NO")
    poner(f, OFF["guantes"] + 2, datetime(2026, 8, 31))
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    assert [e["tipo"] for e in reg["epp"]] == ["guantes"]
    assert reg["epp"][0]["entregado"] is True


def test_accidente_laboral_y_aviso_si_no_hay_tipo():
    f = fila_base()
    poner(f, OFF["acc_fecha"], datetime(2026, 8, 24))
    poner(f, OFF["acc_laboral"], "X")
    reg, _ = transformar_fila(6, f, BASE, "H", HOY)
    a = reg["accidentes"][0]
    assert a["tipo"] == "laboral" and a["dias_incapacidad"] == 0 and a["periodo"] == "2026-08"

    f = fila_base()
    poner(f, OFF["acc_fecha"], datetime(2026, 8, 24))
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg["accidentes"] == [] and any("tipo" in a for a in avisos)


def test_fila_sin_nombre_se_descarta():
    f = fila_vacia()
    assert transformar_fila(6, f, BASE, "H", HOY) == (None, [])
    f = fila_vacia()
    poner(f, OFF["ciudad"], "Ciudad J")
    reg, avisos = transformar_fila(6, f, BASE, "H", HOY)
    assert reg is None and len(avisos) == 1
```

Run: `.venv/Scripts/python -m pytest tests/test_transformar.py`
Expected: FAIL, no existe `transformar`.

- [ ] **Step 7: Implementar transformación**

Create `scripts/migracion/transformar.py`:
```python
from datetime import datetime, timezone

from leer_excel import EPP, OFF, PRENDAS
from slug import slug


def fecha_cal(valor):
    return datetime(valor.year, valor.month, valor.day, 12, tzinfo=timezone.utc)


def _fecha(valor):
    return fecha_cal(valor) if isinstance(valor, datetime) else None


def _celda(fila, base, off):
    i = base + off
    return fila[i] if 0 <= i < len(fila) else None


def _texto(valor):
    if valor is None:
        return None
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    limpio = str(valor).strip()
    return limpio or None


def _estado_capacitacion(fecha, venc, hoy):
    if fecha is None:
        return "pendiente"
    if venc is not None and venc.date() < hoy.date():
        return "vencido"
    return "vigente"


def transformar_fila(numero, fila, base, hoja, hoy):
    avisos = []
    nombre = _texto(_celda(fila, base, 0))
    if not nombre or slug(nombre) == "nombre":
        hay_datos = any(v is not None for v in fila[1:])
        return None, ([f"{hoja} fila {numero}: fila con datos pero sin nombre"] if hay_datos and not nombre else [])

    ciudad_txt = _texto(_celda(fila, base, OFF["ciudad"])) or ""
    ciudad = slug(ciudad_txt)
    area = None
    if ciudad.startswith("ciudad-b-"):
        area, ciudad = ciudad[len("ciudad-b-"):], "ciudad-b"
    cuadrilla = _texto(_celda(fila, base, OFF["cuadrilla"]))
    colaborador = {
        "nombre": nombre,
        "ciudad": ciudad,
        "area": area,
        "linea_negocio": slug(_texto(_celda(fila, base, OFF["linea"])) or ""),
        "cuadrilla": slug(cuadrilla) if cuadrilla else None,
        "fecha_ingreso": _fecha(_celda(fila, base, OFF["ingreso"])),
        "activo": True,
    }

    capacitaciones = []
    norma = _texto(_celda(fila, base, OFF["norma"]))
    if norma:
        f_cap_raw = _celda(fila, base, OFF["cap_fecha"])
        f_cap, venc = _fecha(f_cap_raw), _fecha(_celda(fila, base, OFF["cap_venc"]))
        capacitaciones.append({
            "norma": slug(norma), "cumple": f_cap is not None, "fecha": f_cap,
            "vencimiento": venc, "estado": _estado_capacitacion(f_cap, venc, hoy),
        })

    uniformes = []
    for i, prenda in enumerate(PRENDAS):
        off = OFF["botas"] + 3 * i
        talla = _texto(_celda(fila, base, off))
        if talla is None:
            continue
        cantidad = _celda(fila, base, off + 1)
        if not isinstance(cantidad, (int, float)):
            avisos.append(f"{hoja} fila {numero}: {prenda} sin cantidad, se asumió 1")
            cantidad = 1
        fecha = _fecha(_celda(fila, base, off + 2))
        if fecha is None:
            avisos.append(f"{hoja} fila {numero}: {prenda} sin fecha de entrega")
        uniformes.append({"prenda": prenda, "talla": talla, "cantidad": int(cantidad), "fecha": fecha})

    epp = []
    for i, tipo in enumerate(EPP):
        fecha = _fecha(_celda(fila, base, OFF["guantes"] + 3 * i + 2))
        if fecha is not None:
            epp.append({"tipo": tipo, "entregado": True, "fecha": fecha, "vencimiento": None})

    accidentes = []
    fecha_acc = _fecha(_celda(fila, base, OFF["acc_fecha"]))
    if fecha_acc is not None:
        trayecto = str(_celda(fila, base, OFF["acc_trayecto"]) or "").strip().lower() == "x"
        laboral = str(_celda(fila, base, OFF["acc_laboral"]) or "").strip().lower() == "x"
        if trayecto == laboral:
            avisos.append(f"{hoja} fila {numero}: accidente sin un tipo claro (trayecto o laboral), no se migró")
        else:
            accidentes.append({
                "fecha": fecha_acc, "tipo": "laboral" if laboral else "trayecto",
                "periodo": f"{fecha_acc.year}-{fecha_acc.month:02d}", "dias_incapacidad": 0,
            })

    return {
        "colaborador": colaborador, "capacitaciones": capacitaciones,
        "uniformes": uniformes, "epp": epp, "accidentes": accidentes,
    }, avisos
```

Run: `.venv/Scripts/python -m pytest`
Expected: todas las pruebas PASS.

- [ ] **Step 8: Carga y CLI**

Create `scripts/migracion/cargar.py`:
```python
import firebase_admin
from firebase_admin import credentials, firestore

COLECCIONES = [
    "colaboradores", "capacitaciones", "entregas_uniforme", "entregas_epp", "accidentes",
]


def conectar(proyecto: str, base: str):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": proyecto})
    return firestore.client(database_id=base)


def verificar_vacias(db):
    for nombre in COLECCIONES:
        if list(db.collection(nombre).limit(1).stream()):
            raise SystemExit(f"La colección {nombre} ya tiene datos; la migración no se ejecuta.")


def _auditoria():
    return {
        "creado_por": "migracion", "creado_en": firestore.SERVER_TIMESTAMP,
        "actualizado_por": "migracion", "actualizado_en": firestore.SERVER_TIMESTAMP,
    }


def cargar(db, registros):
    lote, pendientes = db.batch(), 0

    def escribir(ref, datos):
        nonlocal lote, pendientes
        lote.set(ref, {**datos, **_auditoria()})
        pendientes += 1
        if pendientes >= 400:
            lote.commit()
            lote, pendientes = db.batch(), 0

    for r in registros:
        col = r["colaborador"]
        ref_col = db.collection("colaboradores").document()
        escribir(ref_col, col)
        comun = {"colaborador_id": ref_col.id, "ciudad": col["ciudad"]}
        for c in r["capacitaciones"]:
            escribir(db.collection("capacitaciones").document(), {**comun, **c})
        for u in r["uniformes"]:
            periodo = f"{u['fecha'].year}-{u['fecha'].month:02d}" if u["fecha"] else None
            escribir(db.collection("entregas_uniforme").document(), {**comun, **u, "periodo": periodo})
        for e in r["epp"]:
            escribir(db.collection("entregas_epp").document(), {**comun, **e})
        for a in r["accidentes"]:
            escribir(db.collection("accidentes").document(), {**comun, **a})
    if pendientes:
        lote.commit()


def unir_catalogos(db, encontrados: dict):
    for id_catalogo, items in encontrados.items():
        ref = db.collection("catalogos").document(id_catalogo)
        snap = ref.get()
        existentes = (snap.to_dict() or {}).get("items", []) if snap.exists else []
        vistos = {i["valor"] for i in existentes}
        nuevos = [i for i in items if i["valor"] not in vistos]
        ref.set({"items": existentes + nuevos, **_auditoria()}, merge=True)
```

Create `scripts/migracion/migrar.py`:
```python
import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

from leer_excel import encontrar_layout, es_hoja_de_colaboradores, filas_de_datos
from transformar import transformar_fila


def leer_todo(ruta, hoy):
    wb = load_workbook(ruta, data_only=True)
    registros, reporte, catalogos = [], [], defaultdict(dict)
    for ws in wb:
        if not es_hoja_de_colaboradores(ws.title):
            continue
        layout = encontrar_layout(ws)
        if layout is None:
            reporte.append({"hoja": ws.title, "estado": "formato no reconocido, no se migró"})
            continue
        _, base = layout
        avisos, n = [], 0
        for numero, fila in filas_de_datos(ws, layout):
            reg, av = transformar_fila(numero, fila, base, ws.title, hoy)
            avisos += av
            if reg is None:
                continue
            n += 1
            registros.append(reg)
            c = reg["colaborador"]
            for id_cat, valor in (("ciudades", c["ciudad"]), ("areas", c["area"]),
                                   ("lineas_negocio", c["linea_negocio"]), ("cuadrillas", c["cuadrilla"])):
                if valor:
                    catalogos[id_cat][valor] = valor.upper() if id_cat in ("cuadrillas", "lineas_negocio") else valor
            for cap in reg["capacitaciones"]:
                catalogos["normas"][cap["norma"]] = cap["norma"].upper()
        reporte.append({
            "hoja": ws.title, "colaboradores": n,
            "capacitaciones": sum(len(r["capacitaciones"]) for r in registros[-n:]) if n else 0,
            "uniformes": sum(len(r["uniformes"]) for r in registros[-n:]) if n else 0,
            "epp": sum(len(r["epp"]) for r in registros[-n:]) if n else 0,
            "accidentes": sum(len(r["accidentes"]) for r in registros[-n:]) if n else 0,
            "avisos": avisos,
        })
    encontrados = {k: [{"valor": v, "etiqueta": e} for v, e in d.items()] for k, d in catalogos.items()}
    return registros, reporte, encontrados


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--excel", required=True)
    p.add_argument("--commit", action="store_true", help="escribe en Firestore; sin esto solo genera el reporte")
    p.add_argument("--proyecto", default="<PROYECTO>")
    p.add_argument("--base", default="seguridad-higiene")
    args = p.parse_args()

    registros, reporte, catalogos = leer_todo(args.excel, datetime.now())
    salida = Path(__file__).parent / "salida"
    salida.mkdir(exist_ok=True)
    (salida / "reporte-migracion.json").write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8")

    for h in reporte:
        print(h)
    print(f"Total colaboradores: {len(registros)}")
    print("Reporte en", salida / "reporte-migracion.json")

    if not args.commit:
        print("Modo prueba: no se escribió nada. Usa --commit para cargar.")
        return

    from cargar import cargar, conectar, unir_catalogos, verificar_vacias
    db = conectar(args.proyecto, args.base)
    verificar_vacias(db)
    cargar(db, registros)
    unir_catalogos(db, catalogos)
    print("Migración completa.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 9: Ejecutar en modo prueba contra el Excel real**

Run (desde `scripts/migracion`):
```bash
.venv/Scripts/python migrar.py --excel "<RUTA>/archivo.xlsx"
```
Expected: imprime un resumen por hoja y `Total colaboradores: N`, y escribe `salida/reporte-migracion.json`. No conecta a Firestore. Revisar con el usuario el reporte (hojas de formato no reconocido como Ciudad J y Ciudad I, avisos por filas sin nombre, accidentes sin tipo claro) antes de cualquier `--commit`.

- [ ] **Step 10: Commit**

```bash
cd ../..
git add scripts/migracion
git commit -m "feat(migracion): script de carga única desde el Excel con modo prueba" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

La carga real (`--commit`) la ejecuta el usuario después de revisar el reporte, con `GOOGLE_APPLICATION_CREDENTIALS` configurada por su cuenta. No se corre desde esta sesión.

---

### Task 17: README, despliegue y respaldos

**Files:**
- Create: `README.md` (reemplaza el generado por create-next-app)

**Interfaces:**
- Produces: guía de puesta en marcha que ejecuta el usuario (comandos que crean recursos o despliegan van marcados como acciones del usuario).

- [ ] **Step 1: Escribir el README**

Create `README.md`:
````markdown
# Seguridad e Higiene

App web para capturar y consultar seguridad e higiene por ciudad. Diseño en `docs/superpowers/specs/` y plan en `docs/superpowers/plans/`.

## Requisitos

- Node 20 o superior y pnpm.
- Java (solo para las pruebas de reglas con el emulador).
- Python 3 (solo para la migración).

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores del proyecto `<PROYECTO>`.

## Comandos

```bash
pnpm install
pnpm dev              # servidor local
pnpm test             # pruebas unitarias
pnpm test:rules       # pruebas de reglas de Firestore (emulador)
pnpm typecheck && pnpm lint
```

## Puesta en marcha en Firebase (acciones del administrador)

1. Crear la base de datos con nombre, en la misma región que `<OTRA-BASE>`:
   `firebase firestore:databases:create <BASE> --location=<REGION> --project <PROYECTO>`
2. Habilitar el proveedor Google en Authentication y agregar el dominio de la app a los dominios autorizados.
3. Desplegar reglas e índices solo de esta base:
   `firebase deploy --only firestore:<BASE> --project <PROYECTO>`
4. Crear a mano el primer admin: iniciar sesión una vez con la cuenta, luego en la consola de Firestore (base `<BASE>`) editar `usuarios/{uid}` y poner `rol: "admin"` y `activo: true`.
5. Entrar a `/admin/catalogos` y pulsar "Cargar valores iniciales". Ajustar `/admin/configuracion` si hace falta.

## Migración inicial (una sola vez)

```bash
cd scripts/migracion
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python migrar.py --excel "RUTA/Información Seguridad e Higiene.xlsx"           # modo prueba
.venv/Scripts/python migrar.py --excel "RUTA/Información Seguridad e Higiene.xlsx" --commit  # carga real
```

Revisar `scripts/migracion/salida/reporte-migracion.json` antes del `--commit`. El reporte contiene nombres de personas: no se sube a git. La carga real requiere `GOOGLE_APPLICATION_CREDENTIALS` apuntando a una cuenta con permiso de escritura, configurada por quien la ejecuta.

## Respaldos

Con un solo capturista y sin Excel de respaldo, la app es la única fuente de datos. Programar respaldos diarios de la base:

```bash
gcloud firestore backups schedules create --database=<BASE> --recurrence=daily --retention=14w --project=<PROYECTO>
```

## Reglas de seguridad

Viven en `firestore.seguridad-higiene.rules`. El `firebase.json` de este repositorio solo declara la base `<BASE>`, de modo que un despliegue desde aquí no toca las reglas de <OTRA-APP>.
````

- [ ] **Step 2: Verificación final**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo en PASS y sin errores.

Run: `pnpm test:rules`
Expected: PASS (requiere Java).

Run (desde `scripts/migracion`): `.venv/Scripts/python -m pytest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README con puesta en marcha, migración y respaldos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
