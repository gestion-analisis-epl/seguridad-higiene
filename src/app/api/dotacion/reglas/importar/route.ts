import { adminDb } from '@/infrastructure/servidor/admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { guardarReglas, leerCatalogos, validarImportacion } from '@/infrastructure/servidor/reglas-importacion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { reglas: pedidas } = await leerCuerpo(req)
  try {
    const db = adminDb()
    const { reglas, errores } = validarImportacion(pedidas, await leerCatalogos(db))
    if (errores.length > 0) return Response.json({ error: errores.slice(0, 5).join('; ') }, { status: 400 })
    return Response.json(await guardarReglas(db, reglas, acceso.uid))
  } catch (error) {
    console.error('No se pudieron importar las reglas de dotación', error)
    return Response.json({ error: 'No se pudieron guardar las reglas' }, { status: 500 })
  }
}
