import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderizarPlantilla } from './lib/plantillas.mjs'

const PARES = [
  ['firebase.template.json', 'firebase.json'],
  ['firestore.rules.template', 'firestore.seguridad-higiene.rules'],
  ['storage.rules.template', 'storage.seguridad-higiene.rules'],
]
const raiz = (nombre) => fileURLToPath(new URL(`../${nombre}`, import.meta.url))

try {
  const salidas = PARES.map(([plantilla, destino]) => [destino, renderizarPlantilla(readFileSync(raiz(plantilla), 'utf8'), process.env)])
  for (const [destino, texto] of salidas) {
    writeFileSync(raiz(destino), texto)
    console.log(`Escrito ${destino}`)
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Error al generar la configuración')
  process.exit(1)
}
