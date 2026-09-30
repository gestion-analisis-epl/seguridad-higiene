import type { PuntoMes } from '@/application/dashboard'
import type { ConfigIndicadores } from '@/domain/indicadores'
import { miles, num } from './formato'
import { filasMensuales } from './mensual'
import { NIVELES } from './niveles'

const COLUMNAS = ['Población', 'HHT', 'Eventos laborales', 'Días', 'Trayecto (informativo)', 'IF', 'IS', 'ILI']

export function TablaMensual({ serie, cfg }: { serie: PuntoMes[]; cfg: ConfigIndicadores }) {
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Mes</th>
            {COLUMNAS.map((c) => <th key={c} scope="col" className="text-right">{c}</th>)}
            <th scope="col">Nivel</th>
          </tr>
        </thead>
        <tbody>
          {filasMensuales(serie, cfg).map((f) => (
            <tr key={f.periodo} data-nivel={f.nivel}>
              <td className="font-medium">{f.mes}</td>
              <td className="text-right">{miles(f.poblacion)}</td>
              <td className="text-right">{miles(f.hht)}</td>
              <td className="text-right">{f.eventos}</td>
              <td className="text-right">{f.dias}</td>
              <td className="text-right">{f.trayecto}</td>
              <td className="text-right">{num(f.indiceFrecuencia)}</td>
              <td className="text-right">{num(f.indiceSeveridad)}</td>
              <td className="text-right">{num(f.ili, 3)}</td>
              <td><span className="nivel-etiqueta">{NIVELES[f.nivel]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
