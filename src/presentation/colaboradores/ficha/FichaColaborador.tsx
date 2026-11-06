'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { historialDe } from '@/application/entregas-agrupar'
import { datosGenerales, fichaDeColaborador, registrosDelColaborador } from '@/application/ficha-colaborador'
import type { DatosOperativos } from '@/domain/entidades'
import type { ModuloDef, Opcion, Valores } from '@/domain/modulos'
import { MODULOS } from '@/domain/modulos-definiciones'
import { puede } from '@/domain/permisos'
import { aOracion, aTitulo } from '@/domain/texto'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { ArchivosDeColaborador } from '@/presentation/adjuntos/ArchivosDeColaborador'
import { useSesion } from '@/presentation/auth/AuthProvider'
import { useCatalogo } from '@/presentation/datos/useCatalogo'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useDotacion } from '@/presentation/datos/useDotacion'
import { CONFIGURACIONES, type ConfiguracionPagina } from '@/presentation/entregas/configuraciones'
import { HistorialEntregas } from '@/presentation/entregas/HistorialEntregas'
import { EncabezadoPagina } from '@/presentation/ui/EncabezadoPagina'
import { AvisoError, Cargando } from '@/presentation/ui/Estado'
import { Icono } from '@/presentation/ui/Icono'
import { FormularioDialogo } from './FormularioDialogo'
import { PendientesFicha } from './PendientesFicha'
import { SeccionFicha } from './SeccionFicha'
import { TablaFicha } from './TablaFicha'

const etiquetadora = (opciones: Opcion[]) => (valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor.replace(/-/g, ' ')

interface Edicion { def: ModuloDef; registro?: Registro; inicial?: Valores }

function EntregasFicha({ cfg, registros, colaboradorId, titulo }: {
  cfg: ConfiguracionPagina; registros: Registro[]; colaboradorId: string; titulo: string
}) {
  const items = useCatalogo(cfg.catalogo)
  const historial = useMemo(() => historialDe(registros, colaboradorId), [registros, colaboradorId])
  return <HistorialEntregas config={cfg.config} registros={historial} items={items} titulo={titulo} />
}

export function FichaColaborador({ id }: { id: string }) {
  const router = useRouter()
  const { usuario } = useSesion()
  const capturista = puede(usuario, 'capturar')
  const colaboradores = useColeccion('colaboradores')
  const capacitaciones = useColeccion('capacitaciones')
  const accidentes = useColeccion('accidentes')
  const uniformes = useColeccion('entregas_uniforme')
  const epp = useColeccion('entregas_epp')
  const { dotacion, cargando: cargandoReglas, error: errorReglas } = useDotacion()
  const ciudades = useCatalogo('ciudades')
  const areas = useCatalogo('areas')
  const cuadrillas = useCatalogo('cuadrillas')
  const lineas = useCatalogo('lineas_negocio')
  const normas = useCatalogo('normas')
  const prendas = useCatalogo('prendas')
  const tiposEpp = useCatalogo('tipos_epp')
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const hoy = useMemo(() => new Date(), [])

  const datos = useMemo<DatosOperativos>(() => ({
    colaboradores: colaboradores.registros as unknown as DatosOperativos['colaboradores'],
    capacitaciones: capacitaciones.registros as unknown as DatosOperativos['capacitaciones'],
    entregasUniforme: uniformes.registros as unknown as DatosOperativos['entregasUniforme'],
    entregasEpp: epp.registros as unknown as DatosOperativos['entregasEpp'],
    equipoOficinas: [], vehiculos: [],
  }), [colaboradores.registros, capacitaciones.registros, uniformes.registros, epp.registros])
  const ficha = useMemo(() => fichaDeColaborador(datos, id, hoy, dotacion), [datos, id, hoy, dotacion])
  const registro = colaboradores.registros.find((r) => r.id === id)
  const generales = useMemo(() => (registro ? datosGenerales(registro, {
    ciudad: etiquetadora(ciudades), area: etiquetadora(areas), cuadrilla: etiquetadora(cuadrillas), linea_negocio: etiquetadora(lineas),
  }) : []), [registro, ciudades, areas, cuadrillas, lineas])
  const etiquetaArticulo = useMemo(() => { const etiquetar = etiquetadora([...prendas, ...tiposEpp]); return (v: string) => aOracion(etiquetar(v)) }, [prendas, tiposEpp])
  const etiquetaNorma = useMemo(() => etiquetadora(normas), [normas])

  const fuentes = [colaboradores, capacitaciones, accidentes, uniformes, epp]
  if (fuentes.some((f) => f.cargando) || cargandoReglas) return <Cargando />
  const fallo = fuentes.find((f) => f.error)?.error ?? errorReglas
  if (fallo) return <AvisoError>{fallo}</AvisoError>

  const volver = (
    <button type="button" onClick={() => router.back()} className="boton-secundario">
      <Icono nombre="volver" />
      Volver
    </button>
  )
  if (!ficha || !registro) {
    return (
      <section className="aparecer">
        <EncabezadoPagina rotulo="Colaborador" titulo="Colaborador no encontrado" acciones={volver} />
        <AvisoError>Este colaborador no existe o fue eliminado.</AvisoError>
      </section>
    )
  }

  const { colaborador } = ficha
  const activo = colaborador.activo !== false
  const nuevo = (def: ModuloDef) => (capturista && !def.soloLectura ? (
    <button type="button" className="boton-primario" onClick={() => setEdicion({ def, inicial: { colaborador_id: id } })}>
      <Icono nombre="mas" />
      Nuevo
    </button>
  ) : undefined)
  const editable = (def: ModuloDef) => (capturista && !def.soloLectura ? (r: Registro) => setEdicion({ def, registro: r }) : undefined)
  const propios = (registros: Registro[]) => registrosDelColaborador(registros, id)
  const capDef = MODULOS.capacitaciones
  const accDef = MODULOS.accidentes

  return (
    <section className="aparecer">
      <EncabezadoPagina rotulo="Colaborador" titulo={aTitulo(colaborador.nombre)}
        detalle={`${aOracion(etiquetadora(ciudades)(colaborador.ciudad))} · ${activo ? 'Activo' : 'De baja'}`}
        acciones={(
          <>
            {volver}
            {capturista && (
              <button type="button" className="boton-secundario" onClick={() => setEdicion({ def: MODULOS.colaboradores, registro })}>
                <Icono nombre="editar" />
                Editar datos
              </button>
            )}
          </>
        )} />

      <SeccionFicha id="generales" titulo="Datos generales">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {generales.map((d) => (
            <div key={d.etiqueta}>
              <dt className="text-xs text-texto-suave">{d.etiqueta}</dt>
              <dd className="text-sm">{d.valor}</dd>
            </div>
          ))}
        </dl>
      </SeccionFicha>

      <SeccionFicha id="pendientes" titulo="Pendientes">
        <PendientesFicha pendientes={ficha.pendientes} etiquetaNorma={etiquetaNorma} etiquetaArticulo={etiquetaArticulo} />
      </SeccionFicha>

      <SeccionFicha id="capacitaciones" titulo="Capacitaciones" cantidad={propios(capacitaciones.registros).length} acciones={nuevo(capDef)}>
        <TablaFicha def={capDef} registros={propios(capacitaciones.registros)} alSeleccionar={editable(capDef)} />
      </SeccionFicha>

      <div className="mt-8"><EntregasFicha cfg={CONFIGURACIONES.entregas_uniforme} registros={uniformes.registros} colaboradorId={id} titulo="Uniformes" /></div>
      <div className="mt-8"><EntregasFicha cfg={CONFIGURACIONES.entregas_epp} registros={epp.registros} colaboradorId={id} titulo="EPP" /></div>

      <SeccionFicha id="accidentes" titulo="Accidentes" cantidad={propios(accidentes.registros).length} acciones={nuevo(accDef)}>
        <TablaFicha def={accDef} registros={propios(accidentes.registros)} alSeleccionar={editable(accDef)} />
      </SeccionFicha>

      <div className="mt-8"><ArchivosDeColaborador colaboradorId={id} /></div>

      {edicion && <FormularioDialogo def={edicion.def} registro={edicion.registro} inicial={edicion.inicial} alCerrar={() => setEdicion(null)} />}
    </section>
  )
}
