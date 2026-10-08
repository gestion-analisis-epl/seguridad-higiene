# Colaboradores desde Google Sheets: plan de implementación

> **Para agentes:** usar superpowers:subagent-driven-development o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas `- [ ]`. **No se hace ningún commit hasta que el usuario revise y pruebe.**

**Objetivo:** que los colaboradores se elijan de un dropdown alimentado en vivo por la hoja "Colaboradores Operativos SH", conservando el UID de Firestore como llave y sin perder lo ya registrado.

**Arquitectura:** rutas de servidor (Next.js, `firebase-admin`, cuenta de servicio de App Hosting) leen la hoja con caché y crean o enlazan colaboradores en transacciones. El cliente guarda la lista en `sessionStorage`. El dominio queda en funciones puras con pruebas.

**Stack:** Next.js 14 (app router), React 18, TypeScript, Firebase 12 (cliente) y `firebase-admin` (servidor), `google-auth-library`, vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-colaboradores-desde-hoja-design.md`

## Restricciones globales

- Comentarios solo de una línea, útiles y no redundantes; nada de comentarios en párrafo.
- Ningún valor de la organización en el código: ID de hoja y pestaña van en variables de entorno (`COLABORADORES_SHEET_ID`, `COLABORADORES_SHEET_TAB`).
- El UID de Firestore es la llave; la columna `id` de la hoja se guarda como `id_interno`.
- `CorreoEmpresa`, `TipoNomina`, `Empresa Alta`, `Función Área`, `ApellidoPaterno`, `ApellidoMaterno` y `Nombre` no salen del servidor.
- No tocar los 6 archivos que el usuario ya tenía modificados salvo donde la tarea lo indica (`firestore.rules.template`, `README.md`, `tests/rules/firestore.rules.test.ts`), y solo en las líneas de la tarea.
- Sin commits.
- Rutas de comando: ejecutar desde la raíz `C:\Users\gestionyanalisis\Documents\Trabajo\ProyectosTrabajo\EPL\Seguridad\seguridad-higiene`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/domain/colaboradores-hoja.ts` | Tipos de la hoja, lectura de filas, búsqueda, catálogos, enlace sugerido |
| `src/domain/cache-con-respaldo.ts` | Caché con TTL, última copia buena y mínimo entre recargas forzadas |
| `src/domain/acceso-api.ts` | Decisión de acceso de las rutas |
| `src/application/colaboradores-servidor.ts` | Asegurar, vincular y desvincular sobre un almacén abstracto |
| `src/application/colaboradores-hoja-cliente.ts` | Caché de sesión del navegador con petición única |
| `src/infrastructure/servidor/*` | Admin SDK, autenticación, lectura de la hoja, caché de servidor |
| `src/infrastructure/api/colaboradores.ts` | Llamadas del navegador a las rutas |
| `src/app/api/colaboradores-hoja/route.ts`, `src/app/api/colaboradores/{asegurar,enlace}/route.ts` | Rutas |
| `src/presentation/colaboradores/*` | Hook, selector, alta, tabla de enlace |
| `src/app/(app)/admin/colaboradores/page.tsx` | Herramienta de enlace |

---

### Task 1: Dominio de la hoja y búsqueda por palabras

**Files:**
- Create: `src/domain/colaboradores-hoja.ts`, `src/domain/colaboradores-hoja.test.ts`
- Modify: `src/presentation/ui/seleccion.ts` (`filtrarOpciones`), `src/presentation/ui/seleccion.test.ts`

**Interfaces:**
- Produces: `ColaboradorHoja`, `parsearFilasHoja(valores: string[][]): { colaboradores: ColaboradorHoja[]; descartadas: number }`, `fechaDeHoja(texto: string): string | null`, `normalizarNombre(t: string): string`, `buscarColaboradores(filas, texto)`, `etiquetaColaboradorHoja(f)`, `resolverEntradaCatalogo(items, texto)`, `planearEnlace(existentes, hoja)`, `copiaDeColaborador(c)`.

- [ ] **Step 1: Escribir la prueba que falla** en `src/domain/colaboradores-hoja.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  buscarColaboradores, copiaDeColaborador, etiquetaColaboradorHoja, fechaDeHoja, normalizarNombre, parsearFilasHoja,
  planearEnlace, resolverEntradaCatalogo, type ColaboradorHoja,
} from './colaboradores-hoja'

const ENCABEZADO = [
  'id', 'No.Colaborador', 'Nombre', 'NombreCompleto', 'Función Área', 'Departamento', 'Puesto', 'FechaIngreso',
  'FechaBaja', 'Zona', 'Plaza', 'MotivoBaja', 'Empresa', 'Gerente', 'Jefe', 'CorreoEmpresa',
]
const fila = (o: Record<string, string>) => ENCABEZADO.map((h) => o[h] ?? '')
const base = {
  id: '12066', 'No.Colaborador': '2120', NombreCompleto: 'ADALBERTO GUTIERREZ MIRANDA', Departamento: 'SEGURIDAD',
  Puesto: 'GUARDIA DE SEGURIDAD ', FechaIngreso: '2026-09-28 0:00:00', Zona: 'Bajío Centro', Plaza: 'LEON',
  Empresa: 'SICMART SA DE CV', Gerente: 'ALFONSO ORDAZ OCAÑA ', Jefe: 'JOSE CHAGOYA', CorreoEmpresa: 'x@y.com',
}
const hoja = (...filas: Record<string, string>[]) => [ENCABEZADO, ...filas.map(fila)]
const col = (o: Partial<ColaboradorHoja>): ColaboradorHoja => ({
  id_interno: '1', numero: '1', nombre: 'ANA PEREZ', plaza: 'LEON', departamento: 'OPERACIONES', empresa: 'X', puesto: 'P',
  fecha_ingreso: null, zona: '', jefe: '', gerente: '', fecha_baja: null, motivo_baja: '', ...o,
})

describe('parsearFilasHoja', () => {
  it('lee por nombre de encabezado, limpia espacios y convierte la fecha', () => {
    const { colaboradores } = parsearFilasHoja(hoja(base))
    expect(colaboradores).toEqual([{
      id_interno: '12066', numero: '2120', nombre: 'ADALBERTO GUTIERREZ MIRANDA', plaza: 'LEON', departamento: 'SEGURIDAD',
      empresa: 'SICMART SA DE CV', puesto: 'GUARDIA DE SEGURIDAD', fecha_ingreso: '2026-09-28', zona: 'Bajío Centro',
      jefe: 'JOSE CHAGOYA', gerente: 'ALFONSO ORDAZ OCAÑA', fecha_baja: null, motivo_baja: '',
    }])
  })

  it('no expone el correo ni otras columnas', () => {
    const [c] = parsearFilasHoja(hoja(base)).colaboradores
    expect(Object.values(c)).not.toContain('x@y.com')
  })

  it('descarta filas sin id, sin nombre, con id repetido o con id inválido', () => {
    const r = parsearFilasHoja(hoja(
      base, { ...base, id: '' }, { ...base, id: '2', NombreCompleto: '' }, { ...base, id: '12066' }, { ...base, id: 'a/b' },
    ))
    expect(r.colaboradores).toHaveLength(1)
    expect(r.descartadas).toBe(4)
  })

  it('falla con un mensaje claro si falta una columna obligatoria', () => {
    expect(() => parsearFilasHoja([['id', 'Nombre']])).toThrow(/columnas/)
  })

  it('devuelve vacío si la hoja no tiene filas', () => {
    expect(parsearFilasHoja([]).colaboradores).toEqual([])
  })
})

describe('fechaDeHoja', () => {
  it.each([
    ['2026-09-28 0:00:00', '2026-09-28'], ['2026-09-28', '2026-09-28'], ['28/09/2026', '2026-09-28'],
    ['2026-02-31', null], ['', null], ['pendiente', null],
  ])('%s', (entrada, esperado) => expect(fechaDeHoja(entrada)).toBe(esperado))
})

describe('buscarColaboradores', () => {
  const filas = [
    col({ id_interno: '1', nombre: 'CARLOS ALBERTO TORRES', numero: '344', puesto: 'SOLDADOR A' }),
    col({ id_interno: '2', nombre: 'MARÍA TORRES', numero: '12', puesto: 'ALMACENISTA' }),
  ]
  it('exige todas las palabras sin importar acentos ni mayúsculas', () => {
    expect(buscarColaboradores(filas, 'carlos torres').map((f) => f.id_interno)).toEqual(['1'])
    expect(buscarColaboradores(filas, 'maria').map((f) => f.id_interno)).toEqual(['2'])
  })
  it('busca por número y por puesto', () => {
    expect(buscarColaboradores(filas, '344').map((f) => f.id_interno)).toEqual(['1'])
    expect(buscarColaboradores(filas, 'almacenista').map((f) => f.id_interno)).toEqual(['2'])
  })
  it('sin texto devuelve todo', () => expect(buscarColaboradores(filas, '  ')).toHaveLength(2))
})

describe('etiquetaColaboradorHoja', () => {
  it('une nombre, número y puesto y omite lo vacío', () => {
    expect(etiquetaColaboradorHoja(col({ nombre: 'ANA PEREZ', numero: '9', puesto: 'SOLDADOR A' }))).toBe('Ana Perez · 9 · Soldador A')
    expect(etiquetaColaboradorHoja(col({ nombre: 'ANA PEREZ', numero: '', puesto: '' }))).toBe('Ana Perez')
  })
})

describe('resolverEntradaCatalogo', () => {
  const items = [{ valor: 'leon', etiqueta: 'León' }]
  it('reutiliza la entrada que coincide por etiqueta o por valor', () => {
    expect(resolverEntradaCatalogo(items, 'LEON')).toEqual({ valor: 'leon', etiqueta: 'León', nueva: false })
    expect(resolverEntradaCatalogo(items, 'león')).toEqual({ valor: 'leon', etiqueta: 'León', nueva: false })
  })
  it('propone una entrada nueva con valor normalizado', () => {
    expect(resolverEntradaCatalogo(items, 'CIUDAD JUAREZ')).toEqual({ valor: 'ciudad-juarez', etiqueta: 'Ciudad Juarez', nueva: true })
  })
  it('devuelve null con texto vacío', () => expect(resolverEntradaCatalogo(items, '  ')).toBeNull())
})

describe('planearEnlace', () => {
  const hojaCols = [col({ id_interno: '1', nombre: 'ANA PEREZ' }), col({ id_interno: '2', nombre: 'LUIS RUIZ' }), col({ id_interno: '3', nombre: 'LUIS RUIZ' })]
  it('marca exacta, ambigua y sin coincidencia', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Ana Pérez', id_interno: null },
      { id: 'b', nombre: 'Luis Ruiz', id_interno: null },
      { id: 'c', nombre: 'Zoe Sin Hoja', id_interno: null },
    ], hojaCols)
    expect(r.map((f) => f.sugerencia?.estado)).toEqual(['exacta', 'ambigua', 'sin_coincidencia'])
    expect(r[0].sugerencia?.candidatos[0].id_interno).toBe('1')
  })
  it('no sugiere filas ya vinculadas y no sugiere a los ya vinculados', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Otra Ana', id_interno: '1' },
      { id: 'b', nombre: 'Ana Perez', id_interno: null },
    ], hojaCols)
    expect(r[0].sugerencia).toBeNull()
    expect(r[1].sugerencia?.estado).toBe('sin_coincidencia')
  })
  it('degrada a ambigua cuando dos colaboradores actuales comparten nombre', () => {
    const r = planearEnlace([
      { id: 'a', nombre: 'Ana Perez', id_interno: null }, { id: 'b', nombre: 'ANA PEREZ', id_interno: null },
    ], hojaCols)
    expect(r.map((f) => f.sugerencia?.estado)).toEqual(['ambigua', 'ambigua'])
  })
})

describe('copiaDeColaborador', () => {
  it('toma nombre, plaza y puesto del colaborador', () => {
    expect(copiaDeColaborador({ nombre: 'Ana', plaza: 'LEON', puesto: 'SOLDADOR A' }))
      .toEqual({ colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: 'SOLDADOR A' })
    expect(copiaDeColaborador({ nombre: 'Ana' }))
      .toEqual({ colaborador_nombre: 'Ana', colaborador_plaza: null, colaborador_puesto: null })
  })
})

describe('normalizarNombre', () => {
  it('quita acentos, mayúsculas y espacios repetidos', () => expect(normalizarNombre('  MaRía   PÉREZ ')).toBe('maria perez'))
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm vitest run src/domain/colaboradores-hoja.test.ts`
Expected: FAIL, el módulo `./colaboradores-hoja` no existe.

- [ ] **Step 3: Implementar** `src/domain/colaboradores-hoja.ts`

```ts
import type { ItemCatalogo } from './catalogos-iniciales'
import { aTextoIso, fechaCalendario } from './fechas'
import type { Valores } from './modulos'
import { slug } from './slug'
import { aTitulo, limpiarTexto } from './texto'

export interface ColaboradorHoja {
  id_interno: string
  numero: string
  nombre: string
  plaza: string
  departamento: string
  empresa: string
  puesto: string
  fecha_ingreso: string | null
  zona: string
  jefe: string
  gerente: string
  fecha_baja: string | null
  motivo_baja: string
}

type TextoHoja = Exclude<keyof ColaboradorHoja, 'fecha_ingreso' | 'fecha_baja'>

const ENCABEZADOS: Record<keyof ColaboradorHoja, string> = {
  id_interno: 'id', numero: 'no.colaborador', nombre: 'nombrecompleto', plaza: 'plaza', departamento: 'departamento',
  empresa: 'empresa', puesto: 'puesto', fecha_ingreso: 'fechaingreso', zona: 'zona', jefe: 'jefe', gerente: 'gerente',
  fecha_baja: 'fechabaja', motivo_baja: 'motivobaja',
}
const OBLIGATORIAS: (keyof ColaboradorHoja)[] = ['id_interno', 'nombre', 'plaza', 'departamento', 'empresa', 'puesto', 'fecha_ingreso']
const ID_VALIDO = /^[0-9A-Za-z_-]{1,64}$/

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const claveEncabezado = (t: string) => sinAcentos(t).toLowerCase().replace(/\s+/g, '')

export const normalizarNombre = (t: string): string => sinAcentos(limpiarTexto(t)).toLowerCase()

const dos = (n: string) => n.padStart(2, '0')

// Acepta AAAA-MM-DD (con hora opcional) o DD/MM/AAAA y devuelve AAAA-MM-DD válido
export function fechaDeHoja(texto: string): string | null {
  const t = texto.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(t)
  const mx = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/.exec(t)
  const partes = iso ? [iso[1], iso[2], iso[3]] : mx ? [mx[3], mx[2], mx[1]] : null
  if (!partes) return null
  const [a, m, d] = partes
  const normal = `${a}-${dos(m)}-${dos(d)}`
  return aTextoIso(fechaCalendario(Number(a), Number(m), Number(d))) === normal ? normal : null
}

export function parsearFilasHoja(valores: string[][]): { colaboradores: ColaboradorHoja[]; descartadas: number } {
  if (valores.length === 0) return { colaboradores: [], descartadas: 0 }
  const columnas = valores[0].map(claveEncabezado)
  const indice = (campo: keyof ColaboradorHoja) => columnas.indexOf(ENCABEZADOS[campo])
  const faltan = OBLIGATORIAS.filter((c) => indice(c) < 0)
  if (faltan.length) throw new Error(`La hoja no tiene las columnas: ${faltan.map((c) => ENCABEZADOS[c]).join(', ')}`)

  const vistos = new Set<string>()
  const colaboradores: ColaboradorHoja[] = []
  let descartadas = 0
  for (const fila of valores.slice(1)) {
    const texto = (campo: TextoHoja) => (indice(campo) < 0 ? '' : limpiarTexto(String(fila[indice(campo)] ?? '')))
    const fecha = (campo: 'fecha_ingreso' | 'fecha_baja') => (indice(campo) < 0 ? null : fechaDeHoja(String(fila[indice(campo)] ?? '')))
    const id = texto('id_interno')
    if (!ID_VALIDO.test(id) || !texto('nombre') || vistos.has(id)) {
      if (fila.some((c) => String(c ?? '').trim())) descartadas++
      continue
    }
    vistos.add(id)
    colaboradores.push({
      id_interno: id, numero: texto('numero'), nombre: texto('nombre'), plaza: texto('plaza'),
      departamento: texto('departamento'), empresa: texto('empresa'), puesto: texto('puesto'),
      fecha_ingreso: fecha('fecha_ingreso'), zona: texto('zona'), jefe: texto('jefe'), gerente: texto('gerente'),
      fecha_baja: fecha('fecha_baja'), motivo_baja: texto('motivo_baja'),
    })
  }
  return { colaboradores, descartadas }
}

export function buscarColaboradores(filas: ColaboradorHoja[], texto: string): ColaboradorHoja[] {
  const palabras = normalizarNombre(texto).split(' ').filter(Boolean)
  if (!palabras.length) return filas
  return filas.filter((f) => {
    const pajar = normalizarNombre(`${f.nombre} ${f.numero} ${f.puesto}`)
    return palabras.every((p) => pajar.includes(p))
  })
}

export const etiquetaColaboradorHoja = (f: ColaboradorHoja): string =>
  [aTitulo(f.nombre), f.numero, aTitulo(f.puesto)].filter(Boolean).join(' · ')

export interface EntradaResuelta { valor: string; etiqueta: string; nueva: boolean }

// Reutiliza la entrada del catálogo que coincide; si no existe propone una nueva
export function resolverEntradaCatalogo(items: ItemCatalogo[], texto: string): EntradaResuelta | null {
  const etiqueta = aTitulo(texto)
  const valor = slug(etiqueta)
  if (!valor) return null
  const clave = normalizarNombre(etiqueta)
  const existente = items.find((i) => i.valor === valor || normalizarNombre(i.etiqueta) === clave)
  return existente
    ? { valor: existente.valor, etiqueta: existente.etiqueta, nueva: false }
    : { valor, etiqueta, nueva: true }
}

export type EstadoSugerencia = 'exacta' | 'ambigua' | 'sin_coincidencia'
export interface Sugerencia { estado: EstadoSugerencia; candidatos: ColaboradorHoja[] }
export interface ExistenteEnlace { id: string; nombre: string; id_interno: string | null }
export interface FilaEnlace extends ExistenteEnlace { sugerencia: Sugerencia | null }

export function planearEnlace(existentes: ExistenteEnlace[], hoja: ColaboradorHoja[]): FilaEnlace[] {
  const vinculados = new Set(existentes.flatMap((e) => (e.id_interno ? [e.id_interno] : [])))
  const repetidos = new Map<string, number>()
  for (const e of existentes) {
    if (!e.id_interno) repetidos.set(normalizarNombre(e.nombre), (repetidos.get(normalizarNombre(e.nombre)) ?? 0) + 1)
  }
  return existentes.map((e) => {
    if (e.id_interno) return { ...e, sugerencia: null }
    const clave = normalizarNombre(e.nombre)
    const candidatos = hoja.filter((f) => !vinculados.has(f.id_interno) && normalizarNombre(f.nombre) === clave)
    const estado: EstadoSugerencia = candidatos.length === 0 ? 'sin_coincidencia'
      : candidatos.length > 1 || (repetidos.get(clave) ?? 0) > 1 ? 'ambigua' : 'exacta'
    return { ...e, sugerencia: { estado, candidatos } }
  })
}

// Datos del colaborador que se copian a cada registro para conservar el histórico
export function copiaDeColaborador(c: Record<string, unknown>): Valores {
  const texto = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return { colaborador_nombre: texto(c.nombre), colaborador_plaza: texto(c.plaza), colaborador_puesto: texto(c.puesto) }
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm vitest run src/domain/colaboradores-hoja.test.ts`
Expected: PASS.

- [ ] **Step 5: Búsqueda por palabras en el selector.** En `src/presentation/ui/seleccion.ts` sustituir `filtrarOpciones` por:

```ts
export function filtrarOpciones(opciones: OpcionSeleccion[], texto: string): OpcionSeleccion[] {
  const palabras = plegar(texto.trim()).split(/\s+/).filter(Boolean)
  if (!palabras.length) return opciones
  return opciones.filter((o) => {
    const etiqueta = plegar(o.etiqueta)
    return palabras.every((p) => etiqueta.includes(p))
  })
}
```

Agregar a `src/presentation/ui/seleccion.test.ts` (dentro del `describe` de `filtrarOpciones` si existe, o uno nuevo) esta prueba y ejecutar `pnpm vitest run src/presentation/ui/seleccion.test.ts`:

```ts
it('exige todas las palabras sin importar el orden', () => {
  const ops = [{ valor: '1', etiqueta: 'Carlos Alberto Torres' }, { valor: '2', etiqueta: 'María Torres' }]
  expect(filtrarOpciones(ops, 'torres carlos').map((o) => o.valor)).toEqual(['1'])
})
```

---

### Task 2: Cachés (servidor y navegador)

**Files:**
- Create: `src/domain/cache-con-respaldo.ts`, `src/domain/cache-con-respaldo.test.ts`, `src/application/colaboradores-hoja-cliente.ts`, `src/application/colaboradores-hoja-cliente.test.ts`

**Interfaces:**
- Produces: `crearCacheConRespaldo<T>(cargar, { ttlMs, minForzarMs, ahora? }): (forzar?: boolean) => Promise<LecturaCache<T>>`; `crearClienteHoja(dep, opciones?): { obtener(forzar?): Promise<RespuestaHoja>; vaciar(): void }`; `RespuestaHoja { colaboradores: ColaboradorHoja[]; cargadoEn: number; desactualizado: boolean }`.

- [ ] **Step 1: Pruebas** `src/domain/cache-con-respaldo.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import { crearCacheConRespaldo } from './cache-con-respaldo'

function preparar(cargar = vi.fn(async () => 'dato')) {
  let t = 0
  const leer = crearCacheConRespaldo(cargar, { ttlMs: 1000, minForzarMs: 100, ahora: () => t })
  return { leer, cargar, avanzar: (ms: number) => { t += ms } }
}

describe('crearCacheConRespaldo', () => {
  it('sirve de la caché mientras no venza el TTL', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(999)
    expect((await leer()).desactualizado).toBe(false)
    expect(cargar).toHaveBeenCalledTimes(1)
  })

  it('recarga al vencer el TTL', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(1000)
    await leer()
    expect(cargar).toHaveBeenCalledTimes(2)
  })

  it('comparte una sola carga entre llamadas simultáneas', async () => {
    const { leer, cargar } = preparar()
    await Promise.all([leer(), leer(), leer()])
    expect(cargar).toHaveBeenCalledTimes(1)
  })

  it('sirve la última copia marcada como desactualizada si la recarga falla', async () => {
    const cargar = vi.fn().mockResolvedValueOnce('uno').mockRejectedValueOnce(new Error('x'))
    const { leer, avanzar } = preparar(cargar)
    await leer()
    avanzar(2000)
    expect(await leer()).toMatchObject({ dato: 'uno', desactualizado: true })
  })

  it('propaga el error si no hay copia previa', async () => {
    const { leer } = preparar(vi.fn().mockRejectedValue(new Error('x')))
    await expect(leer()).rejects.toThrow('x')
  })

  it('ignora una recarga forzada dentro del mínimo y la acepta después', async () => {
    const { leer, cargar, avanzar } = preparar()
    await leer()
    avanzar(50)
    await leer(true)
    expect(cargar).toHaveBeenCalledTimes(1)
    avanzar(60)
    await leer(true)
    expect(cargar).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla.** Run: `pnpm vitest run src/domain/cache-con-respaldo.test.ts` → FAIL.

- [ ] **Step 3: Implementar** `src/domain/cache-con-respaldo.ts`

```ts
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
```

- [ ] **Step 4: Ejecutar y ver que pasa.** Run: `pnpm vitest run src/domain/cache-con-respaldo.test.ts` → PASS.

- [ ] **Step 5: Pruebas del cliente** `src/application/colaboradores-hoja-cliente.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { crearClienteHoja, type RespuestaHoja } from './colaboradores-hoja-cliente'

const fila = { id_interno: '1', nombre: 'ANA' } as ColaboradorHoja
const respuesta = (n = 1): RespuestaHoja => ({ colaboradores: [{ ...fila, id_interno: String(n) }], cargadoEn: 0, desactualizado: false })

function almacenFalso() {
  const datos = new Map<string, string>()
  return { datos, getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v), removeItem: (k: string) => void datos.delete(k) }
}

function preparar(pedir = vi.fn(async () => respuesta()), almacen: ReturnType<typeof almacenFalso> | null = almacenFalso()) {
  let t = 0
  const cliente = crearClienteHoja({ pedir, almacen, ahora: () => t }, { ttlMs: 1000, minForzarMs: 100 })
  return { cliente, pedir, almacen, avanzar: (ms: number) => { t += ms } }
}

describe('crearClienteHoja', () => {
  it('pide una sola vez aunque haya varias lecturas simultáneas', async () => {
    const { cliente, pedir } = preparar()
    await Promise.all([cliente.obtener(), cliente.obtener()])
    expect(pedir).toHaveBeenCalledTimes(1)
  })

  it('no vuelve a pedir dentro del TTL y recarga después', async () => {
    const { cliente, pedir, avanzar } = preparar()
    await cliente.obtener()
    avanzar(999)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(1)
    avanzar(2)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(2)
  })

  it('reutiliza lo guardado en la sesión al crear un cliente nuevo', async () => {
    const almacen = almacenFalso()
    await preparar(undefined, almacen).cliente.obtener()
    const otro = preparar(vi.fn(async () => respuesta(2)), almacen)
    expect((await otro.cliente.obtener()).colaboradores[0].id_interno).toBe('1')
    expect(otro.pedir).not.toHaveBeenCalled()
  })

  it('ignora un recargar forzado dentro del mínimo', async () => {
    const { cliente, pedir, avanzar } = preparar()
    await cliente.obtener()
    avanzar(50)
    await cliente.obtener(true)
    expect(pedir).toHaveBeenCalledTimes(1)
    avanzar(60)
    await cliente.obtener(true)
    expect(pedir).toHaveBeenCalledTimes(2)
  })

  it('con error devuelve la copia previa como desactualizada', async () => {
    const pedir = vi.fn().mockResolvedValueOnce(respuesta()).mockRejectedValueOnce(new Error('x'))
    const { cliente, avanzar } = preparar(pedir)
    await cliente.obtener()
    avanzar(2000)
    expect(await cliente.obtener()).toMatchObject({ desactualizado: true })
  })

  it('con error y sin copia propaga el error', async () => {
    const { cliente } = preparar(vi.fn().mockRejectedValue(new Error('sin red')))
    await expect(cliente.obtener()).rejects.toThrow('sin red')
  })

  it('funciona sin almacenamiento y descarta datos guardados corruptos', async () => {
    await expect(preparar(undefined, null).cliente.obtener()).resolves.toBeTruthy()
    const almacen = almacenFalso()
    almacen.datos.set('epl.sh.colaboradores-hoja.v1', '{no es json')
    await expect(preparar(undefined, almacen).cliente.obtener()).resolves.toBeTruthy()
  })

  it('vaciar borra la copia de la sesión', async () => {
    const { cliente, almacen, pedir } = preparar()
    await cliente.obtener()
    cliente.vaciar()
    expect(almacen!.datos.size).toBe(0)
    await cliente.obtener()
    expect(pedir).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 6: Ejecutar y ver que falla.** Run: `pnpm vitest run src/application/colaboradores-hoja-cliente.test.ts` → FAIL.

- [ ] **Step 7: Implementar** `src/application/colaboradores-hoja-cliente.ts`

```ts
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
```

- [ ] **Step 8: Ejecutar y ver que pasa.** Run: `pnpm vitest run src/application/colaboradores-hoja-cliente.test.ts` → PASS.

---

### Task 3: Acceso a rutas y operaciones de colaboradores en el servidor

**Files:**
- Create: `src/domain/acceso-api.ts`, `src/domain/acceso-api.test.ts`, `src/application/colaboradores-servidor.ts`, `src/application/colaboradores-servidor.test.ts`

**Interfaces:**
- Consumes: `ColaboradorHoja`, `resolverEntradaCatalogo` (Task 1); `UsuarioDoc`, `puede`, `esCorreoPermitido`, `Accion` de `src/domain/permisos.ts`.
- Produces: `decidirAcceso(claims, usuario, dominio, accion): Rechazo | null`; `TxColaboradores`, `AlmacenColaboradores`, `ErrorColaborador`, `asegurarColaborador(almacen, fila): Promise<{ uid: string; creado: boolean }>`, `vincularColaborador(almacen, uid, fila): Promise<void>`, `desvincularColaborador(almacen, uid): Promise<void>`.

- [ ] **Step 1: Pruebas de acceso** `src/domain/acceso-api.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { decidirAcceso } from './acceso-api'

const ok = { email: 'a@grupoepl.com.mx', email_verified: true }
const usuario = (rol: 'admin' | 'capturista' | 'consulta', activo = true) => ({ email: 'a@grupoepl.com.mx', rol, activo })

describe('decidirAcceso', () => {
  it('rechaza sin sesión con 401', () => {
    expect(decidirAcceso(null, null, 'grupoepl.com.mx', 'leer')?.estado).toBe(401)
  })
  it('rechaza correo no verificado o de otro dominio con 403', () => {
    expect(decidirAcceso({ ...ok, email_verified: false }, usuario('admin'), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
    expect(decidirAcceso({ email: 'a@otro.com', email_verified: true }, usuario('admin'), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
  })
  it('exige rol activo con permiso para la acción', () => {
    expect(decidirAcceso(ok, null, 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('consulta'), 'grupoepl.com.mx', 'capturar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('capturista'), 'grupoepl.com.mx', 'administrar')?.estado).toBe(403)
    expect(decidirAcceso(ok, usuario('admin', false), 'grupoepl.com.mx', 'leer')?.estado).toBe(403)
  })
  it('permite cuando todo cumple', () => {
    expect(decidirAcceso(ok, usuario('capturista'), 'grupoepl.com.mx', 'capturar')).toBeNull()
    expect(decidirAcceso(ok, usuario('admin'), 'grupoepl.com.mx', 'administrar')).toBeNull()
  })
})
```

- [ ] **Step 2: Ver que falla.** Run: `pnpm vitest run src/domain/acceso-api.test.ts` → FAIL.

- [ ] **Step 3: Implementar** `src/domain/acceso-api.ts`

```ts
import { esCorreoPermitido, puede, type Accion, type UsuarioDoc } from './permisos'

export interface Rechazo { estado: 401 | 403; mensaje: string }
export interface Claims { email?: string; email_verified?: boolean }

export function decidirAcceso(
  claims: Claims | null, usuario: UsuarioDoc | null, dominio: string, accion: Accion,
): Rechazo | null {
  if (!claims) return { estado: 401, mensaje: 'Sesión inválida' }
  if (claims.email_verified !== true || !esCorreoPermitido(claims.email, dominio)) {
    return { estado: 403, mensaje: 'Cuenta no permitida' }
  }
  return puede(usuario, accion) ? null : { estado: 403, mensaje: 'Sin permiso para esta acción' }
}
```

- [ ] **Step 4: Ver que pasa.** Run: `pnpm vitest run src/domain/acceso-api.test.ts` → PASS.

- [ ] **Step 5: Pruebas del servidor** `src/application/colaboradores-servidor.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import {
  asegurarColaborador, desvincularColaborador, ErrorColaborador, vincularColaborador,
  type AlmacenColaboradores, type TxColaboradores,
} from './colaboradores-servidor'

function almacenMemoria(inicial: { colaboradores?: Record<string, Record<string, unknown>>; catalogos?: Record<string, ItemCatalogo[]> } = {}) {
  const colaboradores = new Map(Object.entries(inicial.colaboradores ?? {}))
  const catalogos = new Map(Object.entries(inicial.catalogos ?? {}))
  const indice = new Map<string, string>()
  for (const [uid, c] of colaboradores) if (typeof c.id_interno === 'string') indice.set(c.id_interno, uid)
  let siguiente = 0
  const almacen: AlmacenColaboradores = {
    async transaccion(fn) {
      let escribio = false
      const leer = <T,>(v: T) => { if (escribio) throw new Error('lectura después de escribir'); return Promise.resolve(v) }
      const escribir = (f: () => void) => { escribio = true; f() }
      const tx: TxColaboradores = {
        leerIndice: (id) => leer(indice.get(id) ?? null),
        leerColaborador: (uid) => leer(colaboradores.get(uid) ?? null),
        leerCatalogo: (id) => leer(catalogos.get(id) ?? []),
        escribirCatalogo: (id, items) => escribir(() => void catalogos.set(id, items)),
        nuevoId: () => `uid${++siguiente}`,
        crearColaborador: (uid, datos) => escribir(() => void colaboradores.set(uid, datos)),
        actualizarColaborador: (uid, datos) => escribir(() => void colaboradores.set(uid, { ...colaboradores.get(uid), ...datos })),
        quitarIdInterno: (uid) => escribir(() => { const { id_interno: _omitido, ...resto } = colaboradores.get(uid) ?? {}; colaboradores.set(uid, resto) }),
        escribirIndice: (id, uid) => escribir(() => void indice.set(id, uid)),
        borrarIndice: (id) => escribir(() => void indice.delete(id)),
      }
      return fn(tx)
    },
  }
  return { almacen, colaboradores, catalogos, indice }
}

const fila = (o: Partial<ColaboradorHoja> = {}): ColaboradorHoja => ({
  id_interno: '12066', numero: '2120', nombre: 'ADALBERTO GUTIERREZ MIRANDA', plaza: 'LEON', departamento: 'SEGURIDAD',
  empresa: 'SICMART SA DE CV', puesto: 'GUARDIA DE SEGURIDAD', fecha_ingreso: '2026-09-28', zona: 'Bajío Centro',
  jefe: 'JOSE', gerente: 'ALFONSO', fecha_baja: null, motivo_baja: '', ...o,
})

describe('asegurarColaborador', () => {
  it('crea el colaborador con los datos de la hoja y agrega las entradas de catálogo faltantes', async () => {
    const m = almacenMemoria({ catalogos: { ciudades: [{ valor: 'leon', etiqueta: 'León' }] } })
    const r = await asegurarColaborador(m.almacen, fila())
    expect(r).toEqual({ uid: 'uid1', creado: true })
    expect(m.colaboradores.get('uid1')).toMatchObject({
      nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon', area: 'seguridad', linea_negocio: 'sicmart-sa-de-cv',
      id_interno: '12066', numero_colaborador: '2120', puesto: 'GUARDIA DE SEGURIDAD', plaza: 'LEON', activo: true,
    })
    expect(m.catalogos.get('areas')).toEqual([{ valor: 'seguridad', etiqueta: 'Seguridad' }])
    expect(m.catalogos.get('ciudades')).toEqual([{ valor: 'leon', etiqueta: 'León' }])
    expect(m.indice.get('12066')).toBe('uid1')
  })

  it('devuelve el colaborador existente sin duplicar', async () => {
    const m = almacenMemoria()
    await asegurarColaborador(m.almacen, fila())
    const r = await asegurarColaborador(m.almacen, fila())
    expect(r).toEqual({ uid: 'uid1', creado: false })
    expect(m.colaboradores.size).toBe(1)
  })

  it('rechaza a quien está dado de baja en la hoja', async () => {
    const m = almacenMemoria()
    await expect(asegurarColaborador(m.almacen, fila({ fecha_baja: '2026-10-01' }))).rejects.toMatchObject({ estado: 409 })
    expect(m.colaboradores.size).toBe(0)
  })

  it('rechaza si faltan Plaza o Empresa, que son obligatorias', async () => {
    const m = almacenMemoria()
    await expect(asegurarColaborador(m.almacen, fila({ plaza: '' }))).rejects.toBeInstanceOf(ErrorColaborador)
    await expect(asegurarColaborador(m.almacen, fila({ empresa: '' }))).rejects.toMatchObject({ estado: 422 })
  })

  it('deja el área en null si Departamento viene vacío', async () => {
    const m = almacenMemoria()
    await asegurarColaborador(m.almacen, fila({ departamento: '' }))
    expect(m.colaboradores.get('uid1')?.area).toBeNull()
  })
})

describe('vincularColaborador', () => {
  const existente = { nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon-gto', activo: true }

  it('completa lo faltante sin pisar ciudad, área ni línea ya capturadas', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, area: 'mantenimiento' } } })
    await vincularColaborador(m.almacen, 'a', fila())
    expect(m.colaboradores.get('a')).toMatchObject({
      nombre: 'Adalberto Gutierrez Miranda', ciudad: 'leon-gto', area: 'mantenimiento', linea_negocio: 'sicmart-sa-de-cv',
      id_interno: '12066', puesto: 'GUARDIA DE SEGURIDAD', numero_colaborador: '2120',
    })
    expect(m.catalogos.get('ciudades')).toBeUndefined()
    expect(m.indice.get('12066')).toBe('a')
  })

  it('rechaza si la fila ya pertenece a otro colaborador', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente, b: { nombre: 'Otro', id_interno: '12066' } } })
    await expect(vincularColaborador(m.almacen, 'a', fila())).rejects.toMatchObject({ estado: 409 })
  })

  it('rechaza si el colaborador ya está vinculado a otra fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: { ...existente, id_interno: '1' } } })
    await expect(vincularColaborador(m.almacen, 'a', fila())).rejects.toMatchObject({ estado: 409 })
  })

  it('responde 404 si el colaborador no existe', async () => {
    await expect(vincularColaborador(almacenMemoria().almacen, 'zz', fila())).rejects.toMatchObject({ estado: 404 })
  })

  it('es idempotente con la misma fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: existente } })
    await vincularColaborador(m.almacen, 'a', fila())
    await expect(vincularColaborador(m.almacen, 'a', fila())).resolves.toBeUndefined()
  })
})

describe('desvincularColaborador', () => {
  it('quita el id_interno y libera la fila', async () => {
    const m = almacenMemoria({ colaboradores: { a: { nombre: 'X', id_interno: '12066' } } })
    await desvincularColaborador(m.almacen, 'a')
    expect(m.colaboradores.get('a')).toEqual({ nombre: 'X' })
    expect(m.indice.has('12066')).toBe(false)
  })

  it('no hace nada si no estaba vinculado y falla si no existe', async () => {
    const m = almacenMemoria({ colaboradores: { a: { nombre: 'X' } } })
    await expect(desvincularColaborador(m.almacen, 'a')).resolves.toBeUndefined()
    await expect(desvincularColaborador(m.almacen, 'zz')).rejects.toMatchObject({ estado: 404 })
  })
})
```

- [ ] **Step 6: Ver que falla.** Run: `pnpm vitest run src/application/colaboradores-servidor.test.ts` → FAIL.

- [ ] **Step 7: Implementar** `src/application/colaboradores-servidor.ts`

```ts
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import { resolverEntradaCatalogo, type ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { deTextoIso } from '@/domain/fechas'
import { aTitulo } from '@/domain/texto'

export interface TxColaboradores {
  leerIndice(idInterno: string): Promise<string | null>
  leerColaborador(uid: string): Promise<Record<string, unknown> | null>
  leerCatalogo(id: string): Promise<ItemCatalogo[]>
  escribirCatalogo(id: string, items: ItemCatalogo[]): void
  nuevoId(): string
  crearColaborador(uid: string, datos: Record<string, unknown>): void
  actualizarColaborador(uid: string, datos: Record<string, unknown>): void
  quitarIdInterno(uid: string): void
  escribirIndice(idInterno: string, uid: string): void
  borrarIndice(idInterno: string): void
}

export interface AlmacenColaboradores {
  transaccion<T>(fn: (tx: TxColaboradores) => Promise<T>): Promise<T>
}

export class ErrorColaborador extends Error {
  constructor(readonly estado: number, mensaje: string) { super(mensaje) }
}

type CampoCatalogo = 'ciudad' | 'area' | 'linea_negocio'
const CATALOGOS: { campo: CampoCatalogo; catalogo: string; texto: (f: ColaboradorHoja) => string; obligatorio: boolean; origen: string }[] = [
  { campo: 'ciudad', catalogo: 'ciudades', texto: (f) => f.plaza, obligatorio: true, origen: 'Plaza' },
  { campo: 'area', catalogo: 'areas', texto: (f) => f.departamento, obligatorio: false, origen: 'Departamento' },
  { campo: 'linea_negocio', catalogo: 'lineas_negocio', texto: (f) => f.empresa, obligatorio: true, origen: 'Empresa' },
]

// Lee los catálogos necesarios antes de cualquier escritura, como exigen las transacciones
async function resolverCatalogos(tx: TxColaboradores, fila: ColaboradorHoja, campos: CampoCatalogo[]) {
  const valores: Partial<Record<CampoCatalogo, string | null>> = {}
  const nuevos = new Map<string, ItemCatalogo[]>()
  for (const c of CATALOGOS.filter((x) => campos.includes(x.campo))) {
    const items = await tx.leerCatalogo(c.catalogo)
    const entrada = resolverEntradaCatalogo(items, c.texto(fila))
    if (!entrada) {
      if (c.obligatorio) throw new ErrorColaborador(422, `La hoja no trae ${c.origen} para este colaborador`)
      valores[c.campo] = null
      continue
    }
    valores[c.campo] = entrada.valor
    if (entrada.nueva) nuevos.set(c.catalogo, [...items, { valor: entrada.valor, etiqueta: entrada.etiqueta }])
  }
  return { valores, nuevos }
}

const datosDeHoja = (f: ColaboradorHoja) => ({
  id_interno: f.id_interno, numero_colaborador: f.numero, puesto: f.puesto, zona: f.zona, plaza: f.plaza,
  empresa: f.empresa, jefe: f.jefe, gerente: f.gerente, motivo_baja: f.motivo_baja,
  fecha_baja: f.fecha_baja ? deTextoIso(f.fecha_baja) : null,
})

export async function asegurarColaborador(almacen: AlmacenColaboradores, fila: ColaboradorHoja) {
  if (fila.fecha_baja) throw new ErrorColaborador(409, 'El colaborador está dado de baja en la hoja')
  return almacen.transaccion(async (tx) => {
    const existente = await tx.leerIndice(fila.id_interno)
    if (existente) return { uid: existente, creado: false }
    const { valores, nuevos } = await resolverCatalogos(tx, fila, ['ciudad', 'area', 'linea_negocio'])
    for (const [id, items] of nuevos) tx.escribirCatalogo(id, items)
    const uid = tx.nuevoId()
    tx.crearColaborador(uid, {
      ...datosDeHoja(fila), ...valores, nombre: aTitulo(fila.nombre),
      fecha_ingreso: fila.fecha_ingreso ? deTextoIso(fila.fecha_ingreso) : null, activo: true,
    })
    tx.escribirIndice(fila.id_interno, uid)
    return { uid, creado: true }
  })
}

export async function vincularColaborador(almacen: AlmacenColaboradores, uid: string, fila: ColaboradorHoja) {
  await almacen.transaccion(async (tx) => {
    const dueno = await tx.leerIndice(fila.id_interno)
    if (dueno && dueno !== uid) throw new ErrorColaborador(409, 'Esa fila ya está vinculada a otro colaborador')
    const actual = await tx.leerColaborador(uid)
    if (!actual) throw new ErrorColaborador(404, 'El colaborador no existe')
    if (typeof actual.id_interno === 'string' && actual.id_interno !== fila.id_interno) {
      throw new ErrorColaborador(409, 'El colaborador ya está vinculado a otra fila')
    }
    const faltantes = CATALOGOS.map((c) => c.campo).filter((campo) => !actual[campo])
    const { valores, nuevos } = await resolverCatalogos(tx, fila, faltantes)
    for (const [id, items] of nuevos) tx.escribirCatalogo(id, items)
    tx.actualizarColaborador(uid, {
      ...datosDeHoja(fila), ...valores,
      ...(actual.fecha_ingreso || !fila.fecha_ingreso ? {} : { fecha_ingreso: deTextoIso(fila.fecha_ingreso) }),
    })
    tx.escribirIndice(fila.id_interno, uid)
  })
}

export async function desvincularColaborador(almacen: AlmacenColaboradores, uid: string) {
  await almacen.transaccion(async (tx) => {
    const actual = await tx.leerColaborador(uid)
    if (!actual) throw new ErrorColaborador(404, 'El colaborador no existe')
    if (typeof actual.id_interno !== 'string') return
    tx.borrarIndice(actual.id_interno)
    tx.quitarIdInterno(uid)
  })
}
```

- [ ] **Step 8: Ver que pasa.** Run: `pnpm vitest run src/application/colaboradores-servidor.test.ts` → PASS.

---

### Task 4: Servidor (dependencias, adaptador, hoja y rutas)

**Files:**
- Modify: `package.json` (dependencias)
- Create: `src/infrastructure/servidor/admin.ts`, `src/infrastructure/servidor/almacen-admin.ts`, `src/infrastructure/servidor/autorizar.ts`, `src/infrastructure/servidor/hoja.ts`, `src/app/api/colaboradores-hoja/route.ts`, `src/app/api/colaboradores/asegurar/route.ts`, `src/app/api/colaboradores/enlace/route.ts`

**Interfaces:**
- Consumes: Task 1 (`parsearFilasHoja`, `planearEnlace`), Task 2 (`crearCacheConRespaldo`), Task 3 (`decidirAcceso`, operaciones de colaboradores).
- Produces: `GET /api/colaboradores-hoja[?forzar=1]` → `{ colaboradores, cargadoEn, desactualizado }`; `POST /api/colaboradores/asegurar` `{ id_interno }` → `{ uid, creado }`; `GET /api/colaboradores/enlace` → `{ filas: FilaEnlace[]; hoja: ColaboradorHoja[] }`; `POST /api/colaboradores/enlace` `{ accion: 'vincular', uid, id_interno } | { accion: 'desvincular', uid }` → `{ ok: true }`.

- [ ] **Step 1: Instalar dependencias.** Run: `pnpm add firebase-admin google-auth-library`. Expected: ambas aparecen en `dependencies` de `package.json`.

- [ ] **Step 2: Crear** `src/infrastructure/servidor/admin.ts`

```ts
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { leerConfiguracion } from '@/infrastructure/firebase/configuracion'

// Accesos estáticos para que Next.js resuelva las variables igual que en el cliente
export const configuracionServidor = () => leerConfiguracion({
  NEXT_PUBLIC_FIRESTORE_DATABASE: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE,
  NEXT_PUBLIC_DOMINIO_PERMITIDO: process.env.NEXT_PUBLIC_DOMINIO_PERMITIDO,
})

const app = () => (getApps().length
  ? getApp()
  : initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }))

export const adminAuth = () => getAuth(app())
export const adminDb = () => getFirestore(app(), configuracionServidor().baseDatos)
```

- [ ] **Step 3: Crear** `src/infrastructure/servidor/almacen-admin.ts`

```ts
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { ItemCatalogo } from '@/domain/catalogos-iniciales'
import type { AlmacenColaboradores } from '@/application/colaboradores-servidor'

export function crearAlmacenAdmin(db: Firestore, actor: string): AlmacenColaboradores {
  const marca = () => FieldValue.serverTimestamp()
  return {
    transaccion: (fn) => db.runTransaction((t) => fn({
      leerIndice: async (id) => ((await t.get(db.doc(`indice_id_interno/${id}`))).data()?.uid as string | undefined) ?? null,
      leerColaborador: async (uid) => {
        const snap = await t.get(db.doc(`colaboradores/${uid}`))
        return snap.exists ? (snap.data() ?? null) : null
      },
      leerCatalogo: async (id) => ((await t.get(db.doc(`catalogos/${id}`))).data()?.items ?? []) as ItemCatalogo[],
      escribirCatalogo: (id, items) => {
        t.set(db.doc(`catalogos/${id}`), { items, actualizado_por: actor, actualizado_en: marca() }, { merge: true })
      },
      nuevoId: () => db.collection('colaboradores').doc().id,
      crearColaborador: (uid, datos) => {
        t.create(db.doc(`colaboradores/${uid}`), {
          ...datos, creado_por: actor, creado_en: marca(), actualizado_por: actor, actualizado_en: marca(),
        })
      },
      actualizarColaborador: (uid, datos) => {
        t.update(db.doc(`colaboradores/${uid}`), { ...datos, actualizado_por: actor, actualizado_en: marca() })
      },
      quitarIdInterno: (uid) => {
        t.update(db.doc(`colaboradores/${uid}`), { id_interno: FieldValue.delete(), actualizado_por: actor, actualizado_en: marca() })
      },
      escribirIndice: (id, uid) => {
        t.set(db.doc(`indice_id_interno/${id}`), { uid, actualizado_por: actor, actualizado_en: marca() })
      },
      borrarIndice: (id) => { t.delete(db.doc(`indice_id_interno/${id}`)) },
    })),
  }
}
```

- [ ] **Step 4: Crear** `src/infrastructure/servidor/autorizar.ts`

```ts
import { decidirAcceso } from '@/domain/acceso-api'
import type { Accion, UsuarioDoc } from '@/domain/permisos'
import { adminAuth, adminDb, configuracionServidor } from './admin'

export interface Llamante { uid: string }

// Devuelve el llamante autorizado o la respuesta de rechazo lista para regresar
export async function autorizar(req: Request, accion: Accion): Promise<Llamante | Response> {
  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  const claims = token ? await adminAuth().verifyIdToken(token).catch(() => null) : null
  const usuario = claims
    ? ((await adminDb().doc(`usuarios/${claims.uid}`).get()).data() as UsuarioDoc | undefined) ?? null
    : null
  const rechazo = decidirAcceso(claims, usuario, configuracionServidor().dominioPermitido, accion)
  return rechazo ? Response.json({ error: rechazo.mensaje }, { status: rechazo.estado }) : { uid: claims!.uid }
}

export async function leerCuerpo(req: Request): Promise<Record<string, unknown>> {
  const cuerpo: unknown = await req.json().catch(() => null)
  return cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {}
}
```

- [ ] **Step 5: Crear** `src/infrastructure/servidor/hoja.ts`

```ts
import { GoogleAuth } from 'google-auth-library'
import { crearCacheConRespaldo } from '@/domain/cache-con-respaldo'
import { parsearFilasHoja, type ColaboradorHoja } from '@/domain/colaboradores-hoja'

const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const auth = new GoogleAuth({ scopes: [ALCANCE] })

async function leerValores(): Promise<string[][]> {
  const id = process.env.COLABORADORES_SHEET_ID?.trim()
  if (!id) throw new Error('Falta COLABORADORES_SHEET_ID')
  const pestana = process.env.COLABORADORES_SHEET_TAB?.trim() || 'Colaboradores'
  const rango = encodeURIComponent(`'${pestana.replace(/'/g, "''")}'`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${rango}?valueRenderOption=FORMATTED_VALUE`
  const cliente = await auth.getClient()
  const { data } = await cliente.request<{ values?: string[][] }>({ url })
  return data.values ?? []
}

async function cargar(): Promise<ColaboradorHoja[]> {
  const { colaboradores, descartadas } = parsearFilasHoja(await leerValores())
  if (descartadas > 0) console.warn(`Hoja de colaboradores: ${descartadas} filas descartadas`)
  return colaboradores
}

export const leerHoja = crearCacheConRespaldo(cargar, { ttlMs: 10 * 60_000, minForzarMs: 60_000 })
```

- [ ] **Step 6: Crear** `src/app/api/colaboradores-hoja/route.ts`

```ts
import { autorizar } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const acceso = await autorizar(req, 'leer')
  if (acceso instanceof Response) return acceso
  try {
    const forzar = new URL(req.url).searchParams.get('forzar') === '1'
    const { dato, cargadoEn, desactualizado } = await leerHoja(forzar)
    return Response.json({ colaboradores: dato, cargadoEn, desactualizado })
  } catch (error) {
    console.error('No se pudo leer la hoja de colaboradores', error)
    return Response.json({ error: 'No se pudo leer la hoja de colaboradores' }, { status: 502 })
  }
}
```

- [ ] **Step 7: Crear** `src/app/api/colaboradores/asegurar/route.ts`

```ts
import { asegurarColaborador, ErrorColaborador } from '@/application/colaboradores-servidor'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'capturar')
  if (acceso instanceof Response) return acceso
  const { id_interno } = await leerCuerpo(req)
  if (typeof id_interno !== 'string' || !id_interno) return Response.json({ error: 'Falta id_interno' }, { status: 400 })
  try {
    const { dato } = await leerHoja()
    const fila = dato.find((f) => f.id_interno === id_interno)
    if (!fila) return Response.json({ error: 'No aparece en la hoja; actualiza la lista' }, { status: 404 })
    return Response.json(await asegurarColaborador(crearAlmacenAdmin(adminDb(), acceso.uid), fila))
  } catch (error) {
    if (error instanceof ErrorColaborador) return Response.json({ error: error.message }, { status: error.estado })
    console.error('No se pudo registrar al colaborador', error)
    return Response.json({ error: 'No se pudo registrar al colaborador' }, { status: 500 })
  }
}
```

- [ ] **Step 8: Crear** `src/app/api/colaboradores/enlace/route.ts`

```ts
import { desvincularColaborador, ErrorColaborador, vincularColaborador } from '@/application/colaboradores-servidor'
import { planearEnlace } from '@/domain/colaboradores-hoja'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  try {
    const forzar = new URL(req.url).searchParams.get('forzar') === '1'
    const [{ dato: hoja }, snap] = await Promise.all([leerHoja(forzar), adminDb().collection('colaboradores').get()])
    const existentes = snap.docs.map((d) => ({
      id: d.id,
      nombre: String(d.data().nombre ?? d.id),
      id_interno: typeof d.data().id_interno === 'string' ? (d.data().id_interno as string) : null,
    }))
    return Response.json({ filas: planearEnlace(existentes, hoja), hoja })
  } catch (error) {
    console.error('No se pudo preparar el enlace de colaboradores', error)
    return Response.json({ error: 'No se pudo preparar el enlace de colaboradores' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { accion, uid, id_interno } = await leerCuerpo(req)
  if (typeof uid !== 'string' || !uid) return Response.json({ error: 'Falta uid' }, { status: 400 })
  const almacen = crearAlmacenAdmin(adminDb(), acceso.uid)
  try {
    if (accion === 'desvincular') {
      await desvincularColaborador(almacen, uid)
    } else if (accion === 'vincular' && typeof id_interno === 'string') {
      const fila = (await leerHoja()).dato.find((f) => f.id_interno === id_interno)
      if (!fila) return Response.json({ error: 'No aparece en la hoja; actualiza la lista' }, { status: 404 })
      await vincularColaborador(almacen, uid, fila)
    } else {
      return Response.json({ error: 'Acción inválida' }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof ErrorColaborador) return Response.json({ error: error.message }, { status: error.estado })
    console.error('No se pudo actualizar el enlace', error)
    return Response.json({ error: 'No se pudo actualizar el enlace' }, { status: 500 })
  }
}
```

- [ ] **Step 9: Verificar tipos.** Run: `pnpm typecheck`. Expected: sin errores.

---

### Task 5: Cliente: llamadas a la API, hook y selector

**Files:**
- Create: `src/infrastructure/api/colaboradores.ts`, `src/presentation/colaboradores/useColaboradoresHoja.ts`, `src/presentation/colaboradores/SelectorColaboradorHoja.tsx`
- Modify: `src/presentation/datos/CampoEntrada.tsx`, `src/presentation/auth/AuthProvider.tsx`

**Interfaces:**
- Consumes: Task 2 (`crearClienteHoja`, `RespuestaHoja`), Task 4 (rutas), Task 1 (`etiquetaColaboradorHoja`).
- Produces: `clienteHoja`, `asegurarColaborador(idInterno): Promise<{ uid; creado }>`, `cargarEnlace(forzar)`, `vincular(uid, idInterno)`, `desvincular(uid)`; `useColaboradoresHoja(): { filas, cargando, error, desactualizado, actualizar }`; `<SelectorColaboradorHoja id etiquetaId valor deshabilitado alCambiar />` donde `valor` y `alCambiar` usan el UID de Firestore.

- [ ] **Step 1: Crear** `src/infrastructure/api/colaboradores.ts`

```ts
import { crearClienteHoja, type RespuestaHoja } from '@/application/colaboradores-hoja-cliente'
import type { ColaboradorHoja, FilaEnlace } from '@/domain/colaboradores-hoja'
import { auth } from '@/infrastructure/firebase/cliente'

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const respuesta = await fetch(ruta, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(typeof cuerpo.error === 'string' ? cuerpo.error : 'La solicitud falló')
  return cuerpo as T
}

const enviar = (cuerpo: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(cuerpo) })

function almacenSesion() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null }
}

export const clienteHoja = crearClienteHoja({
  pedir: (forzar) => llamar<RespuestaHoja>(`/api/colaboradores-hoja${forzar ? '?forzar=1' : ''}`),
  almacen: almacenSesion(),
})

export const asegurarColaborador = (idInterno: string) =>
  llamar<{ uid: string; creado: boolean }>('/api/colaboradores/asegurar', enviar({ id_interno: idInterno }))

export const cargarEnlace = (forzar = false) =>
  llamar<{ filas: FilaEnlace[]; hoja: ColaboradorHoja[] }>(`/api/colaboradores/enlace${forzar ? '?forzar=1' : ''}`)

export const vincular = (uid: string, idInterno: string) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'vincular', uid, id_interno: idInterno }))

export const desvincular = (uid: string) =>
  llamar<{ ok: true }>('/api/colaboradores/enlace', enviar({ accion: 'desvincular', uid }))
```

- [ ] **Step 2: Crear** `src/presentation/colaboradores/useColaboradoresHoja.ts`

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { clienteHoja } from '@/infrastructure/api/colaboradores'

interface Estado { filas: ColaboradorHoja[]; cargando: boolean; error: string | null; desactualizado: boolean }

export function useColaboradoresHoja() {
  const [estado, setEstado] = useState<Estado>({ filas: [], cargando: true, error: null, desactualizado: false })
  const montado = useRef(true)

  const cargar = useCallback((forzar: boolean) => {
    setEstado((p) => ({ ...p, cargando: true, error: null }))
    clienteHoja.obtener(forzar)
      .then((r) => { if (montado.current) setEstado({ filas: r.colaboradores, cargando: false, error: null, desactualizado: r.desactualizado }) })
      .catch((e: unknown) => {
        if (montado.current) setEstado((p) => ({ ...p, cargando: false, error: e instanceof Error ? e.message : 'No se pudo cargar la lista' }))
      })
  }, [])

  useEffect(() => {
    montado.current = true
    cargar(false)
    return () => { montado.current = false }
  }, [cargar])

  return { ...estado, actualizar: () => cargar(true) }
}
```

- [ ] **Step 3: Crear** `src/presentation/colaboradores/SelectorColaboradorHoja.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { etiquetaColaboradorHoja } from '@/domain/colaboradores-hoja'
import { asegurarColaborador } from '@/infrastructure/api/colaboradores'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { useColaboradoresHoja } from './useColaboradoresHoja'

const PREFIJO_UID = 'uid:'

export function SelectorColaboradorHoja({ id, etiquetaId, valor, deshabilitado = false, alCambiar, ...aria }: {
  id: string
  etiquetaId?: string
  valor: string
  deshabilitado?: boolean
  alCambiar: (uid: string) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}) {
  const { filas, cargando, error, desactualizado, actualizar } = useColaboradoresHoja()
  const { registros } = useColeccion('colaboradores')
  const [asegurando, setAsegurando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const actual = registros.find((r) => r.id === valor)
  const idActual = typeof actual?.id_interno === 'string' ? actual.id_interno : null

  const { opciones, seleccionado } = useMemo(() => {
    const lista = filas.filter((f) => !f.fecha_baja).map((f) => ({ valor: f.id_interno, etiqueta: etiquetaColaboradorHoja(f) }))
    if (!actual) return { opciones: lista, seleccionado: '' }
    if (idActual && lista.some((o) => o.valor === idActual)) return { opciones: lista, seleccionado: idActual }
    const sufijo = cargando ? '' : idActual ? ' (baja)' : ' (sin enlazar)'
    const propio = { valor: `${PREFIJO_UID}${actual.id}`, etiqueta: `${String(actual.nombre ?? actual.id)}${sufijo}` }
    return { opciones: [...lista, propio], seleccionado: propio.valor }
  }, [filas, actual, idActual, cargando])

  async function elegir(v: string) {
    setFallo(null)
    if (v === '') return alCambiar('')
    if (v.startsWith(PREFIJO_UID)) return alCambiar(v.slice(PREFIJO_UID.length))
    setAsegurando(true)
    try {
      alCambiar((await asegurarColaborador(v)).uid)
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo registrar al colaborador')
    } finally {
      setAsegurando(false)
    }
  }

  return (
    <>
      <SelectBuscable id={id} etiqueta="Colaborador" etiquetaId={etiquetaId} opciones={opciones} valor={seleccionado}
        textoVacio={cargando && filas.length === 0 ? 'Cargando lista...' : 'Selecciona'}
        deshabilitado={deshabilitado || asegurando} alCambiar={(v) => void elegir(v)} {...aria} />
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
        {asegurando && <span>Registrando colaborador...</span>}
        {desactualizado && <span>La lista puede estar desactualizada</span>}
        <button type="button" onClick={actualizar} disabled={cargando || asegurando} className="underline">
          Actualizar lista
        </button>
      </div>
      {(error || fallo) && <div className="mt-2"><AvisoError>{fallo ?? error}</AvisoError></div>}
    </>
  )
}
```

- [ ] **Step 4: Usarlo en `CampoEntrada`.** En `src/presentation/datos/CampoEntrada.tsx` agregar el import y reemplazar el bloque `if (campo.tipo === 'seleccion') { ... }`:

```tsx
import { SelectorColaboradorHoja } from '@/presentation/colaboradores/SelectorColaboradorHoja'
```

```tsx
  if (campo.tipo === 'seleccion' && campo.origen?.tipo === 'colaboradores') {
    control = (
      <SelectorColaboradorHoja id={id} etiquetaId={`${id}-et`} valor={typeof valor === 'string' ? valor : ''}
        deshabilitado={deshabilitado} alCambiar={(v) => alCambiar(v || null)} {...aria} />
    )
  } else if (campo.tipo === 'seleccion') {
```

(el resto de ese `if` queda igual).

- [ ] **Step 5: Vaciar la caché al cambiar de usuario.** En `src/presentation/auth/AuthProvider.tsx` importar `clienteHoja` y llamarlo junto a `almacenLecturas.vaciar()`:

```tsx
import { clienteHoja } from '@/infrastructure/api/colaboradores'
```

```tsx
      if ((u?.uid ?? null) !== uidPrevio) { almacenLecturas.vaciar(); clienteHoja.vaciar() }
```

- [ ] **Step 6: Verificar.** Run: `pnpm typecheck && pnpm vitest run`. Expected: sin errores y todas las pruebas en verde.

---

### Task 6: Alta de colaborador desde el dropdown y edición acotada

**Files:**
- Create: `src/presentation/colaboradores/AltaColaborador.tsx`
- Modify: `src/domain/modulos-definiciones.ts` (módulo `colaboradores`), `src/presentation/datos/PaginaModulo.tsx`, `src/presentation/datos/FormularioModulo.tsx`, `src/domain/modulos-definiciones.test.ts` (si asevera los campos de colaboradores)

**Interfaces:**
- Consumes: `useColaboradoresHoja`, `asegurarColaborador` (Task 5), `buscarColaboradores`, `etiquetaColaboradorHoja`.
- Produces: `<AltaColaborador alTerminar alCancelar />`; el módulo `colaboradores` con campos `numero_colaborador` y `puesto` y `bloquearEnEdicion`.

- [ ] **Step 1: Ajustar el módulo.** En `src/domain/modulos-definiciones.ts`, en `colaboradores`, agregar los dos campos después de `nombre`, incluirlos en `columnas` y bloquear en edición los que vienen de la hoja:

```ts
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, formato: 'titulo' },
    { nombre: 'numero_colaborador', etiqueta: 'No. de colaborador', tipo: 'texto' },
    { nombre: 'puesto', etiqueta: 'Puesto', tipo: 'texto' },
```

```ts
  columnas: ['nombre', 'numero_colaborador', 'puesto', 'ciudad', 'area', 'cuadrilla', 'fecha_ingreso', 'activo'],
  bloquearEnEdicion: ['nombre', 'numero_colaborador', 'puesto', 'ciudad', 'area', 'linea_negocio', 'fecha_ingreso'],
```

- [ ] **Step 2: No enviar campos bloqueados al guardar.** En `src/presentation/datos/FormularioModulo.tsx`, dentro de `enviar`, sustituir `const saneados = sanitizarValores(def.campos, valores)` por:

```tsx
    const saneados = restaurarBloqueados(def, registro, sanitizarValores(def.campos, valores))
```

y agregar sobre `export function FormularioModulo`:

```tsx
// Los campos bloqueados conservan lo guardado para que las reglas no vean cambios en ellos
function restaurarBloqueados(def: ModuloDef, registro: Registro | undefined, valores: Valores): Valores {
  if (!registro) return valores
  const salida = { ...valores }
  for (const nombre of def.bloquearEnEdicion ?? []) if (nombre in registro) salida[nombre] = registro[nombre] as Valor
  return salida
}
```

- [ ] **Step 3: Crear** `src/presentation/colaboradores/AltaColaborador.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { buscarColaboradores, etiquetaColaboradorHoja } from '@/domain/colaboradores-hoja'
import { aTitulo } from '@/domain/texto'
import { formatearFecha } from '@/domain/fechas'
import { MODULOS } from '@/domain/modulos-definiciones'
import { asegurarColaborador } from '@/infrastructure/api/colaboradores'
import { guardar } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { CampoEntrada } from '@/presentation/datos/CampoEntrada'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { deTextoIso } from '@/domain/fechas'
import { useColaboradoresHoja } from './useColaboradoresHoja'

const CAMPO_CUADRILLA = MODULOS.colaboradores.campos.find((c) => c.nombre === 'cuadrilla')!

function DatoHoja({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <span className="etiqueta">{etiqueta}</span>
      <div className="control flex items-center bg-superficie-2 text-texto-suave">{valor || '-'}</div>
    </div>
  )
}

export function AltaColaborador({ alTerminar, alCancelar }: { alTerminar: () => void; alCancelar: () => void }) {
  const { uid } = useSesion()
  const { filas, cargando, error, desactualizado, actualizar } = useColaboradoresHoja()
  const [idInterno, setIdInterno] = useState('')
  const [cuadrilla, setCuadrilla] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const vigentes = useMemo(() => filas.filter((f) => !f.fecha_baja), [filas])
  const opciones = useMemo(() => vigentes.map((f) => ({ valor: f.id_interno, etiqueta: etiquetaColaboradorHoja(f) })), [vigentes])
  const elegido = vigentes.find((f) => f.id_interno === idInterno)

  async function registrar() {
    if (!elegido || !uid) return
    setGuardando(true)
    setFallo(null)
    try {
      const { uid: uidColaborador } = await asegurarColaborador(elegido.id_interno)
      if (cuadrilla) await guardar('colaboradores', { cuadrilla }, uid, uidColaborador)
      alTerminar()
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo registrar al colaborador')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void registrar() }} className="tarjeta aparecer">
      <div className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <label id="alta-colaborador-et" htmlFor="alta-colaborador" className="etiqueta">
            Colaborador<span className="ml-0.5 text-error" aria-hidden="true">*</span>
          </label>
          <SelectBuscable id="alta-colaborador" etiqueta="Colaborador" etiquetaId="alta-colaborador-et" opciones={opciones}
            valor={idInterno} textoVacio={cargando && filas.length === 0 ? 'Cargando lista...' : 'Selecciona'}
            alCambiar={setIdInterno} />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
            {desactualizado && <span>La lista puede estar desactualizada</span>}
            <button type="button" onClick={actualizar} disabled={cargando} className="underline">Actualizar lista</button>
          </div>
          {error && <div className="mt-2"><AvisoError>{error}</AvisoError></div>}
        </div>
        <DatoHoja etiqueta="Ciudad" valor={elegido ? aTitulo(elegido.plaza) : ''} />
        <DatoHoja etiqueta="Área" valor={elegido ? aTitulo(elegido.departamento) : ''} />
        <DatoHoja etiqueta="Línea de negocio" valor={elegido ? aTitulo(elegido.empresa) : ''} />
        <DatoHoja etiqueta="Puesto" valor={elegido ? aTitulo(elegido.puesto) : ''} />
        <DatoHoja etiqueta="Fecha de ingreso" valor={elegido?.fecha_ingreso ? formatearFecha(deTextoIso(elegido.fecha_ingreso)) : ''} />
        <DatoHoja etiqueta="No. de colaborador" valor={elegido?.numero ?? ''} />
        <CampoEntrada campo={CAMPO_CUADRILLA} prefijo="alta-" valor={cuadrilla} alCambiar={(v) => setCuadrilla(typeof v === 'string' ? v : null)} />
      </div>
      {fallo && <div className="px-4 pb-4 sm:px-6"><AvisoError>{fallo}</AvisoError></div>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde bg-superficie-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={alCancelar} disabled={guardando} className="boton-secundario">Cancelar</button>
        <button type="submit" disabled={!elegido || guardando} className="boton-primario">
          {guardando ? 'Registrando...' : 'Registrar colaborador'}
        </button>
      </div>
    </form>
  )
}
```

(Unificar los dos imports de `@/domain/fechas` en uno al escribir el archivo.)

- [ ] **Step 4: Usarlo en `PaginaModulo`.** Importar `AltaColaborador` y reemplazar el bloque del formulario:

```tsx
import { AltaColaborador } from '@/presentation/colaboradores/AltaColaborador'
```

```tsx
      {editando === 'nuevo' && def.id === 'colaboradores' ? (
        <AltaColaborador alTerminar={() => setEditando(null)} alCancelar={() => setEditando(null)} />
      ) : editando !== null ? (
        <FormularioModulo def={def} registro={editando === 'nuevo' ? undefined : editando}
          alTerminar={() => setEditando(null)} />
      ) : (
```

(el bloque `else` con la tabla queda igual).

- [ ] **Step 5: Verificar.** Run: `pnpm typecheck && pnpm vitest run`. Corregir cualquier prueba de `modulos-definiciones.test.ts` que asevere columnas o campos de colaboradores.

---

### Task 7: Herramienta de enlace en `/admin/colaboradores`

**Files:**
- Create: `src/presentation/colaboradores/useEnlace.ts`, `src/presentation/colaboradores/TablaEnlace.tsx`, `src/app/(app)/admin/colaboradores/page.tsx`
- Modify: `src/presentation/navegacion/enlaces.ts`, `src/presentation/navegacion/enlaces.test.ts`

**Interfaces:**
- Consumes: `cargarEnlace`, `vincular`, `desvincular` (Task 5), `FilaEnlace`, `ColaboradorHoja`, `etiquetaColaboradorHoja`, `buscarColaboradores`.
- Produces: página administrativa y entrada de menú "Enlace de colaboradores".

- [ ] **Step 1: Crear** `src/presentation/colaboradores/useEnlace.ts`

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ColaboradorHoja, FilaEnlace } from '@/domain/colaboradores-hoja'
import { cargarEnlace, desvincular, vincular } from '@/infrastructure/api/colaboradores'

const mensaje = (e: unknown, defecto: string) => (e instanceof Error ? e.message : defecto)

export function useEnlace() {
  const [filas, setFilas] = useState<FilaEnlace[]>([])
  const [hoja, setHoja] = useState<ColaboradorHoja[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async (forzar = false) => {
    setCargando(true)
    setError(null)
    try {
      const r = await cargarEnlace(forzar)
      setFilas(r.filas)
      setHoja(r.hoja)
    } catch (e) {
      setError(mensaje(e, 'No se pudo cargar el enlace'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  // Devuelve el error de la operación para que la tabla lo muestre junto a la fila
  const vincularFila = useCallback(async (uid: string, idInterno: string): Promise<string | null> => {
    try { await vincular(uid, idInterno); return null } catch (e) { return mensaje(e, 'No se pudo vincular') }
  }, [])
  const desvincularFila = useCallback(async (uid: string): Promise<string | null> => {
    try { await desvincular(uid); return null } catch (e) { return mensaje(e, 'No se pudo desvincular') }
  }, [])

  return { filas, hoja, cargando, error, recargar, vincular: vincularFila, desvincular: desvincularFila }
}
```

- [ ] **Step 2: Crear** `src/presentation/colaboradores/TablaEnlace.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { buscarColaboradores, etiquetaColaboradorHoja, normalizarNombre, type ColaboradorHoja, type FilaEnlace } from '@/domain/colaboradores-hoja'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

const ETIQUETA_ESTADO = { exacta: 'Coincidencia exacta', ambigua: 'Ambigua', sin_coincidencia: 'Sin coincidencia' } as const

interface Props {
  filas: FilaEnlace[]
  hoja: ColaboradorHoja[]
  vincular: (uid: string, idInterno: string) => Promise<string | null>
  desvincular: (uid: string) => Promise<string | null>
  alCambiar: () => void
}

export function TablaEnlace({ filas, hoja, vincular, desvincular, alCambiar }: Props) {
  const [texto, setTexto] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [elegidos, setElegidos] = useState<Record<string, string>>({})

  const vinculadas = useMemo(() => new Set(filas.flatMap((f) => (f.id_interno ? [f.id_interno] : []))), [filas])
  const libres = useMemo(() => hoja.filter((h) => !vinculadas.has(h.id_interno) && !h.fecha_baja), [hoja, vinculadas])
  const opciones = useMemo(() => libres.map((h) => ({ valor: h.id_interno, etiqueta: etiquetaColaboradorHoja(h) })), [libres])
  const resumen = useMemo(() => ({
    vinculados: filas.filter((f) => f.id_interno).length,
    exactas: filas.filter((f) => f.sugerencia?.estado === 'exacta').length,
    ambiguas: filas.filter((f) => f.sugerencia?.estado === 'ambigua').length,
    sin: filas.filter((f) => f.sugerencia?.estado === 'sin_coincidencia').length,
  }), [filas])

  const visibles = useMemo(() => {
    const q = normalizarNombre(texto)
    return filas.filter((f) => (!soloPendientes || !f.id_interno) && (!q || normalizarNombre(f.nombre).includes(q)))
  }, [filas, texto, soloPendientes])

  async function ejecutar(uid: string, accion: () => Promise<string | null>) {
    setOcupado(uid)
    const fallo = await accion()
    setErrores((p) => { const { [uid]: _, ...resto } = p; return fallo ? { ...resto, [uid]: fallo } : resto })
    setOcupado(null)
    if (!fallo) alCambiar()
    return fallo
  }

  async function confirmarExactas() {
    setOcupado('todas')
    const nuevos: Record<string, string> = {}
    for (const f of filas.filter((x) => x.sugerencia?.estado === 'exacta')) {
      const fallo = await vincular(f.id, f.sugerencia!.candidatos[0].id_interno)
      if (fallo) nuevos[f.id] = fallo
    }
    setErrores(nuevos)
    setOcupado(null)
    alCambiar()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-texto-suave">
        {resumen.vinculados} vinculados · {resumen.exactas} con coincidencia exacta · {resumen.ambiguas} ambiguos · {resumen.sin} sin coincidencia
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar colaborador"
          aria-label="Buscar colaborador" className="control max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="casilla" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
          Solo sin vincular
        </label>
        <button type="button" onClick={() => void confirmarExactas()} disabled={resumen.exactas === 0 || ocupado !== null}
          className="boton-primario sm:ml-auto">
          {ocupado === 'todas' ? 'Vinculando...' : `Confirmar coincidencias exactas (${resumen.exactas})`}
        </button>
      </div>
      <ul className="tarjeta divide-y divide-borde">
        {visibles.length === 0 && <li className="p-4 text-sm text-texto-suave">No hay colaboradores para mostrar.</li>}
        {visibles.map((f) => {
          const sug = f.sugerencia
          const elegido = elegidos[f.id] ?? (sug?.estado === 'exacta' ? sug.candidatos[0].id_interno : '')
          return (
            <li key={f.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-medium">{f.nombre}</p>
                <p className="text-xs text-texto-suave">
                  {f.id_interno ? `Vinculado · id interno ${f.id_interno}` : sug ? ETIQUETA_ESTADO[sug.estado] : ''}
                </p>
              </div>
              {f.id_interno ? <span /> : (
                <SelectBuscable id={`enlace-${f.id}`} etiqueta={`Fila de la hoja para ${f.nombre}`} opciones={opciones}
                  valor={elegido} textoVacio="Selecciona" alCambiar={(v) => setElegidos((p) => ({ ...p, [f.id]: v }))} />
              )}
              {f.id_interno ? (
                <button type="button" disabled={ocupado !== null} onClick={() => void ejecutar(f.id, () => desvincular(f.id))}
                  className="boton-secundario">Desvincular</button>
              ) : (
                <button type="button" disabled={!elegido || ocupado !== null}
                  onClick={() => void ejecutar(f.id, () => vincular(f.id, elegido))} className="boton-primario">
                  {ocupado === f.id ? 'Vinculando...' : 'Vincular'}
                </button>
              )}
              {errores[f.id] && <div className="sm:col-span-3"><AvisoError>{errores[f.id]}</AvisoError></div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Crear** `src/app/(app)/admin/colaboradores/page.tsx`

```tsx
'use client'

import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { TablaEnlace } from '@/presentation/colaboradores/TablaEnlace'
import { useEnlace } from '@/presentation/colaboradores/useEnlace'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'

function Enlace() {
  const { filas, hoja, cargando, error, recargar, vincular, desvincular } = useEnlace()
  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Administración" titulo="Enlace de colaboradores"
        detalle="Vincula a los colaboradores actuales con su fila de la hoja; no se modifica ningún registro existente."
        acciones={<button type="button" onClick={() => void recargar(true)} disabled={cargando} className="boton-secundario">Recargar</button>} />
      {error && <div className="mb-4"><AvisoError>{error}</AvisoError></div>}
      {cargando && filas.length === 0 ? <Cargando /> : (
        <TablaEnlace filas={filas} hoja={hoja} vincular={vincular} desvincular={desvincular} alCambiar={() => void recargar()} />
      )}
    </section>
  )
}

export default function ColaboradoresEnlacePage() {
  return <RequireAcceso accion="administrar"><Enlace /></RequireAcceso>
}
```

- [ ] **Step 4: Menú.** En `src/presentation/navegacion/enlaces.ts` agregar en el grupo Administración, después de Catálogos:

```ts
        { href: '/admin/colaboradores', titulo: 'Enlace de colaboradores', icono: 'usuarios' },
```

y ajustar `src/presentation/navegacion/enlaces.test.ts` si cuenta o enumera los enlaces de administración.

- [ ] **Step 5: Verificar.** Run: `pnpm typecheck && pnpm lint && pnpm vitest run`.

---

### Task 8: Entregas y copia del colaborador en cada registro

**Files:**
- Modify: `src/domain/modulos.ts` (`ContextoModulo`, `derivarCiudad`), `src/domain/modulos.test.ts`, `src/application/entregas-tipos.ts`, `src/application/entregas-planificar.ts`, `src/application/entregas-planificar.test.ts`, `src/presentation/datos/FormularioModulo.tsx`, `src/presentation/entregas/FormularioEntrega.tsx`, `src/presentation/entregas/PaginaEntregas.tsx`

**Interfaces:**
- Consumes: `copiaDeColaborador` (Task 1), `SelectorColaboradorHoja` (Task 5).
- Produces: `ContextoModulo.copiaDeColaborador?(id): Valores`; `EntradaEntrega.copia?: Valores`; en cada registro de capacitaciones, accidentes, uniforme y EPP, `colaborador_nombre`, `colaborador_plaza`, `colaborador_puesto`.

- [ ] **Step 1: Prueba que falla** en `src/domain/modulos.test.ts`

```ts
describe('derivarCiudad con copia del colaborador', () => {
  it('agrega la copia cuando el contexto la provee y conserva la ciudad', () => {
    const ctx = {
      ciudadDeColaborador: () => 'leon',
      copiaDeColaborador: () => ({ colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: null }),
    }
    expect(derivarCiudad({ colaborador_id: 'a' }, ctx)).toEqual({
      colaborador_id: 'a', ciudad: 'leon', colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: null,
    })
  })

  it('sin copia en el contexto solo agrega la ciudad', () => {
    expect(derivarCiudad({ colaborador_id: 'a' }, { ciudadDeColaborador: () => 'leon' })).toEqual({ colaborador_id: 'a', ciudad: 'leon' })
  })
})
```

Run: `pnpm vitest run src/domain/modulos.test.ts` → FAIL en la primera prueba.

- [ ] **Step 2: Implementar.** En `src/domain/modulos.ts`:

```ts
export interface ContextoModulo {
  ciudadDeColaborador(id: string): string | null
  copiaDeColaborador?(id: string): Valores
}
```

```ts
export function derivarCiudad(v: Valores, ctx: ContextoModulo): Valores {
  const id = v.colaborador_id
  const copia = typeof id === 'string' ? ctx.copiaDeColaborador?.(id) : undefined
  return { ...v, ...copia, ciudad: typeof id === 'string' ? ctx.ciudadDeColaborador(id) : null }
}
```

Run: `pnpm vitest run src/domain/modulos.test.ts` → PASS.

- [ ] **Step 3: Contexto del formulario de módulos.** En `src/presentation/datos/FormularioModulo.tsx` importar `copiaDeColaborador` y ampliar `ctx`:

```tsx
import { copiaDeColaborador } from '@/domain/colaboradores-hoja'
```

```tsx
  const ctx = useMemo<ContextoModulo>(() => ({
    ciudadDeColaborador: (id) => {
      const c = colaboradores.find((x) => x.id === id)
      return typeof c?.ciudad === 'string' ? c.ciudad : null
    },
    copiaDeColaborador: (id) => {
      const c = colaboradores.find((x) => x.id === id)
      return c ? copiaDeColaborador(c) : {}
    },
  }), [colaboradores])
```

- [ ] **Step 4: Prueba de entregas que falla.** En `src/application/entregas-planificar.test.ts` agregar (reutilizando las configuraciones de prueba que ya define el archivo; leerlo antes y copiar su patrón de `EntradaEntrega`):

```ts
it('copia nombre, plaza y puesto del colaborador en cada operación', () => {
  const plan = planificarEntrega({
    ...entradaBase,
    copia: { colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: 'SOLDADOR A' },
  })
  expect(plan.operaciones.length).toBeGreaterThan(0)
  for (const op of plan.operaciones) {
    expect(op.valores).toMatchObject({ colaborador_nombre: 'Ana', colaborador_plaza: 'LEON', colaborador_puesto: 'SOLDADOR A' })
  }
})
```

donde `entradaBase` es la entrada válida que ya usan las demás pruebas de modo `nueva`. Run: `pnpm vitest run src/application/entregas-planificar.test.ts` → FAIL.

- [ ] **Step 5: Implementar.** En `src/application/entregas-planificar.ts` agregar a `EntradaEntrega` el campo `copia?: Valores` y usarlo en `armarValores`:

```ts
  copia?: Valores
```

```ts
  const conCiudad = derivarCiudad(base, { ciudadDeColaborador: () => e.ciudad, copiaDeColaborador: () => e.copia ?? {} })
```

Run: `pnpm vitest run src/application/entregas-planificar.test.ts` → PASS.

- [ ] **Step 6: Pasar la copia desde el formulario y ampliar el tipo.** En `src/application/entregas-tipos.ts`:

```ts
export interface ColaboradorEntrega { id: string; nombre: string; ciudad: string; activo?: boolean; plaza?: string | null; puesto?: string | null }
```

En `src/presentation/entregas/FormularioEntrega.tsx` importar y pasar `copia` a `planificarEntrega`:

```tsx
import { copiaDeColaborador } from '@/domain/colaboradores-hoja'
```

```tsx
      claves, fecha, items: valores, ultimas: fila.ultimas, copia: copiaDeColaborador(fila.colaborador),
```

- [ ] **Step 7: Agregar colaborador desde la hoja en las páginas de entregas.** En `src/presentation/entregas/PaginaEntregas.tsx` importar el selector y mostrar, solo para capturistas, una tarjeta encima de los filtros que abre la fila del colaborador elegido:

```tsx
import { SelectorColaboradorHoja } from '@/presentation/colaboradores/SelectorColaboradorHoja'
```

```tsx
            {capturista && (
              <div className="tarjeta max-w-xl p-4">
                <label id="entrega-colaborador-et" htmlFor="entrega-colaborador" className="etiqueta">
                  Registrar a un colaborador de la hoja
                </label>
                <SelectorColaboradorHoja id="entrega-colaborador" etiquetaId="entrega-colaborador-et" valor=""
                  alCambiar={(uid) => { if (uid) setAbierto(uid) }} />
              </div>
            )}
```

insertada justo antes de `<FiltrosEntregas ... />`. Con `valor=""` el selector siempre queda en "Selecciona" y, al elegir, crea o recupera al colaborador y abre su panel en cuanto Firestore entrega el documento.

- [ ] **Step 8: Verificar.** Run: `pnpm typecheck && pnpm lint && pnpm vitest run`.

---

### Task 9: Reglas, configuración de App Hosting y README

**Files:**
- Modify: `firestore.rules.template`, `tests/rules/firestore.rules.test.ts`, `README.md`, `.env.example`, `.gitignore`
- Create: `apphosting.example.yaml`

- [ ] **Step 1: Reglas.** En `firestore.rules.template`: quitar `'colaboradores'` de la lista de `esOperativa`, y agregar antes del bloque `match /{coleccion}/{id}` el de colaboradores (el índice `indice_id_interno` queda sin reglas y por tanto denegado):

```
    // Los colaboradores los crea el servidor desde la hoja; el cliente solo ajusta cuadrilla y activo.
    match /colaboradores/{id} {
      allow read: if puedeLeer();
      allow update: if puedeCapturar()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['cuadrilla', 'activo', 'actualizado_por', 'actualizado_en']);
      allow create, delete: if false;
    }
```

Cambiar el comentario del bloque comodín a `// Los demás módulos operativos admiten captura de capturistas y administradores.` y la condición de borrado a `allow delete: if esOperativa(coleccion) && esAdmin();`.

- [ ] **Step 2: Pruebas de reglas.** Leer `tests/rules/firestore.rules.test.ts`, ajustar las pruebas existentes que crean o editan colaboradores desde el cliente y agregar, con el mismo helper de contextos que usa el archivo:

```ts
describe('colaboradores', () => {
  it('el capturista no puede crear colaboradores desde el cliente', async () => {
    await assertFails(setDoc(doc(capturista.firestore(), 'colaboradores/nuevo'), { nombre: 'Ana' }))
  })
  it('el capturista puede cambiar cuadrilla y activo', async () => {
    await assertSucceeds(updateDoc(doc(capturista.firestore(), 'colaboradores/c1'), { cuadrilla: 'q1', activo: false }))
  })
  it('el capturista no puede cambiar nombre ni id_interno', async () => {
    await assertFails(updateDoc(doc(capturista.firestore(), 'colaboradores/c1'), { nombre: 'Otro' }))
    await assertFails(updateDoc(doc(capturista.firestore(), 'colaboradores/c1'), { id_interno: '99' }))
  })
  it('nadie borra colaboradores ni toca el índice desde el cliente', async () => {
    await assertFails(deleteDoc(doc(admin.firestore(), 'colaboradores/c1')))
    await assertFails(getDoc(doc(admin.firestore(), 'indice_id_interno/1')))
    await assertFails(setDoc(doc(admin.firestore(), 'indice_id_interno/1'), { uid: 'c1' }))
  })
})
```

adaptando los nombres de contexto (`capturista`, `admin`) y el documento `colaboradores/c1` sembrado a lo que ya define el archivo. Run: `pnpm test:rules` (requiere el emulador de Firestore y Java; si no está disponible, reportarlo y probar la plantilla con `pnpm vitest run scripts/lib/plantillas.test.mjs`).

- [ ] **Step 3: Configuración.** Crear `apphosting.example.yaml`:

```yaml
runConfig:
  cpu: 1
  memoryMiB: 512
  maxInstances: 2

env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIRESTORE_DATABASE
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_DOMINIO_PERMITIDO
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: ""
    availability: [BUILD, RUNTIME]
  - variable: COLABORADORES_SHEET_ID
    value: ""
    availability: [RUNTIME]
  - variable: COLABORADORES_SHEET_TAB
    value: Colaboradores
    availability: [RUNTIME]
```

Agregar `apphosting.yaml` a `.gitignore`, y a `.env.example`:

```
# Hoja de Google Sheets con los colaboradores (solo servidor); la pestaña por defecto es Colaboradores
COLABORADORES_SHEET_ID=
COLABORADORES_SHEET_TAB=Colaboradores
```

- [ ] **Step 4: README.** Agregar una sección "Colaboradores desde Google Sheets" con: qué hace (dropdown en vivo, `id_interno`, UID como llave), requisitos (plan Blaze, API de Google Sheets habilitada, hoja compartida como lectora con la cuenta de servicio de App Hosting `firebase-app-hosting-compute@<PROYECTO>.iam.gserviceaccount.com`), variables `COLABORADORES_SHEET_ID` y `COLABORADORES_SHEET_TAB`, cómo copiar `apphosting.example.yaml` a `apphosting.yaml`, desarrollo local (`gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets.readonly`, con una cuenta que tenga acceso a la hoja), el orden para publicar (primero desplegar la app y sus rutas, luego `pnpm config:firebase` y `firebase deploy --only firestore:<BASE>`, para que las reglas nuevas no corten la captura mientras tanto) y el flujo de enlace de los colaboradores actuales en `/admin/colaboradores` (simulación visible, confirmación por fila o masiva, nada se borra).

- [ ] **Step 5: Verificación final.** Run en este orden y reportar el resultado real de cada uno: `pnpm typecheck`, `pnpm lint`, `pnpm vitest run`, `pnpm build` (con las variables de `.env.local`; si no existe, reportarlo), `pnpm test:rules`.

---

## Autorrevisión contra el diseño

- Lectura en vivo con caché de tres niveles: Tasks 2 y 4 (servidor 10 min, `sessionStorage` 30 min con petición única, botón con mínimo de 60 s).
- UID como llave e `id_interno`: Tasks 3 y 4 (índice transaccional, vincular, desvincular).
- Alta desde el dropdown con campos automáticos: Task 6; creación de catálogos (opción A): Task 3.
- Herramienta de enlace con simulación y sin borrados: Task 7.
- Dropdowns de capacitaciones, accidentes, EPP y uniforme con copia del colaborador: Tasks 5 y 8.
- Reglas endurecidas, índice sin acceso y configuración de App Hosting: Task 9.
- Sin commits y comentarios de una línea: restricciones globales.
