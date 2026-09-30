import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { CATALOGOS_INICIALES, unirItems, type ItemCatalogo } from '@/domain/catalogos-iniciales'
import { CONFIG_INDICADORES_INICIAL } from '@/domain/indicadores'
import { conAuditoria } from './conversion'

export async function guardarCatalogo(id: string, items: ItemCatalogo[], uid: string): Promise<void> {
  await setDoc(doc(db, 'catalogos', id), conAuditoria({ items }, uid, false), { merge: true })
}

export async function sembrarValoresIniciales(uid: string): Promise<void> {
  for (const [id, iniciales] of Object.entries(CATALOGOS_INICIALES)) {
    if (!iniciales.length) continue
    const ref = doc(db, 'catalogos', id)
    const snap = await getDoc(ref)
    const existentes = snap.exists() ? ((snap.data().items ?? []) as ItemCatalogo[]) : []
    await setDoc(ref, conAuditoria({ items: unirItems(existentes, iniciales) }, uid, !snap.exists()), { merge: true })
  }
  const refConfig = doc(db, 'configuracion', 'indicadores')
  if (!(await getDoc(refConfig)).exists()) {
    const c = CONFIG_INDICADORES_INICIAL
    await setDoc(refConfig, conAuditoria({
      horas_por_persona_mes: c.horasPorPersonaMes,
      k_mensual: c.kMensual,
      k_anual: c.kAnual,
      umbral_supera: c.umbralSupera,
      umbral_meta: c.umbralMeta,
      umbral_minimo: c.umbralMinimo,
      referencia_interpretacion: c.referenciaInterpretacion,
    }, uid, true))
  }
}
