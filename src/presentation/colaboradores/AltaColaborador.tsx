'use client'

import { useMemo, useState } from 'react'
import { etiquetaColaboradorHoja } from '@/domain/colaboradores-hoja'
import { MODULOS } from '@/domain/modulos-definiciones'
import { asegurarColaborador } from '@/infrastructure/api/colaboradores'
import { guardar } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { CampoEntrada } from '@/presentation/datos/CampoEntrada'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { PrevistaHoja } from './PrevistaHoja'
import { useColaboradoresHoja } from './useColaboradoresHoja'

const CAMPO_CUADRILLA = MODULOS.colaboradores.campos.find((c) => c.nombre === 'cuadrilla')!

export function AltaColaborador({ alTerminar, alCancelar }: { alTerminar: () => void; alCancelar: () => void }) {
  const { uid } = useSesion()
  const { filas, cargando, error, desactualizado, actualizar } = useColaboradoresHoja()
  const [idInterno, setIdInterno] = useState('')
  const [cuadrilla, setCuadrilla] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const vigentes = useMemo(() => filas.filter((f) => !f.fecha_baja), [filas])
  const opciones = useMemo(() => vigentes.map((f) => ({ valor: f.id_interno, etiqueta: etiquetaColaboradorHoja(f) })), [vigentes])
  const elegido = vigentes.find((f) => f.id_interno === idInterno)

  async function registrar() {
    if (!elegido || !uid) return
    setGuardando(true)
    setFallo(null)
    try {
      const { uid: uidColaborador } = await asegurarColaborador(elegido.id_interno)
      if (cuadrilla) await guardar('colaboradores', { cuadrilla }, uid, uidColaborador)
      alTerminar()
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo registrar al colaborador')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void registrar() }} className="tarjeta aparecer">
      <div className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <label id="alta-colaborador-et" htmlFor="alta-colaborador" className="etiqueta">
            Colaborador<span className="ml-0.5 text-error" aria-hidden="true">*</span>
          </label>
          <SelectBuscable id="alta-colaborador" etiqueta="Colaborador" etiquetaId="alta-colaborador-et" opciones={opciones}
            valor={idInterno} textoVacio={cargando && filas.length === 0 ? 'Cargando lista...' : 'Selecciona'}
            alCambiar={setIdInterno} />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
            {desactualizado && <span>La lista puede estar desactualizada</span>}
            <button type="button" onClick={actualizar} disabled={cargando} className="underline">Actualizar lista</button>
          </div>
          {error && <div className="mt-2"><AvisoError>{error}</AvisoError></div>}
        </div>
        <PrevistaHoja fila={elegido ?? null} />
        <CampoEntrada campo={CAMPO_CUADRILLA} prefijo="alta-" valor={cuadrilla} alCambiar={(v) => setCuadrilla(typeof v === 'string' ? v : null)} />
      </div>
      {fallo && <div className="px-4 pb-4 sm:px-6"><AvisoError>{fallo}</AvisoError></div>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde bg-superficie-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={alCancelar} disabled={guardando} className="boton-secundario">Cancelar</button>
        <button type="submit" disabled={!elegido || guardando} className="boton-primario">
          {guardando ? 'Registrando...' : 'Registrar colaborador'}
        </button>
      </div>
    </form>
  )
}
