'use client'

import { useState, type FormEvent } from 'react'
import type { FilaEntrega } from '@/application/entregas-agrupar'
import { planificarEntrega, valoresIniciales } from '@/application/entregas-planificar'
import type { ErroresEntrega, Modo } from '@/application/entregas-tipos'
import { copiaDeColaborador } from '@/domain/colaboradores-hoja'
import { fechaCalendario } from '@/domain/fechas'
import type { CampoDef, Opcion, Valores } from '@/domain/modulos'
import { guardarLote } from '@/infrastructure/firestore/repositorio'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { CampoEntrada } from '@/presentation/datos/CampoEntrada'
import { AvisoError } from '@/presentation/ui/Estado'
import type { ConfiguracionPagina } from './configuraciones'
import { FilaItemEntrega } from './FilaItemEntrega'
import { SelectorModo } from './SelectorModo'

const SIN_ERRORES: ErroresEntrega = { items: {} }
const CAMPO_FECHA: CampoDef = { nombre: 'fecha', etiqueta: 'Fecha de entrega', tipo: 'fecha', requerido: true }

function hoyCalendario(): Date {
  const h = new Date()
  return fechaCalendario(h.getFullYear(), h.getMonth() + 1, h.getDate())
}

export function FormularioEntrega({ cfg, fila, items, alTerminar, alCancelar }: {
  cfg: ConfiguracionPagina
  fila: FilaEntrega
  items: Opcion[]
  alTerminar: () => void
  alCancelar: () => void
}) {
  const { uid } = useSesion()
  const puedeCorregir = fila.cantidadEntregas > 0
  const claves = items.map((i) => i.valor)
  const prellenado = (): Record<string, Valores> =>
    Object.fromEntries(claves.map((k) => [k, valoresIniciales(cfg.config, fila.ultimas[k])]))
  const [modo, setModo] = useState<Modo>('nueva')
  const [fecha, setFecha] = useState<Date | null>(hoyCalendario)
  const [valores, setValores] = useState<Record<string, Valores>>({})
  const [errores, setErrores] = useState<ErroresEntrega>(SIN_ERRORES)
  const [fallo, setFallo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function cambiarModo(m: Modo) {
    setModo(m)
    setErrores(SIN_ERRORES)
    setFallo(null)
    setValores(m === 'corregir' ? prellenado() : {})
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    const plan = planificarEntrega({
      config: cfg.config, modo, colaboradorId: fila.colaborador.id, ciudad: fila.colaborador.ciudad,
      claves, fecha, items: valores, ultimas: fila.ultimas, copia: copiaDeColaborador({ ...fila.colaborador }),
    })
    setErrores(plan.errores)
    setFallo(null)
    if (!plan.operaciones.length) return
    setGuardando(true)
    try {
      await guardarLote(plan.operaciones, uid)
      alTerminar()
    } catch (err) {
      setFallo(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="tarjeta overflow-hidden">
      <SelectorModo modo={modo} puedeCorregir={puedeCorregir} alCambiar={cambiarModo} />
      {modo === 'nueva' && (
        <div className="max-w-xs px-4 pt-4 sm:px-6">
          <CampoEntrada campo={CAMPO_FECHA} prefijo="entrega-" valor={fecha} error={errores.fecha} alCambiar={(v) => setFecha(v as Date | null)} />
        </div>
      )}
      <p className="px-4 pb-3 pt-4 text-sm text-texto-suave sm:px-6">
        {modo === 'nueva' ? 'Captura solo lo que se entrega hoy; deja vacío lo demás.' : 'Modifica lo que cambió; deja igual lo demás.'}
      </p>
      {items.length === 0 && <p className="px-4 pb-4 text-sm text-texto-suave sm:px-6">El catálogo no tiene elementos.</p>}
      {items.map((i) => (
        <FilaItemEntrega key={`${modo}-${i.valor}`} item={i} config={cfg.config} modo={modo}
          valores={valores[i.valor] ?? {}} errores={errores.items[i.valor]} ultima={fila.ultimas[i.valor]}
          alCambiar={(campo, v) => setValores((p) => ({ ...p, [i.valor]: { ...p[i.valor], [campo]: v } }))} />
      ))}
      {(errores.general || fallo) && (
        <div className="grid gap-2 border-t border-borde px-4 py-3 sm:px-6">
          {errores.general && <AvisoError>{errores.general}</AvisoError>}
          {fallo && <AvisoError>{fallo}</AvisoError>}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-borde bg-superficie-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={alCancelar} className="boton-secundario">Cancelar</button>
        <button type="submit" disabled={guardando} className="boton-primario">
          {guardando ? 'Guardando...' : modo === 'nueva' ? 'Registrar entrega' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
