import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  analizarValoresSensibles, escanearArchivo, escanearDiff, escanearHistorial, escanearNombre, rangosDePush,
} from './lib/escaner.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const LISTA_LOCAL = '.valores-sensibles.local'
const FORMATO_LOG = '--format=%x01%H%x1f%an <%ae>%x1f%cn <%ce>%x1f%B%x1e'

const OPCIONES_DIFF = ['-c', 'core.quotepath=off']
const FORMATO_DIFF = ['--src-prefix=a/', '--dst-prefix=b/', '--no-textconv', '--no-ext-diff', '--no-color']

const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 30 })
const esBinario = (buffer) => buffer.subarray(0, 8000).includes(0)

function escanearArbol(valores) {
  const rutas = git('ls-files', '-z').split('\0').filter(Boolean)
  return rutas.flatMap((ruta) => {
    const nombre = escanearNombre(ruta, valores)
    const disco = `${RAIZ}${ruta}`
    if (!existsSync(disco)) return nombre
    const buffer = readFileSync(disco)
    return esBinario(buffer) ? nombre : [...nombre, ...escanearArchivo(ruta, buffer.toString('utf8'), valores)]
  })
}

const leerPush = () => { try { return readFileSync(0, 'utf8') } catch { return '' } }
const argumentos = process.argv.slice(2)
const rangosManuales = argumentos.flatMap((a, i) => (argumentos[i - 1] === '--rango' ? [a] : []))
const rangos = argumentos.includes('--push') ? rangosDePush(leerPush()) : rangosManuales

const historial = (valores, filtro) =>
  escanearHistorial(git(...OPCIONES_DIFF, 'log', '-p', '-m', ...FORMATO_DIFF, FORMATO_LOG, ...filtro), valores)

const modos = {
  '--historial': (valores) => historial(valores, ['--all']),
  '--rango': (valores) => rangos.flatMap((r) => historial(valores, r.split(' '))),
  '--push': (valores) => rangos.flatMap((r) => historial(valores, r.split(' '))),
  '--staged': (valores) => escanearDiff(git(...OPCIONES_DIFF, 'diff', '--cached', ...FORMATO_DIFF), '(staged)', valores),
}

const modo = ['--push', '--rango', '--staged', '--historial'].find((a) => argumentos.includes(a))
const valores = existsSync(`${RAIZ}${LISTA_LOCAL}`)
  ? analizarValoresSensibles(readFileSync(`${RAIZ}${LISTA_LOCAL}`, 'utf8'))
  : null
if (!valores) console.log(`Aviso: falta ${LISTA_LOCAL}; solo se aplican los patrones genéricos (ver .valores-sensibles.example).`)
else if (!valores.length) console.log(`Aviso: ${LISTA_LOCAL} no tiene entradas; solo se aplican los patrones genéricos.`)

let hallazgos
try {
  hallazgos = (modo ? modos[modo] : escanearArbol)(valores ?? [])
} catch {
  console.error('No se pudo leer el historial de git (rango inválido o desconocido); se bloquea por precaución.')
  process.exit(1)
}
for (const h of hallazgos) {
  const lugar = h.commit ? `${h.commit}:${h.archivo}` : `${h.archivo}${h.linea ? `:${h.linea}` : ''}`
  console.log(`${lugar}  [${h.regla}] ${h.descripcion}`)
}
const alcance = { '--historial': 'historial', '--rango': 'rangos indicados', '--push': 'lo que se va a publicar', '--staged': 'cambios en staging' }[modo] ?? 'árbol versionado'
console.log(hallazgos.length ? `${hallazgos.length} hallazgo(s) en ${alcance}.` : `Sin hallazgos en ${alcance}.`)
process.exit(hallazgos.length ? 1 : 0)
