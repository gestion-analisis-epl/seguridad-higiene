'use client'

import { useMemo } from 'react'
import { etiquetaColaboradorHoja, type ColaboradorHoja } from '@/domain/colaboradores-hoja'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { AvisoError } from '@/presentation/ui/Estado'
import { SelectBuscable } from '@/presentation/ui/SelectBuscable'
import { PrevistaHoja } from './PrevistaHoja'
import { useColaboradoresHoja } from './useColaboradoresHoja'

const texto = (v: unknown) => (typeof v === 'string' ? v : '')

// Los datos guardados del colaborador con la misma forma que una fila de la hoja
function datosDelRegistro(r: Registro): ColaboradorHoja {
  const ingreso = r.fecha_ingreso
  return {
    id_interno: texto(r.id_interno), numero: texto(r.numero_colaborador), nombre: texto(r.nombre), plaza: texto(r.ciudad),
    departamento: texto(r.area), empresa: texto(r.linea_negocio), puesto: texto(r.puesto),
    fecha_ingreso: ingreso instanceof Date ? ingreso.toISOString().slice(0, 10) : null,
    zona: '', jefe: '', gerente: '', fecha_baja: null, motivo_baja: '',
  }
}

export function VinculoHoja({ registro, colaboradores, elegida, alElegir }: {
  registro: Registro
  colaboradores: Registro[]
  elegida: ColaboradorHoja | null
  alElegir: (fila: ColaboradorHoja | null) => void
}) {
  const { filas, cargando, error, desactualizado, actualizar } = useColaboradoresHoja()
  const idActual = typeof registro.id_interno === 'string' ? registro.id_interno : ''
  const valor = elegida?.id_interno ?? idActual

  const opciones = useMemo(() => {
    const deOtros = new Set(colaboradores
      .filter((c) => c.id !== registro.id && typeof c.id_interno === 'string')
      .map((c) => c.id_interno as string))
    return filas
      .filter((f) => !deOtros.has(f.id_interno))
      .map((f) => ({ valor: f.id_interno, etiqueta: etiquetaColaboradorHoja(f) }))
  }, [filas, colaboradores, registro.id])

  const mostrada = elegida ?? datosDelRegistro(registro)

  return (
    <>
      <div className="sm:col-span-2">
        <label id="vinculo-hoja-et" htmlFor="vinculo-hoja" className="etiqueta">Colaborador en la hoja</label>
        <SelectBuscable id="vinculo-hoja" etiqueta="Colaborador en la hoja" etiquetaId="vinculo-hoja-et" opciones={opciones}
          valor={valor} textoVacio={cargando && filas.length === 0 ? 'Cargando lista...' : 'Selecciona'}
          alCambiar={(v) => alElegir(filas.find((f) => f.id_interno === v) ?? null)} />
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
          {elegida && elegida.id_interno !== idActual && <span>Al guardar se actualizarán los datos con los de la hoja</span>}
          {elegida?.fecha_baja && <span className="font-medium text-error">Está de baja en la hoja: se marcará como inactivo</span>}
          {!idActual && !elegida && <span>Sin vincular: elige a la persona para actualizar sus datos</span>}
          {desactualizado && <span>La lista puede estar desactualizada</span>}
          <button type="button" onClick={actualizar} disabled={cargando} className="underline">Actualizar lista</button>
        </div>
        {error && <div className="mt-2"><AvisoError>{error}</AvisoError></div>}
      </div>
      <PrevistaHoja fila={mostrada} conNombre />
      {!elegida && <p className="text-xs text-texto-suave sm:col-span-2">Datos actuales; vienen de la hoja y no se editan aquí</p>}
    </>
  )
}
