'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  campoVisible, limpiarOcultos, sanitizarValores, validarRegistro, type ContextoModulo, type ModuloDef, type Valor, type Valores,
} from '@/domain/modulos'
import { admiteEliminar } from '@/domain/modulos-definiciones'
import { puede } from '@/domain/permisos'
import type { Adjunto } from '@/domain/adjuntos'
import { borrarAdjuntosDeRegistro, reservarId } from '@/infrastructure/firestore/adjuntos'
import { eliminar, guardar, type Registro } from '@/infrastructure/firestore/repositorio'
import { Adjuntos } from '@/presentation/adjuntos/Adjuntos'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { AvisoError } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { CampoEntrada } from './CampoEntrada'
import { CampoLista } from './CampoLista'
import { useColeccion } from './useColeccion'

interface Props {
  def: ModuloDef
  registro?: Registro
  alTerminar: () => void
}

function valoresDe(def: ModuloDef, registro?: Registro): Valores {
  const base: Valores = { ...(def.inicial ?? {}) }
  for (const c of def.campos) {
    if (registro && c.nombre in registro) base[c.nombre] = registro[c.nombre] as Valor
  }
  return base
}

export function FormularioModulo({ def, registro, alTerminar }: Props) {
  const { uid, usuario } = useSesion()
  const { registros: colaboradores } = useColeccion('colaboradores')
  const [valores, setValores] = useState<Valores>(() => valoresDe(def, registro))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const ocupado = guardando || eliminando || cancelando
  const [idReservado] = useState(() => (def.adjuntos && !registro ? reservarId(def.coleccion) : undefined))
  const registroId = registro?.id ?? idReservado
  const { registros: todosAdjuntos } = useColeccion(def.adjuntos ? 'adjuntos' : null)
  const adjuntosDelRegistro = useMemo(
    () => (todosAdjuntos as unknown as Adjunto[]).filter((a) => a.modulo === def.adjuntos && a.registro_id === registroId),
    [todosAdjuntos, def.adjuntos, registroId],
  )
  const tieneAdjuntos = adjuntosDelRegistro.length > 0
  const colaboradorElegido = typeof valores.colaborador_id === 'string' ? valores.colaborador_id : ''
  const puedeEliminar = !!registro && admiteEliminar(def) && puede(usuario, 'administrar')

  const ctx = useMemo<ContextoModulo>(() => ({
    ciudadDeColaborador: (id) => {
      const c = colaboradores.find((x) => x.id === id)
      return typeof c?.ciudad === 'string' ? c.ciudad : null
    },
  }), [colaboradores])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const saneados = sanitizarValores(def.campos, valores)
    setValores(saneados)
    const errs = validarRegistro(def, saneados)
    setErrores(errs)
    if (Object.keys(errs).length || !uid) return
    setGuardando(true)
    setFallo(null)
    try {
      const limpio = limpiarOcultos(def.campos, saneados)
      const final = def.derivar ? def.derivar(limpio, ctx, new Date()) : limpio
      await guardar(def.coleccion, final, uid, def.idFijo ? def.idFijo(final) : registro?.id ?? idReservado)
      alTerminar()
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!registro) return
    setEliminando(true)
    setFallo(null)
    try {
      if (def.adjuntos) await borrarAdjuntosDeRegistro(def.adjuntos, registro.id, adjuntosDelRegistro)
      await eliminar(def.coleccion, registro.id)
      alTerminar()
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo eliminar')
      setConfirmando(false)
    } finally {
      setEliminando(false)
    }
  }

  // Al cancelar un registro nuevo se descartan los archivos subidos en la sesión.
  async function cancelar() {
    if (!def.adjuntos || registro || !registroId || !tieneAdjuntos) return alTerminar()
    setCancelando(true)
    setFallo(null)
    try {
      await borrarAdjuntosDeRegistro(def.adjuntos, registroId, adjuntosDelRegistro)
      alTerminar()
    } catch {
      setFallo('No se pudieron descartar los archivos subidos')
      setCancelando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="tarjeta aparecer">
      <div className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
        {def.campos.filter((c) => campoVisible(c, valores)).map((c) => {
          const alCambiar = (v: Valor) => setValores((prev) => ({ ...prev, [c.nombre]: v }))
          if (c.tipo === 'lista') {
            return <CampoLista key={c.nombre} campo={c} valor={valores[c.nombre]} errores={errores} alCambiar={alCambiar} />
          }
          return (
            <CampoEntrada key={c.nombre} campo={c} valor={valores[c.nombre]} error={errores[c.nombre]}
              deshabilitado={(!!registro && !!def.bloquearEnEdicion?.includes(c.nombre))
                || (c.nombre === 'colaborador_id' && tieneAdjuntos)} alCambiar={alCambiar} />
          )
        })}
        {def.adjuntos && tieneAdjuntos && (
          <p className="text-xs font-medium text-texto-suave sm:col-span-2">
            Tiene archivos adjuntos: no se puede cambiar el colaborador
          </p>
        )}
        {def.adjuntos && registroId && (
          <div className="sm:col-span-2">
            {colaboradorElegido ? (
              <Adjuntos modulo={def.adjuntos} registroId={registroId} colaboradorId={colaboradorElegido}
                soloLectura={!puede(usuario, 'capturar')} />
            ) : (
              <p className="rounded border border-dashed border-borde-fuerte bg-superficie-2 px-3 py-3 text-sm text-texto-suave">
                Elige un colaborador para adjuntar archivos
              </p>
            )}
          </div>
        )}
      </div>
      {fallo && <div className="px-4 pb-4 sm:px-6"><AvisoError>{fallo}</AvisoError></div>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde bg-superficie-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        {puedeEliminar && (
          <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:flex-row">
            {confirmando ? (
              <>
                {def.adjuntos && (
                  <p role="alert" className="self-center text-xs font-medium text-error">
                    También se eliminarán sus archivos adjuntos.
                  </p>
                )}
                <button type="button" onClick={() => void borrar()} disabled={ocupado}
                  className="boton-secundario border-error text-error">
                  <Icono nombre="alerta" />
                  {eliminando ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} disabled={ocupado}
                  aria-label="Cancelar eliminación" className="boton-secundario">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado}
                className="boton-secundario text-error">Eliminar</button>
            )}
          </div>
        )}
        <button type="button" onClick={() => void cancelar()} disabled={ocupado} className="boton-secundario">
          {cancelando ? 'Descartando...' : 'Cancelar'}
        </button>
        <button type="submit" disabled={ocupado} className="boton-primario">{guardando ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}
