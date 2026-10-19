import { importarColaboradores } from '@/application/colaboradores-servidor'
import { planearImportacion } from '@/domain/colaboradores-hoja'
import { adminDb } from '@/infrastructure/servidor/admin'
import { crearAlmacenAdmin } from '@/infrastructure/servidor/almacen-admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { ids } = await leerCuerpo(req)
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || ids.some((i) => typeof i !== 'string')) {
    return Response.json({ error: 'ids inválidos' }, { status: 400 })
  }
  try {
    const [{ dato: hoja }, snap] = await Promise.all([leerHoja(), adminDb().collection('colaboradores').get()])
    const existentes = snap.docs.map((d) => ({
      id: d.id,
      nombre: String(d.data().nombre ?? d.id),
      id_interno: typeof d.data().id_interno === 'string' ? (d.data().id_interno as string) : null,
    }))
    // Se recalcula en el servidor: solo se crea lo que sigue pendiente y sin riesgo de duplicado
    const pedidos = new Set<string>(ids)
    const { crear } = planearImportacion(existentes, hoja)
    const filas = crear.filter((f) => pedidos.has(f.id_interno))
    return Response.json(await importarColaboradores(crearAlmacenAdmin(adminDb(), acceso.uid), filas))
  } catch (error) {
    console.error('No se pudo importar a los colaboradores', error)
    return Response.json({ error: 'No se pudo importar a los colaboradores' }, { status: 500 })
  }
}
