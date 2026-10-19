import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { adminDb } from '@/infrastructure/servidor/admin'
import { aplicarUnion, planearUnionDesdeFirestore } from '@/infrastructure/servidor/union-catalogos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

// Sin confirmar devuelve la vista previa; con confirmar: true aplica la unión
export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const cuerpo = await leerCuerpo(req)
  const catalogo = texto(cuerpo.catalogo)
  const origen = texto(cuerpo.origen)
  const destino = texto(cuerpo.destino)
  if (!catalogo || !origen || !destino) return Response.json({ error: 'Faltan el catálogo o las entradas' }, { status: 400 })
  try {
    const db = adminDb()
    const plan = await planearUnionDesdeFirestore(db, catalogo, origen, destino)
    if ('error' in plan) return Response.json({ error: plan.error }, { status: 400 })
    const resumen = { registros: plan.cambios.length, bloqueos: plan.bloqueos }
    if (cuerpo.confirmar !== true) return Response.json(resumen)
    if (plan.bloqueos.length) return Response.json({ error: `No se puede unir: hay ${plan.bloqueos.join(' y ')} con esa entrada` }, { status: 409 })
    await aplicarUnion(db, catalogo, plan, acceso.uid)
    return Response.json(resumen)
  } catch (error) {
    console.error('No se pudo unir las entradas del catálogo', error)
    return Response.json({ error: 'No se pudo unir las entradas' }, { status: 500 })
  }
}
