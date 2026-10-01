const REGLAS_CONTENIDO = [
  { id: 'clave-google', descripcion: 'clave de API con forma de Google/Firebase', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { id: 'token-aws', descripcion: 'identificador de acceso con forma de AWS', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'token-github', descripcion: 'token con forma de GitHub', regex: /\bgh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}/ },
  { id: 'token-slack', descripcion: 'token con forma de Slack', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'llave-privada-pem', descripcion: 'cabecera de llave privada PEM', regex: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { id: 'cuenta-de-servicio', descripcion: 'campo de cuenta de servicio', regex: /"private_key"\s*:/ },
  {
    id: 'asignacion-apikey', descripcion: 'apiKey con valor literal',
    regex: /api[_-]?key["']?\s*[:=]\s*["'][^"'\s<>{}$]{8,}["']/i,
  },
  {
    id: 'asignacion-secreto', descripcion: 'password o secret con valor literal',
    regex: /(?:password|passwd|secret)["']?\s*[:=]\s*["'][^"'\s<>{}$]{6,}["']/i,
  },
  {
    id: 'asignacion-entorno', descripcion: 'variable de entorno secreta con valor',
    regex: /^\s*[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*[^\s#"'$<{]{6,}/,
  },
]

const DESCRIPCIONES = {
  'env-example-con-valor': 'variable con valor en un archivo de ejemplo',
  'archivo-secreto': 'archivo de credenciales o entorno versionado',
  'archivo-local': 'archivo generado o local que no debe versionarse',
  'valor-sensible': 'coincide con la lista local de valores sensibles',
}

const ARCHIVOS_LOCALES = new Set(['.firebaserc', 'firebase.json', 'firestore.rules', 'storage.rules', 'firestore.seguridad-higiene.rules', 'storage.seguridad-higiene.rules', '.valores-sensibles.local'])

const plegar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** @param {string} texto */
export const normalizar = (texto) => plegar(texto).trim()

/** @param {string} contenido */
export const analizarValoresSensibles = (contenido) =>
  contenido.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(normalizar)

const nombreBase = (ruta) => ruta.split('/').pop() ?? ruta
const hallazgo = (regla, descripcion, extra) => ({ ...extra, regla, descripcion })
/** Sustituye por asteriscos las partes de una ruta que coinciden con la lista local. */
function enmascarar(ruta, valores) {
  const plano = plegar(ruta)
  if (!valores.length || plano.length !== ruta.length) return valores.length && contieneValor(ruta, valores) ? '(ruta)' : ruta
  const chars = [...ruta]
  for (const v of valores) {
    for (let i = plano.indexOf(v); i >= 0; i = plano.indexOf(v, i + v.length)) chars.fill('*', i, i + v.length)
  }
  return chars.join('')
}

function contieneValor(texto, valores) {
  if (!valores.length) return false
  const plano = normalizar(texto)
  return valores.some((v) => plano.includes(v))
}

/** Reglas por nombre de archivo y por ruta; nunca incluye el valor encontrado. */
export function escanearNombre(ruta, valores = []) {
  const base = nombreBase(ruta)
  const mostrada = enmascarar(ruta, valores)
  const hallazgos = []
  const secreto = (/^\.env(\..+)?$/.test(base) && base !== '.env.example') || /\.(pem|key)$/i.test(base) || /serviceaccount.*\.json$/i.test(base)
  if (secreto) hallazgos.push(hallazgo('archivo-secreto', DESCRIPCIONES['archivo-secreto'], { archivo: mostrada, linea: null }))
  if (ARCHIVOS_LOCALES.has(base)) hallazgos.push(hallazgo('archivo-local', DESCRIPCIONES['archivo-local'], { archivo: mostrada, linea: null }))
  if (contieneValor(ruta, valores)) hallazgos.push(hallazgo('valor-sensible', DESCRIPCIONES['valor-sensible'], { archivo: mostrada, linea: null }))
  return hallazgos
}

/** Reglas por contenido, una entrada por línea y regla. */
export function escanearArchivo(ruta, texto, valores = []) {
  const esEjemplo = nombreBase(ruta) === '.env.example'
  const mostrada = enmascarar(ruta, valores)
  const hallazgos = []
  texto.split(/\r?\n/).forEach((linea, i) => {
    const n = i + 1
    for (const r of REGLAS_CONTENIDO) if (r.regex.test(linea)) hallazgos.push(hallazgo(r.id, r.descripcion, { archivo: mostrada, linea: n }))
    if (esEjemplo && /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/.test(linea)) {
      hallazgos.push(hallazgo('env-example-con-valor', DESCRIPCIONES['env-example-con-valor'], { archivo: mostrada, linea: n }))
    }
    if (contieneValor(linea, valores)) hallazgos.push(hallazgo('valor-sensible', DESCRIPCIONES['valor-sensible'], { archivo: mostrada, linea: n }))
  })
  return hallazgos
}

function sinRepetidos(hallazgos) {
  const vistos = new Set()
  return hallazgos.filter((h) => {
    const clave = `${h.commit}|${h.archivo}|${h.regla}`
    return vistos.has(clave) ? false : (vistos.add(clave), true)
  })
}

const SIN_CABECERA = '(sin-cabecera)'
const sinComillas = (s) => (s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s)

/** Ruta de una línea `diff --git` con o sin prefijos a/ b/ y con o sin comillas; nunca falla. */
function rutaDeCabecera(linea) {
  const resto = linea.slice('diff --git '.length)
  const prefijada = /^"?a\/.+?"? "?b\/(.+?)"?$/.exec(resto)
  if (prefijada) return prefijada[1]
  const mitad = (resto.length - 1) / 2
  if (Number.isInteger(mitad) && resto[mitad] === ' ' && resto.slice(0, mitad) === resto.slice(mitad + 1)) {
    return sinComillas(resto.slice(0, mitad))
  }
  return sinComillas(resto)
}

/** Revisa nombres de archivo y líneas añadidas de un diff unificado; ante cabeceras raras atribuye, no omite. */
export function escanearDiff(texto, commit, valores = []) {
  const archivos = []
  let actual = null
  let enCabecera = false
  for (const linea of texto.split(/\r?\n/)) {
    if (linea.startsWith('diff --git ')) {
      actual = { ruta: rutaDeCabecera(linea), agregado: [] }
      archivos.push(actual)
      enCabecera = true
    } else if (linea.startsWith('@@')) {
      enCabecera = false
    } else if (linea.startsWith('+') && !(enCabecera && linea.startsWith('+++ '))) {
      if (!actual) {
        actual = { ruta: SIN_CABECERA, agregado: [] }
        archivos.push(actual)
      }
      actual.agregado.push(linea.slice(1))
    }
  }
  const hallazgos = archivos.flatMap(({ ruta, agregado }) => [
    ...(ruta === SIN_CABECERA ? [] : escanearNombre(ruta, valores)),
    ...escanearArchivo(ruta, agregado.join('\n'), valores),
  ])
  return sinRepetidos(hallazgos.map(({ linea, ...resto }) => ({ commit, ...resto })))
}

const SIN_CEROS = /^0+$/

/** Rangos de revisiones a escanear a partir de las líneas que git pasa al hook pre-push por stdin. */
export function rangosDePush(entrada) {
  const rangos = []
  for (const linea of entrada.split(/\r?\n/)) {
    const campos = linea.trim().split(/\s+/)
    if (campos.length < 4) continue
    const [, local, , remoto] = campos
    if (SIN_CEROS.test(local)) continue
    rangos.push(SIN_CEROS.test(remoto) ? `${local} --not --remotes` : `${remoto}..${local}`)
  }
  return rangos
}

/** Salida de `git log --all -p` con formato `\x01%H\x1f%an <%ae>\x1f%cn <%ce>\x1f%B\x1e`. */
export function escanearHistorial(salida, valores = []) {
  const hallazgos = []
  for (const bloque of salida.split('\x01').filter(Boolean)) {
    const fin = bloque.indexOf('\x1e')
    if (fin < 0) {
      hallazgos.push(...escanearDiff(bloque, '(sin-id)', valores))
      continue
    }
    const [sha, autor, committer, mensaje] = bloque.slice(0, fin).split('\x1f')
    const commit = sha.slice(0, 7)
    const meta = escanearArchivo('(mensaje)', [autor, committer, mensaje].join('\n'), valores)
    hallazgos.push(...sinRepetidos(meta.map(({ linea, ...resto }) => ({ commit, ...resto }))))
    hallazgos.push(...escanearDiff(bloque.slice(fin + 1), commit, valores))
  }
  return hallazgos
}
