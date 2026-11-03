import { adminDb } from '@/infrastructure/servidor/admin'
import { autorizar } from '@/infrastructure/servidor/autorizar'
import { migrarReglas } from '@/infrastructure/servidor/migracion-reglas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  try {
    const resultado = await migrarReglas(adminDb(), acceso.uid)
    return 'error' in resultado ? Response.json(resultado, { status: 409 }) : Response.json(resultado)
  } catch (error) {
    console.error('No se pudieron migrar las reglas de dotación', error)
    return Response.json({ error: 'No se pudieron migrar las reglas' }, { status: 500 })
  }
}
