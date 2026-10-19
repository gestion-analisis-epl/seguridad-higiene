'use client'

import { useMemo, useState } from 'react'
import type { ArticuloSinMapeo } from '@/application/entregas-sync'
import { DESTINOS_ENTREGA, ETIQUETA_DESTINO, type DestinoEntrega } from '@/domain/entregas-hoja'
import type { Opcion } from '@/domain/modulos'
import { sincronizarEntregas } from '@/infrastructure/api/entregas'
import { cargarPropuesta, eliminarArticulo, guardarArticulo, type ArticuloMapeado } from '@/infrastructure/firestore/articulos'
import propuesta from '@/data/articulos-hoja-inicial.json'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'

type OpcionesPorDestino = Record<DestinoEntrega, Opcion[]>

interface FilaProps {
  clave: string
  articulo: string
  destino: DestinoEntrega
  valor: string
  nota?: string
  opciones: OpcionesPorDestino
  alGuardar: (articulo: string, destino: DestinoEntrega, valor: string) => Promise<void>
  alEliminar?: (clave: string) => Promise<void>
}

function FilaMapeo({ clave, articulo, destino: destinoInicial, valor: valorInicial, nota, opciones, alGuardar, alEliminar }: FilaProps) {
  const [destino, setDestino] = useState(destinoInicial)
  const [valor, setValor] = useState(valorInicial)
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const puedeGuardar = !!valor && (destino !== destinoInicial || valor !== valorInicial || !alEliminar)

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    try { await accion() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setOcupado(false) }
  }

  return (
    <li className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1.4fr)_10rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium">{articulo}</p>
        {nota && <p className="text-xs text-texto-suave">{nota}</p>}
      </div>
      <select aria-label={`Destino de ${articulo}`} className="control" value={destino}
        onChange={(e) => { setDestino(e.target.value as DestinoEntrega); setValor('') }}>
        {DESTINOS_ENTREGA.map((d) => <option key={d} value={d}>{ETIQUETA_DESTINO[d]}</option>)}
      </select>
      <SelectBuscable id={`mapeo-${clave}`} etiqueta={`Catálogo de ${articulo}`} opciones={opciones[destino]} valor={valor}
        textoVacio="Selecciona" alCambiar={setValor} />
      <div className="flex gap-2">
        <button type="button" disabled={!puedeGuardar || ocupado} className="boton-primario"
          onClick={() => void ejecutar(() => alGuardar(articulo, destino, valor))}>Guardar</button>
        {alEliminar && (confirmando ? (
          <button type="button" disabled={ocupado} className="boton-secundario border-error text-error"
            onClick={() => void ejecutar(() => alEliminar(clave))}>Confirmar</button>
        ) : (
          <button type="button" disabled={ocupado} className="boton-secundario text-error" onClick={() => setConfirmando(true)}>Eliminar</button>
        ))}
      </div>
      {error && <div className="sm:col-span-4"><AvisoError>{error}</AvisoError></div>}
    </li>
  )
}

export function MapeoArticulos() {
  const { uid } = useSesion()
  const { registros, cargando, error } = useColeccion('articulos_hoja')
  const opciones: OpcionesPorDestino = { uniforme: useCatalogo('prendas'), epp: useCatalogo('tipos_epp'), equipo: useCatalogo('tipos_equipo') }
  const [pendientes, setPendientes] = useState<ArticuloSinMapeo[]>([])
  const [ocupado, setOcupado] = useState<'buscar' | 'propuesta' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)

  const mapeados = useMemo(() => new Set(registros.map((r) => r.id)), [registros])
  const lista = useMemo(() => [...registros].sort((a, b) => String(a.articulo).localeCompare(String(b.articulo), 'es')), [registros])
  const faltantes = pendientes.filter((p) => !mapeados.has(p.clave))

  const guardar = (articulo: string, destino: DestinoEntrega, valor: string) => guardarArticulo({ articulo, destino, valor }, uid ?? '')

  async function buscar() {
    setOcupado('buscar')
    setFallo(null)
    setAviso(null)
    try {
      const informe = await sincronizarEntregas(true)
      setPendientes(informe.sinMapeo)
      setAviso(informe.sinMapeo.length ? null : 'No hay artículos sin mapeo en la hoja.')
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo consultar la hoja')
    } finally {
      setOcupado(null)
    }
  }

  async function cargar() {
    setOcupado('propuesta')
    setFallo(null)
    setAviso(null)
    try {
      const n = await cargarPropuesta(propuesta as ArticuloMapeado[], mapeados, uid ?? '')
      setAviso(n ? `Se agregaron ${n} artículos y las entradas de catálogo que faltaban.` : 'La propuesta ya estaba cargada.')
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo cargar la propuesta')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void buscar()} disabled={ocupado !== null} className="boton-secundario">
          {ocupado === 'buscar' ? 'Buscando...' : 'Buscar artículos sin mapeo'}
        </button>
        <button type="button" onClick={() => void cargar()} disabled={ocupado !== null} className="boton-secundario">
          {ocupado === 'propuesta' ? 'Cargando...' : 'Cargar propuesta inicial'}
        </button>
      </div>
      {(error || fallo) && <AvisoError>{error ?? fallo}</AvisoError>}
      {aviso && <p role="status" className="text-sm text-texto-suave">{aviso}</p>}
      {faltantes.length > 0 && (
        <section>
          <h2 className="mb-2 text-base">Sin mapeo ({faltantes.length})</h2>
          <ul className="tarjeta divide-y divide-borde">
            {faltantes.map((p) => (
              <FilaMapeo key={p.clave} clave={p.clave} articulo={p.articulo} destino="uniforme" valor="" nota={`${p.filas} filas`}
                opciones={opciones} alGuardar={guardar} />
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-base">Mapeados ({lista.length})</h2>
        {cargando ? <Cargando /> : (
          <ul className="tarjeta divide-y divide-borde">
            {lista.length === 0 && <li className="p-4 text-sm text-texto-suave">Aún no hay artículos mapeados.</li>}
            {lista.map((r) => (
              <FilaMapeo key={`${r.id}-${String(r.destino)}-${String(r.valor)}`} clave={r.id} articulo={String(r.articulo ?? r.id)}
                destino={r.destino as DestinoEntrega} valor={String(r.valor ?? '')} opciones={opciones}
                alGuardar={guardar} alEliminar={eliminarArticulo} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
