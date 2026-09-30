import type { FilaComparativo } from '@/application/dashboard'
import { miles, num } from './formato'
import { NIVELES } from './niveles'

const COLUMNAS = ['HHT', 'Eventos laborales', 'IF', 'IS', 'ILI']

export function TablaComparativo({ filas, etiqueta }: { filas: FilaComparativo[]; etiqueta: (valor: string) => string }) {
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Ciudad</th>
            {COLUMNAS.map((c) => <th key={c} scope="col" className="text-right">{c}</th>)}
            <th scope="col">Nivel</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.ciudad} data-nivel={f.nivel}>
              <td className="font-medium">{etiqueta(f.ciudad)}</td>
              <td className="text-right">{miles(f.indices.hht)}</td>
              <td className="text-right">{f.indices.eventos}</td>
              <td className="text-right">{num(f.indices.indiceFrecuencia)}</td>
              <td className="text-right">{num(f.indices.indiceSeveridad)}</td>
              <td className="text-right">{num(f.indices.ili, 3)}</td>
              <td><span className="nivel-etiqueta">{NIVELES[f.nivel]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
