import { useState } from 'react'
import { aplicarEdicion, mensajeUsoEnUso, quitarItem, validarAlta, validarEdicion, type UsoCatalogo } from '@/domain/catalogos-edicion'
import type { Opcion } from '@/domain/modulos'
import { unirItems } from '@/domain/catalogos-iniciales'
import { guardarCatalogo } from '@/infrastructure/firestore/catalogos'
import type { ControlEdicion, FilaCatalogo } from './celdas-catalogo'

export function useEdicionCatalogo(
  id: string, items: Opcion[], uid: string | null, usoDe: (valor: string) => UsoCatalogo, usoListo: boolean,
) {
  const [editando, setEditando] = useState<{ valor: string; texto: string } | null>(null)
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

  async function agregar(etiqueta: string): Promise<boolean> {
    const r = validarAlta(items, etiqueta)
    setError(r.error)
    if (r.error) return false
    return guardar(unirItems(items, [{ valor: r.valor, etiqueta: r.etiqueta }]))
  }

  const control: ControlEdicion = {
    editando, confirmando, ocupado, usoListo,
    cambiarTexto: (texto) => setEditando((e) => (e ? { ...e, texto } : e)),
    iniciarEdicion: (f: FilaCatalogo) => { reiniciar(); setEditando({ valor: f.valor, texto: f.etiqueta }) },
    cancelar: reiniciar,
    guardarEdicion: async () => {
      if (!editando) return
      const err = validarEdicion(items, editando.valor, editando.texto)
      setError(err)
      if (!err && await guardar(aplicarEdicion(items, editando.valor, editando.texto))) reiniciar()
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
  return { control, error, agregar, reiniciar }
}
