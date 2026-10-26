'use client'

import { useState } from 'react'
import type { PendienteSincronizacion, ResultadoSincronizacion } from '@/application/colaboradores-servidor'
import { importarColaboradores, sincronizarColaboradores, vincular } from '@/infrastructure/api/colaboradores'
import { AvisoError } from '@/presentation/ui/Estado'

type Informe = ResultadoSincronizacion & { simulado: boolean }

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="tarjeta p-3">
      <p className="text-xs text-texto-suave">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
    </div>
  )
}

const mensaje = (e: unknown, defecto: string) => (e instanceof Error ? e.message : defecto)

export function SincronizacionColaboradores({ alCambiar }: { alCambiar: () => void }) {
  const [informe, setInforme] = useState<Informe | null>(null)
  const [ocupado, setOcupado] = useState<'simular' | 'sincronizar' | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendientes, setPendientes] = useState<PendienteSincronizacion[]>([])
  const [resolviendo, setResolviendo] = useState<string | null>(null)
  const [fallos, setFallos] = useState<Record<string, string>>({})

  async function ejecutar(simular: boolean) {
    setOcupado(simular ? 'simular' : 'sincronizar')
    setConfirmando(false)
    setError(null)
    setFallos({})
    try {
      const r = await sincronizarColaboradores(simular)
      setInforme(r)
      setPendientes(r.pendientes)
      if (!simular) alCambiar()
    } catch (e) {
      setError(mensaje(e, 'No se pudo sincronizar'))
    } finally {
      setOcupado(null)
    }
  }

  async function resolver(p: PendienteSincronizacion, accion: () => Promise<unknown>) {
    setResolviendo(p.id_interno)
    setFallos((f) => { const s = { ...f }; delete s[p.id_interno]; return s })
    try {
      await accion()
      setPendientes((lista) => lista.filter((x) => x.id_interno !== p.id_interno))
      alCambiar()
    } catch (e) {
      setFallos((f) => ({ ...f, [p.id_interno]: mensaje(e, 'No se pudo resolver') }))
    } finally {
      setResolviendo(null)
    }
  }

  const crearNuevo = async (p: PendienteSincronizacion) => {
    const r = await importarColaboradores([p.id_interno])
    if (r.errores.length) throw new Error(r.errores[0].error)
  }

  return (
    <div className="tarjeta space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm">
          Aplica la hoja: altas de activos, bajas y reingresos, y movimientos (puesto, zona, jefe, etc.). No cambia nombre, fecha de ingreso, id ni número.
        </p>
        <button type="button" onClick={() => void ejecutar(true)} disabled={ocupado !== null} className="boton-secundario">
          {ocupado === 'simular' ? 'Simulando...' : 'Simular'}
        </button>
        {confirmando ? (
          <>
            <button type="button" onClick={() => void ejecutar(false)} disabled={ocupado !== null} className="boton-primario">
              Confirmar actualización
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado !== null} className="boton-primario">
            {ocupado === 'sincronizar' ? 'Actualizando...' : 'Actualizar desde la hoja'}
          </button>
        )}
      </div>
      {error && <AvisoError>{error}</AvisoError>}
      {informe && (
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">{informe.simulado ? 'Simulación: no se escribió nada.' : 'Actualización terminada.'}</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Dato etiqueta={informe.simulado ? 'Por crear' : 'Creados'} valor={informe.creados} />
            <Dato etiqueta={informe.simulado ? 'Por actualizar' : 'Actualizados'} valor={informe.actualizados} />
            <Dato etiqueta={informe.simulado ? 'Por reactivar' : 'Reactivados'} valor={informe.reactivados} />
            <Dato etiqueta={informe.simulado ? 'Por desactivar' : 'Desactivados'} valor={informe.desactivados} />
            <Dato etiqueta="Por decidir" valor={pendientes.length} />
            <Dato etiqueta="Con error" valor={informe.errores.length} />
          </div>
          {pendientes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base">Por decidir ({pendientes.length})</h2>
              <p className="text-sm text-texto-suave">
                Coinciden en nombre con alguien ya registrado y sin vincular a la hoja. Elige si es la misma persona o una nueva.
              </p>
              <ul className="divide-y divide-borde rounded border border-borde">
                {pendientes.map((p) => (
                  <li key={p.id_interno} className="space-y-2 p-3">
                    <p className="text-sm font-medium">
                      {p.nombre} <span className="font-normal text-texto-suave">· id {p.id_interno}{p.inactivo ? ' · inactivo en la hoja' : ''}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {p.candidatos.map((c) => (
                        <button key={c.uid} type="button" disabled={resolviendo !== null || informe.simulado} className="boton-primario"
                          onClick={() => void resolver(p, () => vincular(c.uid, p.id_interno))}>
                          {resolviendo === p.id_interno ? 'Procesando...'
                            : p.candidatos.length > 1 ? `Es ${c.nombre} (${c.uid.slice(0, 6)})` : 'Es la misma persona: vincular'}
                        </button>
                      ))}
                      <button type="button" disabled={resolviendo !== null || informe.simulado} className="boton-secundario"
                        onClick={() => void resolver(p, () => crearNuevo(p))}>Es otra persona: crear nuevo</button>
                      <button type="button" disabled={resolviendo !== null} className="boton-secundario"
                        onClick={() => setPendientes((l) => l.filter((x) => x.id_interno !== p.id_interno))}>Dejar para después</button>
                    </div>
                    {fallos[p.id_interno] && <AvisoError>{fallos[p.id_interno]}</AvisoError>}
                  </li>
                ))}
              </ul>
              {informe.simulado && <p className="text-xs text-texto-suave">Las decisiones se habilitan al actualizar de verdad.</p>}
            </section>
          )}
          {informe.errores.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base">Con error ({informe.errores.length})</h2>
              <p className="text-sm text-texto-suave">No se tocaron. Se corrigen en la hoja y se vuelve a actualizar.</p>
              <ul className="text-sm">
                {informe.errores.map((x) => <li key={x.id_interno}>{x.nombre} (id {x.id_interno}): {x.error}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
