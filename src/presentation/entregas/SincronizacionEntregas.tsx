'use client'

import Link from 'next/link'
import { useState } from 'react'
import { sincronizarEntregas, type InformeSincronizacion } from '@/infrastructure/api/entregas'
import { AvisoError } from '@/presentation/ui/Estado'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="tarjeta p-3">
      <p className="text-xs text-texto-suave">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
    </div>
  )
}

export function SincronizacionEntregas() {
  const [informe, setInforme] = useState<InformeSincronizacion | null>(null)
  const [ocupado, setOcupado] = useState<'simular' | 'sincronizar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  async function ejecutar(simular: boolean) {
    setOcupado(simular ? 'simular' : 'sincronizar')
    setConfirmando(false)
    setError(null)
    try {
      setInforme(await sincronizarEntregas(simular))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void ejecutar(true)} disabled={ocupado !== null} className="boton-secundario">
          {ocupado === 'simular' ? 'Simulando...' : 'Simular'}
        </button>
        {confirmando ? (
          <>
            <span className="text-sm text-texto-suave">Se escribirán las entregas de la hoja en la app.</span>
            <button type="button" onClick={() => void ejecutar(false)} disabled={ocupado !== null} className="boton-primario">
              Confirmar sincronización
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado !== null} className="boton-primario">
            {ocupado === 'sincronizar' ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        )}
      </div>
      {error && <AvisoError>{error}</AvisoError>}
      {informe && (
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">
            {informe.simulacion ? 'Simulación: no se escribió nada.' : 'Sincronización terminada.'} {informe.total} filas en la hoja.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Dato etiqueta="Nuevas" valor={informe.nuevas} />
            <Dato etiqueta="Actualizadas" valor={informe.actualizadas} />
            <Dato etiqueta="Sin cambios" valor={informe.sinCambios} />
            <Dato etiqueta="Omitidas (equipo no entregado)" valor={informe.omitidas} />
            <Dato etiqueta={informe.simulacion ? 'Colaboradores por crear' : 'Colaboradores creados'} valor={informe.colaboradoresNuevos} />
            <Dato etiqueta="Rechazadas" valor={informe.totalRechazadas} />
          </div>
          {informe.sinMapeo.length > 0 && (
            <section className="tarjeta p-4">
              <h2 className="text-base">Artículos sin mapeo ({informe.sinMapeo.length})</h2>
              <p className="mt-1 text-sm text-texto-suave">
                Esas filas no se importan hasta asignarlas en <Link href="/admin/articulos-hoja" className="underline">Artículos de la hoja</Link>.
              </p>
              <ul className="mt-2 text-sm">
                {informe.sinMapeo.map((a) => <li key={a.clave}>{a.articulo} ({a.filas})</li>)}
              </ul>
            </section>
          )}
          {informe.totalRechazadas > 0 && (
            <section className="tarjeta p-4">
              <h2 className="text-base">Filas rechazadas ({informe.totalRechazadas})</h2>
              <p className="mt-1 text-sm text-texto-suave">Se corrigen en la hoja y se vuelven a sincronizar.</p>
              <ul className="mt-2 text-sm">
                {informe.rechazadas.map((r) => <li key={r.fila}>Fila {r.fila}: {r.motivo}</li>)}
              </ul>
              {informe.totalRechazadas > informe.rechazadas.length && (
                <p className="mt-2 text-xs text-texto-suave">Se muestran las primeras {informe.rechazadas.length}.</p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
