import { NextResponse } from 'next/server'
import { ErrorConfiguracion, resolverDescarga, type RespuestaDescarga } from '@/application/adjuntos-descarga'
import { crearPuertosDescarga, dominioConfigurado } from '@/infrastructure/firebase-admin/descarga'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const responder = (r: RespuestaDescarga) =>
  NextResponse.json(r.cuerpo, { status: r.estado, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const m = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')
  try {
    return responder(await resolverDescarga(crearPuertosDescarga(), {
      token: m ? m[1].trim() : null,
      adjuntoId: params.id,
      dominioPermitido: dominioConfigurado(),
    }))
  } catch (e) {
    const sinConfig = e instanceof ErrorConfiguracion
    return responder({
      estado: sinConfig ? 503 : 500,
      cuerpo: { error: sinConfig ? 'La descarga de archivos no está disponible. Contacta al administrador.' : 'No se pudo preparar la descarga. Intenta de nuevo.' },
    })
  }
}
