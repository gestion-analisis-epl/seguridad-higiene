import type { FilaEntrega } from '@/application/entregas-agrupar'
import { estadoEpp } from '@/application/entregas-celdas'
import type { ConfigEntrega } from '@/application/entregas-config'
import type { RegistroEntrega } from '@/application/entregas-tipos'
import type { Opcion } from '@/domain/modulos'
import type { ColumnaTabla } from '@/presentation/ui/tabla/tipos'
import { etiquetaDe } from './etiquetas'

export function etiquetaEstadoEntrega(config: ConfigEntrega, registro: RegistroEntrega | undefined, hoy: Date): string {
  if (!registro) return 'Sin entrega'
  return config.conVencimiento ? estadoEpp(registro, hoy).texto : 'Con entrega'
}

export function columnasDeEntregas(
  config: ConfigEntrega, items: Opcion[], ciudades: Opcion[], hoy: Date,
): ColumnaTabla<FilaEntrega>[] {
  return [
    { id: 'colaborador', encabezado: 'Colaborador', tipo: 'texto', anchoInicial: 220, valor: (f) => f.colaborador.nombre },
    { id: 'ciudad', encabezado: 'Ciudad', tipo: 'categoria', valor: (f) => etiquetaDe(ciudades, f.colaborador.ciudad) },
    ...items.map((i): ColumnaTabla<FilaEntrega> => ({
      id: i.valor, encabezado: i.etiqueta, tipo: 'categoria',
      valor: (f) => etiquetaEstadoEntrega(config, f.ultimas[i.valor], hoy),
    })),
    { id: 'acciones', encabezado: 'Acciones', tipo: 'texto', anchoInicial: 190, anchoMinimo: 170, sinTruncar: true, ordenable: false, filtrable: false, valor: () => '' },
  ]
}
