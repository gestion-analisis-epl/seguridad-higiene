import { useState } from 'react'
import { aplicarEdicion, limpiarExtra, mensajeUsoEnUso, quitarItem, validarAlta, validarEdicion, type DatosExtra, type UsoCatalogo } from '@/domain/catalogos-edicion'
import type { Opcion } from '@/domain/modulos'
import { unirItems } from '@/domain/catalogos-iniciales'
import { guardarCatalogo } from '@/infrastructure/firestore/catalogos'
import type { ControlEdicion, FilaCatalogo } from './celdas-catalogo'

const ERR_REGION = 'Selecciona la región anatómica.'

// Al dar de alta se exigen región y riesgo; al editar solo la región, para no bloquear ítems viejos sin riesgo
export const errorExtra = ({ region, riesgo }: DatosExtra): string | null =>
  !region ? ERR_REGION : !riesgo?.trim() ? 'Escribe el tipo de riesgo.' : null

export function useEdicionCatalogo(
  id: string, items: Opcion[], uid: string | null, usoDe: (valor: string) => UsoCatalogo, usoListo: boolean, conExtras = false,
) {
  const [editando, setEditando] = useState<{ valor: string; texto: string; region: string; riesgo: string; nombre_corto: string } | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(siguientes: Opcion[]): Promise<boolean> {
    if (!uid) return false
    setOcupado(true)
    try { await guardarCatalogo(id, siguientes, uid); return true } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el catálogo.')
      return false
    } finally { setOcupado(false) }
  }

  const reiniciar = () => { setEditando(null); setConfirmando(null); setError(null) }

  async function agregar(etiqueta: string, extra: DatosExtra = {}): Promise<boolean> {
    const r = validarAlta(items, etiqueta)
    setError(r.error)
    if (r.error) return false
    return guardar(unirItems(items, [{ valor: r.valor, etiqueta: r.etiqueta, ...limpiarExtra(extra) }]))
  }

  const control: ControlEdicion = {
    editando, confirmando, ocupado, usoListo,
    cambiarTexto: (texto) => setEditando((e) => (e ? { ...e, texto } : e)),
    cambiarRegion: (region) => setEditando((e) => (e ? { ...e, region } : e)),
    cambiarRiesgo: (riesgo) => setEditando((e) => (e ? { ...e, riesgo } : e)),
    cambiarCorto: (nombre_corto) => setEditando((e) => (e ? { ...e, nombre_corto } : e)),
    iniciarEdicion: (f: FilaCatalogo) => { reiniciar(); setEditando({ valor: f.valor, texto: f.etiqueta, region: f.region ?? '', riesgo: f.riesgo ?? '', nombre_corto: f.nombre_corto ?? '' }) },
    cancelar: reiniciar,
    guardarEdicion: async () => {
      if (!editando) return
      const err = validarEdicion(editando.texto) ?? (conExtras && !editando.region ? ERR_REGION : null)
      setError(err)
      if (!err && await guardar(aplicarEdicion(items, editando.valor, editando.texto, editando))) reiniciar()
    },
    pedirEliminar: (f) => {
      reiniciar()
      const uso = usoDe(f.valor)
      if (uso.total > 0) setError(`"${f.etiqueta}": ${mensajeUsoEnUso(uso)}`)
      else setConfirmando(f.valor)
    },
    confirmarEliminar: async (f) => {
      const r = quitarItem(items, f.valor, usoDe(f.valor))
      setError(r.error)
      if (!r.error && await guardar(r.items)) reiniciar()
      else setConfirmando(null)
    },
  }
  return { control, error, agregar, reiniciar, fallar: setError }
}
