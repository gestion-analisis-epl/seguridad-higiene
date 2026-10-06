'use client'

import { useMemo, useRef, useState } from 'react'
import { mensajeDescarga } from '@/application/adjuntos-descarga-cliente'
import { rutaAdjunto, type Adjunto, type ModuloAdjunto } from '@/domain/adjuntos'
import { formatearFecha } from '@/domain/fechas'
import type { CampoDef } from '@/domain/modulos'
import { MODULOS } from '@/domain/modulos-definiciones'
import { descargarArchivo } from '@/infrastructure/storage/almacenamiento'
import { useColeccion } from '@/presentation/datos/useColeccion'
import { useOpcionesDeCampos } from '@/presentation/datos/useOpcionesDeCampos'
import { AvisoError } from '@/presentation/ui/Estado'
import { ListaAdjuntos } from './ListaAdjuntos'
import { VisorPdf } from './VisorPdf'

const CATEGORIAS: { modulo: ModuloAdjunto; titulo: string; campoTipo: string }[] = [
  { modulo: 'capacitaciones', titulo: 'Capacitaciones', campoTipo: 'norma' },
  { modulo: 'accidentes', titulo: 'Accidentes', campoTipo: 'tipo' },
]

const CAMPOS_TIPO: CampoDef[] = CATEGORIAS.map((c) => MODULOS[c.modulo].campos.find((x) => x.nombre === c.campoTipo)!)

// Archivos del colaborador por categoría, tomados de los registros que ya existen.
export function ArchivosDeColaborador({ colaboradorId }: { colaboradorId: string }) {
  const { registros: todos, cargando, error } = useColeccion('adjuntos')
  const { registros: capacitaciones } = useColeccion('capacitaciones')
  const { registros: accidentes } = useColeccion('accidentes')
  const opciones = useOpcionesDeCampos(CAMPOS_TIPO)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [viendo, setViendo] = useState<Adjunto | null>(null)
  const disparador = useRef<HTMLElement | null>(null)

  const grupos = useMemo(() => {
    const propios = (todos as unknown as Adjunto[]).filter((a) => a.colaborador_id === colaboradorId)
    const registros = { capacitaciones, accidentes }
    return CATEGORIAS.map(({ modulo, titulo, campoTipo }) => {
      const etiquetas = new Map((opciones[campoTipo] ?? []).map((o) => [o.valor, o.etiqueta]))
      const porRegistro = new Map<string, Adjunto[]>()
      for (const a of propios.filter((x) => x.modulo === modulo)) {
        porRegistro.set(a.registro_id, [...(porRegistro.get(a.registro_id) ?? []), a])
      }
      const filas = Array.from(porRegistro).map(([id, adjuntos]) => {
        const r = registros[modulo].find((x) => x.id === id)
        const tipo = typeof r?.[campoTipo] === 'string' ? etiquetas.get(r[campoTipo] as string) ?? (r[campoTipo] as string) : 'Registro'
        const fecha = r?.fecha instanceof Date ? formatearFecha(r.fecha) : ''
        return { id, rotulo: fecha ? `${tipo} · ${fecha}` : tipo, orden: r?.fecha instanceof Date ? r.fecha.getTime() : 0, adjuntos }
      }).sort((a, b) => b.orden - a.orden)
      return { modulo, titulo, filas, total: filas.reduce((n, f) => n + f.adjuntos.length, 0) }
    })
  }, [todos, capacitaciones, accidentes, opciones, colaboradorId])

  async function descargar(a: Adjunto) {
    setOcupado(a.id)
    setFallo(null)
    try {
      await descargarArchivo(rutaAdjunto(a))
    } catch (e) {
      setFallo(mensajeDescarga(e))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section aria-label="Archivos del colaborador" className="space-y-4">
      <h3 className="rotulo">Archivos adjuntos</h3>
      {error && <AvisoError>{error}</AvisoError>}
      {fallo && <AvisoError>{fallo}</AvisoError>}
      {cargando ? <p className="text-sm text-texto-suave">Cargando archivos...</p> : grupos.map((g) => (
        <div key={g.modulo} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-texto">{g.titulo}</h4>
            <span className="font-mono text-xs text-texto-suave">{g.total}</span>
          </div>
          {g.filas.length === 0 ? <p className="text-sm text-texto-suave">Sin archivos adjuntos.</p> : g.filas.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <p className="text-xs font-medium text-texto-suave">{f.rotulo}</p>
              <ListaAdjuntos adjuntos={f.adjuntos} soloLectura ocupado={ocupado}
                alVer={(a, el) => { disparador.current = el; setViendo(a) }}
                alDescargar={(a) => void descargar(a)} alBorrar={() => undefined} />
            </div>
          ))}
        </div>
      ))}
      {viendo && <VisorPdf adjunto={viendo} retorno={disparador} alCerrar={() => setViendo(null)} alDescargar={() => void descargar(viendo)} />}
    </section>
  )
}
