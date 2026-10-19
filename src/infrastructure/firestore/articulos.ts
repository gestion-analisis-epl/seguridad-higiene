import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/infrastructure/firebase/cliente'
import { unirItems, type ItemCatalogo } from '@/domain/catalogos-iniciales'
import { CATALOGO_DE_DESTINO, claveArticulo, type DestinoEntrega } from '@/domain/entregas-hoja'
import { guardarCatalogo } from './catalogos'
import { conAuditoria } from './conversion'

export interface ArticuloMapeado { articulo: string; destino: DestinoEntrega; valor: string; etiqueta?: string }

export async function guardarArticulo(a: ArticuloMapeado, uid: string): Promise<void> {
  const ref = doc(db, 'articulos_hoja', claveArticulo(a.articulo))
  const existe = (await getDoc(ref)).exists()
  await setDoc(ref, conAuditoria({ articulo: a.articulo, destino: a.destino, valor: a.valor }, uid, !existe), { merge: true })
}

export async function eliminarArticulo(clave: string): Promise<void> {
  await deleteDoc(doc(db, 'articulos_hoja', clave))
}

// Agrega las entradas de catálogo que falten y solo los artículos que aún no tienen mapeo
export async function cargarPropuesta(propuesta: ArticuloMapeado[], yaMapeados: Set<string>, uid: string): Promise<number> {
  const nuevos = propuesta.filter((p) => !yaMapeados.has(claveArticulo(p.articulo)))
  const porCatalogo = new Map<string, ItemCatalogo[]>()
  for (const p of nuevos) {
    const id = CATALOGO_DE_DESTINO[p.destino]
    porCatalogo.set(id, [...(porCatalogo.get(id) ?? []), { valor: p.valor, etiqueta: p.etiqueta ?? p.valor }])
  }
  for (const [id, items] of Array.from(porCatalogo)) {
    const snap = await getDoc(doc(db, 'catalogos', id))
    const existentes = snap.exists() ? ((snap.data().items ?? []) as ItemCatalogo[]) : []
    await guardarCatalogo(id, unirItems(existentes, items), uid)
  }
  for (const p of nuevos) await guardarArticulo(p, uid)
  return nuevos.length
}
