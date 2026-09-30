import type { Alerta } from '@/application/dashboard'
import { formatearFecha } from '@/domain/fechas'
import { Icono } from '@/presentation/ui/Icono'

export function TablaAlertas({ alertas, etiqueta }: { alertas: Alerta[]; etiqueta: (valor: string) => string }) {
  if (alertas.length === 0) return <p className="aviso-info">Sin vencimientos próximos.</p>
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Estado</th><th scope="col">Origen</th><th scope="col">Referencia</th>
            <th scope="col">Ciudad</th><th scope="col">Vencimiento</th><th scope="col" className="text-right">Días</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a, i) => (
            <tr key={`${a.origen}-${a.referencia}-${i}`} data-estado={a.estado}>
              <td className="whitespace-nowrap">
                <span className={a.estado === 'vencido' ? 'insignia-vencido' : 'insignia-por-vencer'}>
                  <Icono nombre="alerta" className="h-3.5 w-3.5" />
                  {a.estado === 'vencido' ? 'Vencido' : 'Por vencer'}
                </span>
              </td>
              <td className="whitespace-nowrap capitalize">{a.origen.replace('_', ' ')}</td>
              <td className="whitespace-nowrap">{a.referencia}</td>
              <td className="whitespace-nowrap">{etiqueta(a.ciudad)}</td>
              <td className="whitespace-nowrap">{formatearFecha(a.vencimiento)}</td>
              <td className="text-right">{a.dias}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
