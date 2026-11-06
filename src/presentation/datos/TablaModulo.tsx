'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { CampoDef, ModuloDef } from '@/domain/modulos'
import type { Registro } from '@/infrastructure/firestore/repositorio'
import { rutaColaborador } from '@/presentation/navegacion/enlaces'
import { DataTable, type ColumnaTabla } from '@/presentation/ui/tabla'
import { mapaActivos } from '@/application/estado-colaborador'
import { ciudadDeRegistro, claveTablaModulo, columnasDeModulo, filtrosInicialesDeModulo, muestraCiudad, tieneColaborador } from './columnas-modulo'
import { ordenarRegistros } from './orden'
import { useColeccion } from './useColeccion'
import { useOpcionesDeCampos } from './useOpcionesDeCampos'

const idRegistro = (r: Registro) => r.id
const SIN_CAMPOS: CampoDef[] = []
const CAMPOS_CIUDAD: CampoDef[] = [{ nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'seleccion', origen: { tipo: 'catalogo', id: 'ciudades' } }]

export function TablaModulo({ def, registros, alSeleccionar, textoAccionFila }: {
  def: ModuloDef
  registros: Registro[]
  alSeleccionar?: (r: Registro) => void
  textoAccionFila?: string
}) {
  const campos = useMemo(() => def.columnas.map((n) => def.campos.find((c) => c.nombre === n)!), [def])
  const opciones = useOpcionesDeCampos(campos)
  const conColaborador = tieneColaborador(def)
  const { registros: colaboradores } = useColeccion(conColaborador ? 'colaboradores' : null)
  const activos = useMemo(() => (conColaborador ? mapaActivos(colaboradores) : undefined), [conColaborador, colaboradores])
  const verCiudad = muestraCiudad(def)
  const opcionesCiudad = useOpcionesDeCampos(verCiudad ? CAMPOS_CIUDAD : SIN_CAMPOS)
  const ciudadDe = useMemo(() => {
    if (!verCiudad) return undefined
    const porColaborador = new Map<string, string>()
    for (const c of colaboradores) if (typeof c.ciudad === 'string') porColaborador.set(c.id, c.ciudad)
    return ciudadDeRegistro(opcionesCiudad.ciudad ?? [], porColaborador)
  }, [verCiudad, colaboradores, opcionesCiudad])
  const columnasBase = useMemo(() => columnasDeModulo(def, opciones, activos, ciudadDe), [def, opciones, activos, ciudadDe])
  // La primera columna ya es el botón de editar: el enlace a la ficha va en una columna aparte
  const columnas = useMemo(() => {
    const i = columnasBase.findIndex((c) => c.id === 'colaborador_id')
    if (i < 0 || def.id === 'colaboradores') return columnasBase
    const ficha: ColumnaTabla<Registro> = {
      id: 'ficha', encabezado: 'Ficha', tipo: 'texto', anchoInicial: 90, sinTruncar: true, ordenable: false, filtrable: false,
      valor: () => '',
      celda: (r) => (typeof r.colaborador_id === 'string' ? (
        <Link href={rutaColaborador(r.colaborador_id)} className="boton-secundario min-h-[2rem] px-2 text-xs"
          aria-label={`Ver ficha de ${String(columnasBase[i].valor(r) ?? '')}`}>Ver</Link>
      ) : null),
    }
    return [...columnasBase.slice(0, i + 1), ficha, ...columnasBase.slice(i + 1)]
  }, [columnasBase, def.id])
  const iniciales = useMemo(() => filtrosInicialesDeModulo(def), [def])
  const filas = useMemo(() => ordenarRegistros(def, registros, opciones), [def, registros, opciones])
  return (
    <DataTable columnas={columnas} filas={filas} idFila={idRegistro} alSeleccionarFila={alSeleccionar} textoAccionFila={textoAccionFila}
      vacio="Sin registros" etiqueta={def.titulo} claveAnchos={claveTablaModulo(def.id)} filtrosIniciales={iniciales} />
  )
}
