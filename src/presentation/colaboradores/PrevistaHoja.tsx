import type { ColaboradorHoja } from '@/domain/colaboradores-hoja'
import { deTextoIso, formatearFecha } from '@/domain/fechas'
import { aTitulo } from '@/domain/texto'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <span className="etiqueta">{etiqueta}</span>
      <div className="control flex items-center bg-superficie-2 text-texto-suave">{valor || '-'}</div>
    </div>
  )
}

export function PrevistaHoja({ fila, conNombre = false }: { fila: ColaboradorHoja | null; conNombre?: boolean }) {
  return (
    <>
      {conNombre && <Dato etiqueta="Nombre" valor={fila ? aTitulo(fila.nombre) : ''} />}
      <Dato etiqueta="Ciudad" valor={fila ? aTitulo(fila.plaza) : ''} />
      <Dato etiqueta="Área" valor={fila ? aTitulo(fila.departamento) : ''} />
      <Dato etiqueta="Línea de negocio" valor={fila ? aTitulo(fila.empresa) : ''} />
      <Dato etiqueta="Puesto" valor={fila ? aTitulo(fila.puesto) : ''} />
      <Dato etiqueta="Fecha de ingreso" valor={fila?.fecha_ingreso ? formatearFecha(deTextoIso(fila.fecha_ingreso)) : ''} />
      <Dato etiqueta="No. de colaborador" valor={fila?.numero ?? ''} />
    </>
  )
}
