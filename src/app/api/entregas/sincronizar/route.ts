import { asegurarColaborador } from '@/application/colaboradores-servidor'
import { sincronizarEntregas } from '@/application/entregas-sync'
import { parsearEntregasHoja } from '@/domain/entregas-hoja'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { crearAlmacenEntregas } from '@/infrastructure/servidor/almacen-entregas'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja, leerValoresEntregas } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_RECHAZADAS = 200

async function cantidadMaxima(): Promise<number | null> {
  const valor = (await adminDb().doc('configuracion/indicadores').get()).data()?.entregas_cantidad_maxima
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { simular } = await leerCuerpo(req)
  try {
    const db = adminDb()
    const [valores, { dato: hoja }, tope] = await Promise.all([leerValoresEntregas(), leerHoja(true), cantidadMaxima()])
    const { filas, rechazadas } = parsearEntregasHoja(valores, { cantidadMaxima: tope })
    const informe = await sincronizarEntregas({
      almacen: crearAlmacenEntregas(db, acceso.uid),
      asegurar: (fila) => asegurarColaborador(crearAlmacenAdmin(db, acceso.uid), fila, { permitirInactivo: true }),
      filas, rechazadas, hoja, simular: simular !== false,
    })
    return Response.json({ ...informe, totalRechazadas: informe.rechazadas.length, rechazadas: informe.rechazadas.slice(0, MAX_RECHAZADAS) })
  } catch (error) {
    console.error('No se pudieron sincronizar las entregas', error)
    const detalle = error instanceof Error && /^(Falta|La hoja)/.test(error.message) ? `: ${error.message}` : ''
    return Response.json({ error: `No se pudieron sincronizar las entregas${detalle}` }, { status: 502 })
  }
}
