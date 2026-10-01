import { describe, expect, it } from 'vitest'
import {
  analizarValoresSensibles, escanearArchivo, escanearDiff, escanearHistorial, escanearNombre, normalizar, rangosDePush,
} from './escaner.mjs'

const reglas = (hallazgos) => hallazgos.map((h) => h.regla)
const alfanum = (n) => 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cF0xR'.repeat(3).slice(0, n)

const claveGoogle = () => 'AI' + 'za' + alfanum(35)
const claveAws = () => 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP'
const tokenGithub = () => 'gh' + 'p_' + alfanum(36)
const tokenSlack = () => 'xo' + 'xb-' + '1234567890-abcdefghij'
const cabeceraPem = () => '-----BEGIN ' + 'RSA PRIVATE' + ' KEY-----'
const campoCuenta = () => '"private' + '_key": "x"'

describe('normalizar', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('  Ñandú-ÁREA ')).toBe('nandu-area')
  })
})

describe('patrones genéricos', () => {
  it.each([
    ['clave de Google', `const k = "${claveGoogle()}"`, 'clave-google'],
    ['clave AWS', `id=${claveAws()}`, 'token-aws'],
    ['token de GitHub', `t: ${tokenGithub()}`, 'token-github'],
    ['token de Slack', `t ${tokenSlack()}`, 'token-slack'],
    ['llave privada PEM', cabeceraPem(), 'llave-privada-pem'],
    ['cuenta de servicio', campoCuenta(), 'cuenta-de-servicio'],
    ['apiKey literal', 'api' + 'Key: "abcdef123456"', 'asignacion-apikey'],
    ['api_key literal', 'api' + "_key = 'abcdef123456'", 'asignacion-apikey'],
    ['password literal', 'const pass' + 'word = "hunter22x"', 'asignacion-secreto'],
    ['secret literal', 'sec' + "ret: 'abcdefgh'", 'asignacion-secreto'],
    ['variable de entorno con valor', 'MI_API_KEY=abcdef123456', 'asignacion-entorno'],
  ])('detecta %s', (_, linea, regla) => {
    expect(reglas(escanearArchivo('a.ts', linea))).toContain(regla)
  })

  it('no marca usos legítimos', () => {
    const limpio = [
      'apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,',
      'NEXT_PUBLIC_FIREBASE_API_KEY=',
      'const password = ""',
      'const password = leer()',
      "secret: '<SECRETO>'",
      'Firebase API key: copia el valor de la consola',
    ].join('\n')
    expect(escanearArchivo('a.ts', limpio)).toEqual([])
  })

  it('informa archivo, línea y regla sin el valor', () => {
    const clave = claveGoogle()
    const hallazgos = escanearArchivo('src/x.ts', `ok\nconst k = "${clave}"\n`)
    expect(hallazgos).toEqual([{ archivo: 'src/x.ts', linea: 2, regla: 'clave-google', descripcion: expect.any(String) }])
    expect(JSON.stringify(hallazgos)).not.toContain(clave)
  })

  it('acepta saltos de línea de Windows', () => {
    expect(escanearArchivo('a.ts', `ok\r\n${cabeceraPem()}\r\n`)[0].linea).toBe(2)
  })
})

describe('nombres de archivo', () => {
  it.each([
    ['.env', 'archivo-secreto'],
    ['.env.local', 'archivo-secreto'],
    ['app/.env.production', 'archivo-secreto'],
    ['llave.pem', 'archivo-secreto'],
    ['a/b/cert.key', 'archivo-secreto'],
    ['mi-serviceAccount-prod.json', 'archivo-secreto'],
    ['.firebaserc', 'archivo-local'],
    ['firebase.json', 'archivo-local'],
    ['firestore.rules', 'archivo-local'],
    ['.valores-sensibles.local', 'archivo-local'],
  ])('%s -> %s', (ruta, regla) => {
    expect(reglas(escanearNombre(ruta))).toEqual([regla])
  })

  it('permite los ejemplos y plantillas', () => {
    const permitidos = [
      '.env.example', '.firebaserc.example', 'firebase.template.json', 'firebase.test.json',
      'firestore.rules.template', 'src/env.ts', '.valores-sensibles.example',
    ]
    for (const ruta of permitidos) expect(escanearNombre(ruta)).toEqual([])
  })
})

describe('.env.example', () => {
  it('solo admite valores vacíos', () => {
    expect(escanearArchivo('.env.example', '# nota\nA=\nB=\n')).toEqual([])
    expect(reglas(escanearArchivo('.env.example', 'A=\nB=algo\n'))).toEqual(['env-example-con-valor'])
    expect(escanearArchivo('.env.example', 'B=algo\n')[0].linea).toBe(1)
  })
})

describe('valores sensibles locales', () => {
  const lista = analizarValoresSensibles('# comentario\n\n  Empresa Ficticia  \nCiudad Ñandú\n')

  it('ignora comentarios y líneas vacías', () => {
    expect(lista).toEqual(['empresa ficticia', 'ciudad nandu'])
  })

  it('detecta sin distinguir mayúsculas ni acentos y no muestra el valor', () => {
    const hallazgos = escanearArchivo('README.md', 'hola\nTrabaja en EMPRESA FICTICIA hoy\nvive en ciudad ñandu', lista)
    expect(hallazgos.map((h) => [h.linea, h.regla])).toEqual([[2, 'valor-sensible'], [3, 'valor-sensible']])
    expect(JSON.stringify(hallazgos)).not.toMatch(/ficticia|nandu/i)
  })

  it('también revisa la ruta del archivo', () => {
    expect(reglas(escanearNombre('docs/Empresa Ficticia.md', lista))).toEqual(['valor-sensible'])
    expect(escanearNombre('docs/otra.md', lista)).toEqual([])
  })

  it('enmascara el valor dentro de la ruta informada', () => {
    const [h] = escanearNombre('docs/Empresa Ficticia.md', lista)
    expect(h.archivo).toBe('docs/****************.md')
    const [c] = escanearArchivo('docs/empresa-x/Ciudad Ñandú.md', 'empresa ficticia', lista)
    expect(c.archivo).toBe('docs/empresa-x/************.md')
  })

  it('sin lista solo aplican los patrones genéricos', () => {
    expect(escanearArchivo('a.md', 'empresa ficticia', [])).toEqual([])
  })
})

describe('diff e historial', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 111..222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,2 +1,3 @@',
    ' contexto',
    `-const vieja = "${claveGoogle()}"`,
    '+const nueva = 1',
    `+const k = "${claveGoogle()}"`,
    'diff --git a/.env.local b/.env.local',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/.env.local',
    '+X=1',
  ].join('\n')

  it('revisa solo líneas añadidas y nombres de archivo', () => {
    const h = escanearDiff(diff, 'abc1234')
    expect(h.map((x) => [x.commit, x.archivo, x.regla])).toEqual([
      ['abc1234', 'src/a.ts', 'clave-google'],
      ['abc1234', '.env.local', 'archivo-secreto'],
    ])
  })

  it('escanearHistorial separa commits y revisa autor y mensaje', () => {
    const s = '\x1f'
    const salida = [
      `\x01${'a'.repeat(40)}${s}Ana <ana@ejemplo.test>${s}Ana <ana@ejemplo.test>${s}feat: algo\n\ncuerpo con empresa ficticia\x1e\n${diff}\n`,
      `\x01${'b'.repeat(40)}${s}Beto <b@ejemplo.test>${s}Beto <b@ejemplo.test>${s}docs: nada\x1e\n`,
    ].join('')
    const h = escanearHistorial(salida, ['empresa ficticia'])
    expect(h.map((x) => [x.commit, x.archivo, x.regla])).toEqual([
      ['aaaaaaa', '(mensaje)', 'valor-sensible'],
      ['aaaaaaa', 'src/a.ts', 'clave-google'],
      ['aaaaaaa', '.env.local', 'archivo-secreto'],
    ])
    expect(JSON.stringify(h)).not.toMatch(/ficticia/i)
  })

  it('no repite el mismo hallazgo por commit, archivo y regla', () => {
    const dos = `diff --git a/x.ts b/x.ts\n+++ b/x.ts\n@@ -0,0 +1,2 @@\n+"${claveGoogle()}"\n+"${claveGoogle()}"\n`
    expect(escanearDiff(dos, 'abc1234')).toHaveLength(1)
  })
})

describe('cabeceras de diff poco comunes (falla cerrado)', () => {
  const cuerpo = () => `@@ -0,0 +1 @@\n+const k = "${claveGoogle()}"`

  it('cabeceras sin prefijos a/ y b/', () => {
    const texto = `diff --git src/a.ts src/a.ts\n--- src/a.ts\n+++ src/a.ts\n${cuerpo()}\ndiff --git .env.local .env.local\n--- /dev/null\n+++ .env.local\n@@ -0,0 +1 @@\n+X=1`
    expect(escanearDiff(texto, 'abc1234').map((h) => [h.archivo, h.regla])).toEqual([
      ['src/a.ts', 'clave-google'],
      ['.env.local', 'archivo-secreto'],
    ])
  })

  it('rutas entre comillas', () => {
    const oct = String.fromCharCode(92) + '303' + String.fromCharCode(92) + '251'
    const texto = `diff --git "a/dir/${oct}.ts" "b/dir/${oct}.ts"\n--- "a/dir/${oct}.ts"\n+++ "b/dir/${oct}.ts"\n${cuerpo()}`
    const [h] = escanearDiff(texto, 'abc1234')
    expect(h.regla).toBe('clave-google')
    expect(h.archivo).toBe(`dir/${oct}.ts`)
  })

  it('líneas añadidas antes de la primera cabecera se escanean con un nombre provisional', () => {
    const h = escanearDiff(`@@ -0,0 +1 @@\n+const k = "${claveGoogle()}"\n`, 'abc1234')
    expect(h.map((x) => [x.archivo, x.regla])).toEqual([['(sin-cabecera)', 'clave-google']])
  })

  it('una línea añadida que empieza con ++ dentro del hunk también se escanea', () => {
    const texto = `diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -0,0 +1 @@\n+++ ${claveGoogle()}`
    expect(reglas(escanearDiff(texto, 'abc1234'))).toEqual(['clave-google'])
  })
})

describe('rangosDePush', () => {
  const cero = '0'.repeat(40)
  const a = 'a'.repeat(40)
  const b = 'b'.repeat(40)
  const c = 'c'.repeat(40)

  it('ref nueva: todo lo local que no está en ningún remoto', () => {
    expect(rangosDePush(`refs/heads/x ${a} refs/heads/x ${cero}\n`)).toEqual([`${a} --not --remotes`])
  })

  it('actualización: del sha remoto al local', () => {
    expect(rangosDePush(`refs/heads/x ${a} refs/heads/x ${b}\n`)).toEqual([`${b}..${a}`])
  })

  it('borrado de ref: no hay nada que escanear', () => {
    expect(rangosDePush(`(delete) ${cero} refs/heads/x ${b}\n`)).toEqual([])
  })

  it('varias refs, con líneas vacías y saltos de Windows', () => {
    const entrada = `refs/heads/x ${a} refs/heads/x ${b}\r\n\r\n(delete) ${cero} refs/heads/y ${c}\r\nrefs/tags/t ${c} refs/tags/t ${cero}\r\n`
    expect(rangosDePush(entrada)).toEqual([`${b}..${a}`, `${c} --not --remotes`])
  })

  it('entrada vacía', () => {
    expect(rangosDePush('')).toEqual([])
  })
})

describe('lista local sin entradas', () => {
  it('analizarValoresSensibles devuelve vacío con solo comentarios', () => {
    expect(analizarValoresSensibles('# nada\n\n')).toEqual([])
  })
})
