'use client'

import { useState } from 'react'
import { parsearCapacitacionesExcel, type ResultadoParseo } from '@/domain/capacitaciones-excel'
import { importarCapacitaciones, type InformeImportacion } from '@/infrastructure/api/capacitaciones'
import { leerXlsx } from '@/infrastructure/xlsx/leer-xlsx'
import { AvisoError } from '@/presentation/ui/Estado'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="tarjeta p-3">
      <p className="text-xs text-texto-suave">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
    </div>
  )
}

function Lista({ titulo, nota, total, items }: { titulo: string; nota: string; total: number; items: string[] }) {
  if (total === 0) return null
  return (
    <section className="tarjeta p-4">
      <h2 className="text-base">{titulo} ({total})</h2>
      <p className="mt-1 text-sm text-texto-suave">{nota}</p>
      <ul className="mt-2 text-sm">{items.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ul>
      {total > items.length && <p className="mt-2 text-xs text-texto-suave">Se muestran los primeros {items.length}.</p>}
    </section>
  )
}

export function ImportarCapacitaciones() {
  const [lectura, setLectura] = useState<{ archivo: string; resultado: ResultadoParseo } | null>(null)
  const [informe, setInforme] = useState<InformeImportacion | null>(null)
  const [ocupado, setOcupado] = useState<'leer' | 'simular' | 'aplicar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [clave, setClave] = useState(0)

  async function elegirArchivo(f: File | undefined) {
    if (!f) return
    setOcupado('leer')
    setError(null)
    setInforme(null)
    setConfirmando(false)
    try {
      setLectura({ archivo: f.name, resultado: parsearCapacitacionesExcel(await leerXlsx(await f.arrayBuffer())) })
    } catch (e) {
      setLectura(null)
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    } finally {
      setOcupado(null)
    }
  }

  async function ejecutar(simular: boolean) {
    if (!lectura) return
    setOcupado(simular ? 'simular' : 'aplicar')
    setConfirmando(false)
    setError(null)
    try {
      setInforme(await importarCapacitaciones(lectura.resultado.filas, simular))
      if (!simular) { setLectura(null); setClave((c) => c + 1) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar')
    } finally {
      setOcupado(null)
    }
  }

  const filas = lectura?.resultado.filas ?? []
  const hojas = new Set(filas.map((f) => f.hoja)).size
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="archivo-capacitaciones" className="block text-sm">Archivo de seguimiento (.xlsx)</label>
        <input key={clave} id="archivo-capacitaciones" type="file" accept=".xlsx" disabled={ocupado !== null}
          onChange={(e) => void elegirArchivo(e.target.files?.[0])} />
        {ocupado === 'leer' && <p className="text-sm text-texto-suave">Leyendo...</p>}
      </div>
      {error && <AvisoError>{error}</AvisoError>}
      {lectura && (
        <div className="space-y-3">
          <p className="text-sm text-texto-suave">
            {lectura.archivo}: {filas.length} capacitaciones de {hojas} hojas, con el dato más reciente de cada persona.
            {lectura.resultado.hojasSinFilas.length > 0 && ` Sin personas: ${lectura.resultado.hojasSinFilas.join(', ')}.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void ejecutar(true)} disabled={ocupado !== null || filas.length === 0} className="boton-secundario">
              {ocupado === 'simular' ? 'Simulando...' : 'Simular'}
            </button>
            {confirmando ? (
              <>
                <span className="text-sm text-texto-suave">Se crearán y actualizarán capacitaciones en la app.</span>
                <button type="button" onClick={() => void ejecutar(false)} disabled={ocupado !== null} className="boton-primario">Confirmar importación</button>
                <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado !== null || filas.length === 0} className="boton-primario">
                {ocupado === 'aplicar' ? 'Importando...' : 'Aplicar'}
              </button>
            )}
          </div>
        </div>
      )}
      {informe && (
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">
            {informe.simulacion ? 'Simulación: no se escribió nada.' : 'Importación terminada.'} {informe.total} capacitaciones del archivo.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <Dato etiqueta="Nuevas" valor={informe.nuevas} />
            <Dato etiqueta="Actualizadas" valor={informe.actualizadas} />
            <Dato etiqueta="Sin cambios" valor={informe.sinCambios} />
            <Dato etiqueta="No retrocedidas" valor={informe.noRetrocedidas} />
            <Dato etiqueta="Sin coincidencia" valor={informe.totalSinCoincidencia} />
            <Dato etiqueta="Ambiguas" valor={informe.totalAmbiguas} />
            <Dato etiqueta="Rechazadas" valor={informe.totalRechazadas} />
          </div>
          <Lista titulo="Sin coincidencia" total={informe.totalSinCoincidencia} items={informe.sinCoincidencia}
            nota="No hay un colaborador con ese nombre en la app; se corrige el nombre en el Excel o se da de alta." />
          <Lista titulo="Ambiguas" total={informe.totalAmbiguas} items={informe.ambiguas}
            nota="Varios colaboradores con el mismo nombre; no se escribió nada para ellos." />
          <Lista titulo="Rechazadas" total={informe.totalRechazadas} items={informe.rechazadas.map((r) => `${r.hoja}, fila ${r.fila}: ${r.motivo}`)}
            nota="Se corrigen en el Excel y se vuelve a importar." />
        </div>
      )}
    </div>
  )
}
