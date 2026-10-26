import { sincronizarCapacitaciones } from '@/application/capacitaciones-sync'
import { validarFilas } from '@/domain/capacitaciones-excel'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenCapacitaciones } from '@/infrastructure/servidor/almacen-capacitaciones'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_LISTA = 200

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { filas: crudas, simular } = await leerCuerpo(req)
  const validadas = validarFilas(crudas)
  if ('error' in validadas) return Response.json({ error: validadas.error }, { status: 400 })
  try {
    const informe = await sincronizarCapacitaciones({
      almacen: crearAlmacenCapacitaciones(adminDb(), acceso.uid), filas: validadas.filas, simular: simular !== false, hoy: new Date(),
    })
    return Response.json({
      ...informe,
      totalRechazadas: informe.rechazadas.length,
      totalSinCoincidencia: informe.sinCoincidencia.length,
      totalAmbiguas: informe.ambiguas.length,
      rechazadas: informe.rechazadas.slice(0, MAX_LISTA),
      sinCoincidencia: informe.sinCoincidencia.slice(0, MAX_LISTA),
      ambiguas: informe.ambiguas.slice(0, MAX_LISTA),
    })
  } catch (error) {
    console.error('No se pudieron importar las capacitaciones', error)
    return Response.json({ error: 'No se pudieron importar las capacitaciones' }, { status: 500 })
  }
}
