import { createHash, timingSafeEqual } from 'node:crypto'
import { ejecutarSincronizacion } from '@/infrastructure/servidor/sincronizar-colaboradores'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_ERRORES = 50

const huella = (t: string) => createHash('sha256').update(t).digest()

// Sin CRON_SECRET configurado el endpoint queda cerrado
function esCron(req: Request): boolean {
  const secreto = process.env.CRON_SECRET?.trim()
  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  return !!secreto && !!token && timingSafeEqual(huella(token), huella(secreto))
}

// Lo llama la tarea programada con el secreto; ?simular=1 solo calcula qué cambiaría
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET?.trim()) return Response.json({ error: 'Falta CRON_SECRET' }, { status: 503 })
  if (!esCron(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const simular = new URL(req.url).searchParams.get('simular') === '1'
  try {
    const r = await ejecutarSincronizacion('sincronizacion-automatica', simular)
    if (!r.ok) return Response.json({ error: r.error }, { status: 502 })
    const { errores, pendientes, ...conteos } = r.resultado
    return Response.json({ simulado: simular, ...conteos, totalPendientes: pendientes.length, totalErrores: errores.length, errores: errores.slice(0, MAX_ERRORES) })
  } catch (error) {
    console.error('No se pudo sincronizar a los colaboradores', error)
    return Response.json({ error: 'No se pudo sincronizar a los colaboradores' }, { status: 500 })
  }
}
