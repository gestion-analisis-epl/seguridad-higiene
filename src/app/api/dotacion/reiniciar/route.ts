import { FRASE_CONFIRMACION, normalizarAlcances } from '@/application/reinicio-dotacion'
import { adminDb } from '@/infrastructure/servidor/admin'
import { autorizar, leerCuerpo } from '@/infrastructure/servidor/autorizar'
import { aplicarReinicio, planearDesdeFirestore } from '@/infrastructure/servidor/reinicio-dotacion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const alcancesInvalidos = () => Response.json({ error: 'Elige al menos un alcance válido' }, { status: 400 })

// Conteos de lo que se borraría, o el respaldo completo con ?respaldo=1
export async function GET(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const url = new URL(req.url)
  const alcances = normalizarAlcances((url.searchParams.get('alcances') ?? '').split(',').filter(Boolean))
  if (!alcances) return alcancesInvalidos()
  try {
    const plan = await planearDesdeFirestore(adminDb(), alcances)
    return Response.json(url.searchParams.get('respaldo') === '1' ? plan.respaldo : { conteos: plan.conteos })
  } catch (error) {
    console.error('No se pudo preparar el reinicio de dotación', error)
    return Response.json({ error: 'No se pudo preparar el reinicio' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const acceso = await autorizar(req, 'administrar')
  if (acceso instanceof Response) return acceso
  const { alcances: pedidos, confirmar } = await leerCuerpo(req)
  const alcances = normalizarAlcances(pedidos)
  if (!alcances) return alcancesInvalidos()
  if (confirmar !== FRASE_CONFIRMACION) return Response.json({ error: 'Falta la confirmación' }, { status: 400 })
  try {
    const db = adminDb()
    const plan = await planearDesdeFirestore(db, alcances)
    await aplicarReinicio(db, plan)
    return Response.json({ conteos: plan.conteos })
  } catch (error) {
    console.error('No se pudo reiniciar la dotación', error)
    return Response.json({ error: 'No se pudo reiniciar la dotación' }, { status: 500 })
  }
}
