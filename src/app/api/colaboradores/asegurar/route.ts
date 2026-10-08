import { asegurarColaborador, ErrorColaborador } from '@/application/colaboradores-servidor'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'capturar')
  if (acceso instanceof Response) return acceso
  const { id_interno } = await leerCuerpo(req)
  if (typeof id_interno !== 'string' || !id_interno) return Response.json({ error: 'Falta id_interno' }, { status: 400 })
  try {
    const { dato } = await leerHoja()
    const fila = dato.find((f) => f.id_interno === id_interno)
    if (!fila) return Response.json({ error: 'No aparece en la hoja; actualiza la lista' }, { status: 404 })
    return Response.json(await asegurarColaborador(crearAlmacenAdmin(adminDb(), acceso.uid), fila))
  } catch (error) {
    if (error instanceof ErrorColaborador) return Response.json({ error: error.message }, { status: error.estado })
    console.error('No se pudo registrar al colaborador', error)
    return Response.json({ error: 'No se pudo registrar al colaborador' }, { status: 500 })
  }
}
