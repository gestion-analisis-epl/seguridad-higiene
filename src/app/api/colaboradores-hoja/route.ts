import { autorizar } from '@/infrastructure/servidor/autorizar'
import { leerHoja } from '@/infrastructure/servidor/hoja'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Pista corta y sin datos sensibles para saber qué revisar cuando falla la lectura
function motivoDeFallo(error: unknown): string {
  const e = error as { message?: string; status?: number; response?: { status?: number }; code?: string | number }
  if (e.message?.startsWith('Falta ')) return e.message
  const estado = e.response?.status ?? e.status ?? e.code
  if (estado === 403) return 'Google respondió 403: falta compartir la hoja con la cuenta de servicio o habilitar la API de Sheets'
  if (estado === 404) return 'Google respondió 404: revisa COLABORADORES_SHEET_ID'
  if (estado === 400) return 'Google respondió 400: revisa COLABORADORES_SHEET_TAB'
  if (e.message && /credential|default|Could not load/i.test(e.message)) return 'el servidor no tiene credenciales de Google'
  return 'error desconocido; ver los registros del servidor'
}

export async function GET(req: Request) {
  const acceso = await autorizar(req, 'leer')
  if (acceso instanceof Response) return acceso
  try {
    const forzar = new URL(req.url).searchParams.get('forzar') === '1'
    const { dato, cargadoEn, desactualizado } = await leerHoja(forzar)
    return Response.json({ colaboradores: dato, cargadoEn, desactualizado })
  } catch (error) {
    console.error('No se pudo leer la hoja de colaboradores', error)
    return Response.json({ error: `No se pudo leer la hoja de colaboradores (${motivoDeFallo(error)})` }, { status: 502 })
  }
}
