'use client'

import { useState } from 'react'
import { parsearNormasObligatoriasExcel, type ResultadoNormasExcel } from '@/domain/normas-obligatorias-excel'
import { importarNormasObligatorias, type InformeNormasObligatorias } from '@/infrastructure/api/capacitaciones'
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

export function AsignarNormas() {
  const [lectura, setLectura] = useState<{ archivo: string; resultado: ResultadoNormasExcel } | null>(null)
  const [informe, setInforme] = useState<InformeNormasObligatorias | null>(null)
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
      setLectura({ archivo: f.name, resultado: parsearNormasObligatoriasExcel(await leerXlsx(await f.arrayBuffer())) })
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
      setInforme(await importarNormasObligatorias(lectura.resultado.filas, simular))
      if (!simular) { setLectura(null); setClave((c) => c + 1) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setOcupado(null)
    }
  }

  const resultado = lectura?.resultado
  const filas = resultado?.filas ?? []
  const bloqueado = informe !== null && informe.normasDesconocidas.length > 0
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="archivo-normas" className="block text-sm">Excel de capacitación por personal (.xlsx)</label>
        <input key={clave} id="archivo-normas" type="file" accept=".xlsx" disabled={ocupado !== null}
          onChange={(e) => void elegirArchivo(e.target.files?.[0])} />
        {ocupado === 'leer' && <p className="text-sm text-texto-suave">Leyendo...</p>}
      </div>
      {error && <AvisoError>{error}</AvisoError>}
      {lectura && resultado && (
        <div className="space-y-3">
          <p className="text-sm text-texto-suave">
            {lectura.archivo}: {filas.length} personas y {resultado.normas.length} normas ({resultado.normas.join(', ') || 'ninguna'}).
          </p>
          <Lista titulo="Filas rechazadas" total={resultado.rechazadas.length} items={resultado.rechazadas.slice(0, 50).map((r) => `${r.hoja}, fila ${r.fila}: ${r.motivo}`)}
            nota="Se corrigen en el Excel y se vuelve a cargar; no se tomarán en cuenta." />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void ejecutar(true)} disabled={ocupado !== null || filas.length === 0} className="boton-secundario">
              {ocupado === 'simular' ? 'Simulando...' : 'Simular'}
            </button>
            {confirmando ? (
              <>
                <span className="text-sm text-texto-suave">Se reemplazan las normas obligatorias de las personas del archivo.</span>
                <button type="button" onClick={() => void ejecutar(false)} disabled={ocupado !== null} className="boton-primario">Confirmar</button>
                <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado !== null || filas.length === 0 || bloqueado} className="boton-primario">
                {ocupado === 'aplicar' ? 'Guardando...' : 'Aplicar'}
              </button>
            )}
          </div>
        </div>
      )}
      {informe && (
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">
            {informe.simulacion ? 'Simulación: no se escribió nada.' : informe.normasDesconocidas.length > 0 ? 'No se guardó nada.' : 'Normas guardadas.'} {informe.total} personas del archivo.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Dato etiqueta="Actualizados" valor={informe.actualizados} />
            <Dato etiqueta="Sin cambios" valor={informe.sinCambios} />
            <Dato etiqueta="Sin coincidencia" valor={informe.totalSinCoincidencia} />
            <Dato etiqueta="Ambiguos" valor={informe.totalAmbiguas} />
            <Dato etiqueta="Activos fuera del archivo" valor={informe.fueraDelArchivo} />
          </div>
          <Lista titulo="Normas fuera del catálogo" total={informe.normasDesconocidas.length} items={informe.normasDesconocidas}
            nota="Dalas de alta en el catálogo de normas con ese nombre o ajusta el encabezado del Excel. Mientras tanto no se guarda nada." />
          <Lista titulo="Sin coincidencia" total={informe.totalSinCoincidencia} items={informe.sinCoincidencia}
            nota="No hay un colaborador con ese nombre en la app; se corrige el nombre en el Excel o se da de alta." />
          <Lista titulo="Ambiguos" total={informe.totalAmbiguas} items={informe.ambiguas}
            nota="Varios colaboradores con el mismo nombre; no se escribió nada para ellos." />
        </div>
      )}
    </div>
  )
}
