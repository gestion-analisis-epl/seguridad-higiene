'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  campoVisible, limpiarOcultos, sanitizarValores, validarRegistro, type ContextoModulo, type ModuloDef, type Valor, type Valores,
} from '@/domain/modulos'
import { admiteEliminar } from '@/domain/modulos-definiciones'
import { puede } from '@/domain/permisos'
import { eliminar, guardar, type Registro } from '@/infrastructure/firestore/repositorio'
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
  const ocupado = guardando || eliminando
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
      await guardar(def.coleccion, final, uid, def.idFijo ? def.idFijo(final) : registro?.id)
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
      await eliminar(def.coleccion, registro.id)
      alTerminar()
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo eliminar')
      setConfirmando(false)
    } finally {
      setEliminando(false)
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
              deshabilitado={!!registro && !!def.bloquearEnEdicion?.includes(c.nombre)} alCambiar={alCambiar} />
          )
        })}
      </div>
      {fallo && <div className="px-4 pb-4 sm:px-6"><AvisoError>{fallo}</AvisoError></div>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde bg-superficie-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        {puedeEliminar && (
          <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:flex-row">
            {confirmando ? (
              <>
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
        <button type="button" onClick={alTerminar} className="boton-secundario">Cancelar</button>
        <button type="submit" disabled={ocupado} className="boton-primario">{guardando ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}
