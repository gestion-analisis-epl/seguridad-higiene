import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { ejecutarSincronizacion } from '@/infrastructure/servidor/sincronizar-colaboradores'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { simular } = await leerCuerpo(req)
  try {
    const r = await ejecutarSincronizacion(acceso.uid, simular !== false)
    if (!r.ok) return Response.json({ error: r.error }, { status: 502 })
    return Response.json({ simulado: simular !== false, ...r.resultado })
  } catch (error) {
    console.error('No se pudo sincronizar a los colaboradores', error)
    return Response.json({ error: 'No se pudo sincronizar a los colaboradores' }, { status: 500 })
  }
}
