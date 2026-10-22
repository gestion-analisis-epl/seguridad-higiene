'use client'

import { useMemo, useState } from 'react'
import { planearImportacion, type Decisiones, type HojaLeida } from '@/domain/dotacion-excel'
import type { Opcion } from '@/domain/modulos'
import type { ReglaDotacion } from '@/domain/reglas-dotacion'
import { importarReglas } from '@/infrastructure/api/dotacion'
import { leerXlsx } from '@/infrastructure/xlsx/leer-xlsx'
import { AvisoError } from '@/presentation/ui/Estado'

interface Props {
  reglas: ReglaDotacion[]
  lineas: Opcion[]
  ciudades: Opcion[]
  areas: Opcion[]
  tiposEpp: Opcion[]
  etiquetaDe: (opciones: Opcion[], valor: string) => string
}

const SIN_DECISIONES: Decisiones = { hojas: {}, conflictos: {} }
const mensaje = (e: unknown, defecto: string) => (e instanceof Error ? e.message : defecto)

function Selector({ etiqueta, opciones, valor, alCambiar }: { etiqueta: string; opciones: Opcion[]; valor: string | null; alCambiar: (v: string) => void }) {
  return (
    <select aria-label={etiqueta} className="control max-w-xs" value={valor ?? ''} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">{etiqueta}</option>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
    </select>
  )
}

export function ImportarReglasEpp({ reglas, lineas, ciudades, areas, tiposEpp, etiquetaDe }: Props) {
  const [hojas, setHojas] = useState<HojaLeida[]>([])
  const [archivo, setArchivo] = useState('')
  const [decisiones, setDecisiones] = useState<Decisiones>(SIN_DECISIONES)
  const [ocupado, setOcupado] = useState<'leer' | 'guardar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ creadas: number; actualizadas: number } | null>(null)

  const plan = useMemo(
    () => planearImportacion(hojas, { lineas, ciudades, areas, tiposEpp }, reglas, decisiones, archivo),
    [hojas, lineas, ciudades, areas, tiposEpp, reglas, decisiones, archivo],
  )

  async function elegirArchivo(f: File | undefined) {
    if (!f) return
    setOcupado('leer')
    setError(null)
    setResultado(null)
    try {
      setHojas(await leerXlsx(await f.arrayBuffer()))
      setArchivo(f.name)
      setDecisiones(SIN_DECISIONES)
    } catch (e) {
      setHojas([])
      setArchivo('')
      setError(mensaje(e, 'No se pudo leer el archivo'))
    } finally {
      setOcupado(null)
    }
  }

  const decidirHoja = (hoja: string, campo: 'linea' | 'ciudad', valor: string) =>
    setDecisiones((d) => ({ ...d, hojas: { ...d.hojas, [hoja]: { ...d.hojas[hoja], [campo]: valor || undefined } } }))

  async function guardar() {
    setOcupado('guardar')
    setError(null)
    try {
      const r = await importarReglas(plan.reglas.map(({ linea_negocio, puesto_etiqueta, ciudad, area, tipos_epp }) =>
        ({ linea_negocio, puesto_etiqueta, ciudad, area, tipos_epp })))
      setResultado(r)
      setHojas([])
      setArchivo('')
    } catch (e) {
      setError(mensaje(e, 'No se pudieron guardar las reglas'))
    } finally {
      setOcupado(null)
    }
  }

  const bloqueado = plan.hojasPendientes.length > 0 || plan.conflictos.length > 0
  const nuevas = plan.reglas.filter((r) => r.accion === 'crear').length
  const puedeGuardar = !bloqueado && plan.reglas.length > 0 && ocupado === null
  const hayMatriz = hojas.length > 0

  return (
    <div className="tarjeta space-y-4 p-4">
      <p className="text-sm text-texto-suave">
        Sube el Excel de determinación de EPP. Si el archivo es de una sola empresa, ponle su nombre al archivo y las reglas aplican a todas sus ciudades. Si no, cada hoja se cruza con tu catálogo (empresa y ciudad por el nombre corto, el departamento
        con las áreas y cada inciso con el catálogo de EPP). Lo que ya existe se actualiza solo en EPP; el uniforme no se toca. Nada se guarda hasta que confirmes.
      </p>
      <label className="flex flex-wrap items-center gap-3 text-sm">
        Archivo .xlsx
        <input type="file" accept=".xlsx" aria-label="Archivo de Excel" disabled={ocupado !== null}
          onChange={(e) => { void elegirArchivo(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {ocupado === 'leer' && <p className="text-sm text-texto-suave">Leyendo el archivo...</p>}
      {error && <AvisoError>{error}</AvisoError>}
      {resultado && (
        <p role="status" className="text-sm">Listo. Se crearon {resultado.creadas} reglas y se actualizó el EPP de {resultado.actualizadas}.</p>
      )}
      {archivo && !hayMatriz && <AvisoError>No encontré ninguna matriz de puestos y EPP en {archivo}.</AvisoError>}

      {plan.hojasPendientes.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="etiqueta">Hojas que no pude identificar</legend>
          {plan.hojasPendientes.map((h) => (
            <div key={h.hoja} className="flex flex-wrap items-center gap-2 text-sm">
              <strong className="min-w-40">{h.hoja}</strong>
              {!h.linea && <Selector etiqueta="Empresa" opciones={lineas} valor={decisiones.hojas[h.hoja]?.linea ?? null} alCambiar={(v) => decidirHoja(h.hoja, 'linea', v)} />}
              {!h.ciudad && <Selector etiqueta="Ciudad" opciones={ciudades} valor={decisiones.hojas[h.hoja]?.ciudad ?? null} alCambiar={(v) => decidirHoja(h.hoja, 'ciudad', v)} />}
            </div>
          ))}
        </fieldset>
      )}

      {plan.conflictos.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="etiqueta">Mismo puesto con EPP distinto en varias hojas: elige cuál prevalece</legend>
          {plan.conflictos.map((c) => (
            <div key={c.id} className="space-y-1 text-sm">
              <p><strong>{c.puesto_etiqueta}</strong> · {etiquetaDe(lineas, c.linea_negocio)} · {c.ciudad ? etiquetaDe(ciudades, c.ciudad) : 'Todas las ciudades'}
                {c.area ? ` · ${etiquetaDe(areas, c.area)}` : ''}</p>
              <div className="flex flex-wrap gap-4">
                {c.opciones.map((o) => (
                  <label key={o.hoja} className="flex items-center gap-2">
                    <input type="radio" name={`conflicto-${c.id}`} checked={decisiones.conflictos[c.id] === o.hoja}
                      onChange={() => setDecisiones((d) => ({ ...d, conflictos: { ...d.conflictos, [c.id]: o.hoja } }))} />
                    {o.hoja} ({o.tipos_epp.length} EPP)
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {plan.problemas.length > 0 && (
        <div role="alert" className="space-y-1 text-sm text-error">
          <p>No se importarán {plan.problemas.length} filas:</p>
          <ul className="list-disc pl-5">{plan.problemas.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      {plan.reglas.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            {plan.reglas.length} reglas listas: {nuevas} nuevas y {plan.reglas.length - nuevas} que actualizan su EPP
          </summary>
          <ul className="mt-2 divide-y divide-borde text-sm">
            {plan.reglas.map((r) => (
              <li key={r.id} className="py-2">
                <strong>{r.puesto_etiqueta}</strong> · {etiquetaDe(lineas, r.linea_negocio)} · {r.ciudad ? etiquetaDe(ciudades, r.ciudad) : 'Todas las ciudades'}
                {r.area ? ` · ${etiquetaDe(areas, r.area)}` : ''} — {r.accion === 'crear' ? 'nueva' : 'actualiza'}
                <br />
                <span className="text-texto-suave">EPP: {r.tipos_epp.map((t) => etiquetaDe(tiposEpp, t)).join(', ') || 'Ninguno'} (hoja {r.hojas.join(', ')})</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hayMatriz && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="boton-primario" disabled={!puedeGuardar} onClick={() => void guardar()}>
            {ocupado === 'guardar' ? 'Guardando...' : `Guardar ${plan.reglas.length} reglas`}
          </button>
          {bloqueado && <p className="text-xs text-texto-suave">Resuelve las hojas y los conflictos de arriba para guardar.</p>}
        </div>
      )}
    </div>
  )
}
