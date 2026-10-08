import { GoogleAuth } from 'google-auth-library'
import { crearCacheConRespaldo } from '@/domain/cache-con-respaldo'
import { parsearFilasHoja, type ColaboradorHoja } from '@/domain/colaboradores-hoja'

const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

// Misma cuenta de servicio que firebase-admin; la hoja debe estar compartida con su client_email
function crearAuth(): GoogleAuth {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  return new GoogleAuth({ scopes: [ALCANCE], ...(json ? { credentials: JSON.parse(json) } : {}) })
}

async function leerValores(): Promise<string[][]> {
  const id = process.env.COLABORADORES_SHEET_ID?.trim()
  if (!id) throw new Error('Falta COLABORADORES_SHEET_ID')
  const pestana = process.env.COLABORADORES_SHEET_TAB?.trim() || 'Colaboradores'
  const rango = encodeURIComponent(`'${pestana.replace(/'/g, "''")}'`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${rango}?valueRenderOption=FORMATTED_VALUE`
  const cliente = await crearAuth().getClient()
  const { data } = await cliente.request<{ values?: string[][] }>({ url })
  return data.values ?? []
}

async function cargar(): Promise<ColaboradorHoja[]> {
  const { colaboradores, descartadas } = parsearFilasHoja(await leerValores())
  if (descartadas > 0) console.warn(`Hoja de colaboradores: ${descartadas} filas descartadas`)
  return colaboradores
}

export const leerHoja = crearCacheConRespaldo(cargar, { ttlMs: 10 * 60_000, minForzarMs: 60_000 })
