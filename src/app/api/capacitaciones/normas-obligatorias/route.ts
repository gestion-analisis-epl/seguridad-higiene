import { sincronizarNormasObligatorias } from '@/application/normas-obligatorias-sync'
import { validarFilasNormas } from '@/domain/normas-obligatorias-excel'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenNormas } from '@/infrastructure/servidor/almacen-normas'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_LISTA = 200

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { filas: crudas, simular } = await leerCuerpo(req)
  const validadas = validarFilasNormas(crudas)
  if ('error' in validadas) return Response.json({ error: validadas.error }, { status: 400 })
  try {
    const informe = await sincronizarNormasObligatorias({
      almacen: crearAlmacenNormas(adminDb(), acceso.uid), filas: validadas.filas, simular: simular !== false,
    })
    return Response.json({
      ...informe,
      totalSinCoincidencia: informe.sinCoincidencia.length,
      totalAmbiguas: informe.ambiguas.length,
      sinCoincidencia: informe.sinCoincidencia.slice(0, MAX_LISTA),
      ambiguas: informe.ambiguas.slice(0, MAX_LISTA),
    })
  } catch (error) {
    console.error('No se pudieron guardar las normas obligatorias', error)
    return Response.json({ error: 'No se pudieron guardar las normas obligatorias' }, { status: 500 })
  }
}
