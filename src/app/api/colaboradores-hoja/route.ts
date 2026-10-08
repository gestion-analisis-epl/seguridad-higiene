import { autorizar } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const acceso = await autorizar(req, 'leer')
  if (acceso instanceof Response) return acceso
  try {
    const forzar = new URL(req.url).searchParams.get('forzar') === '1'
    const { dato, cargadoEn, desactualizado } = await leerHoja(forzar)
    return Response.json({ colaboradores: dato, cargadoEn, desactualizado })
  } catch (error) {
    console.error('No se pudo leer la hoja de colaboradores', error)
    return Response.json({ error: 'No se pudo leer la hoja de colaboradores' }, { status: 502 })
  }
}
