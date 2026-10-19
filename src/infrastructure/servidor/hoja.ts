import { GoogleAuth } from 'google-auth-library'
import { crearCacheConRespaldo } from '@/domain/cache-con-respaldo'
import { parsearFilasHoja, type ColaboradorHoja } from '@/domain/colaboradores-hoja'

const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

// Misma cuenta de servicio que firebase-admin; la hoja debe estar compartida con su client_email
function crearAuth(): GoogleAuth {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  return new GoogleAuth({ scopes: [ALCANCE], ...(json ? { credentials: JSON.parse(json) } : {}) })
}

async function leerPestana(pestana: string, crudo = false): Promise<unknown[][]> {
  const id = process.env.COLABORADORES_SHEET_ID?.trim()
  if (!id) throw new Error('Falta COLABORADORES_SHEET_ID')
  const rango = encodeURIComponent(`'${pestana.replace(/'/g, "''")}'`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${rango}?${crudo ? 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER' : 'valueRenderOption=FORMATTED_VALUE'}`
  const cliente = await crearAuth().getClient()
  const { data } = await cliente.request<{ values?: unknown[][] }>({ url })
  return data.values ?? []
}

function leerFilas(valores: unknown[][], inactivos: boolean): ColaboradorHoja[] {
  const { colaboradores, descartadas } = parsearFilasHoja(valores as string[][], { inactivos })
  if (descartadas > 0) console.warn(`Hoja de colaboradores: ${descartadas} filas descartadas`)
  return colaboradores
}

async function cargar(): Promise<ColaboradorHoja[]> {
  const activos = leerFilas(await leerPestana(process.env.COLABORADORES_SHEET_TAB?.trim() || 'Colaboradores'), false)
  const pestanaInactivos = process.env.COLABORADORES_SHEET_TAB_INACTIVOS?.trim()
  if (!pestanaInactivos) return activos
  const ids = new Set(activos.map((f) => f.id_interno))
  // Si un id está en ambas pestañas gana la de activos
  return [...activos, ...leerFilas(await leerPestana(pestanaInactivos), true).filter((f) => !ids.has(f.id_interno))]
}

export const leerHoja = crearCacheConRespaldo(cargar, { ttlMs: 10 * 60_000, minForzarMs: 60_000 })

// Valores sin formato (fechas como número de serie) de la pestaña de entregas
export async function leerValoresEntregas(): Promise<unknown[][]> {
  const pestana = process.env.COLABORADORES_SHEET_TAB_UNIFORMES?.trim()
  if (!pestana) throw new Error('Falta COLABORADORES_SHEET_TAB_UNIFORMES')
  return leerPestana(pestana, true)
}
