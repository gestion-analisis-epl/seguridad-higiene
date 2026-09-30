import type { Pendiente } from '@/application/dashboard'

export function TablaPendientes({ pendientes, etiqueta }: {
  pendientes: Pendiente[]; etiqueta: (valor: string) => string
}) {
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Colaborador</th><th scope="col">Ciudad</th><th scope="col">Capacitación</th>
            <th scope="col">Uniforme faltante</th><th scope="col">EPP faltante</th>
          </tr>
        </thead>
        <tbody>
          {pendientes.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-texto-suave">Sin pendientes.</td></tr>
          )}
          {pendientes.map((p) => (
            <tr key={p.colaborador.id}>
              <td className="whitespace-nowrap font-medium">{p.colaborador.nombre}</td>
              <td className="whitespace-nowrap">{etiqueta(p.colaborador.ciudad)}</td>
              <td className="whitespace-nowrap">
                <span className={p.capacitacionPendiente ? 'insignia-vencido' : 'insignia-vigente'}>
                  {p.capacitacionPendiente ? 'Pendiente' : 'Vigente'}
                </span>
              </td>
              <td className="min-w-[12rem]">{p.prendasFaltantes.join(', ') || '-'}</td>
              <td className="min-w-[12rem]">{p.eppFaltantes.join(', ') || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
