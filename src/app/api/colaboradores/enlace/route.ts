import { desvincularColaborador, ErrorColaborador, vincularColaborador } from '@/application/colaboradores-servidor'
import { planearEnlace } from '@/domain/colaboradores-hoja'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  try {
    const forzar = new URL(req.url).searchParams.get('forzar') === '1'
    const [{ dato: hoja }, snap] = await Promise.all([leerHoja(forzar), adminDb().collection('colaboradores').get()])
    const existentes = snap.docs.map((d) => ({
      id: d.id,
      nombre: String(d.data().nombre ?? d.id),
      id_interno: typeof d.data().id_interno === 'string' ? (d.data().id_interno as string) : null,
    }))
    return Response.json({ filas: planearEnlace(existentes, hoja), hoja })
  } catch (error) {
    console.error('No se pudo preparar el enlace de colaboradores', error)
    return Response.json({ error: 'No se pudo preparar el enlace de colaboradores' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const { accion, uid, id_interno, sobrescribir } = await leerCuerpo(req)
  const acceso = await autorizar(req, accion === 'desvincular' ? 'administrar' : 'capturar')
  if (acceso instanceof Response) return acceso
  if (typeof uid !== 'string' || !uid) return Response.json({ error: 'Falta uid' }, { status: 400 })
  const almacen = crearAlmacenAdmin(adminDb(), acceso.uid)
  try {
    if (accion === 'desvincular') {
      await desvincularColaborador(almacen, uid)
    } else if (accion === 'vincular' && typeof id_interno === 'string') {
      const fila = (await leerHoja()).dato.find((f) => f.id_interno === id_interno)
      if (!fila) return Response.json({ error: 'No aparece en la hoja; actualiza la lista' }, { status: 404 })
      await vincularColaborador(almacen, uid, fila, { sobrescribir: sobrescribir === true })
    } else {
      return Response.json({ error: 'Acción inválida' }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof ErrorColaborador) return Response.json({ error: error.message }, { status: error.estado })
    console.error('No se pudo actualizar el enlace', error)
    return Response.json({ error: 'No se pudo actualizar el enlace' }, { status: 500 })
  }
}
