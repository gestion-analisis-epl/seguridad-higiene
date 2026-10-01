import {
  CONCURRENCIA, nombreSeguro, nuevoArchivoId, rutaAdjunto, validarArchivo, type Adjunto, type ModuloAdjunto,
} from '@/domain/adjuntos'

export interface PuertoAlmacenamiento {
  subir(ruta: string, archivo: File, alProgreso: (frac: number) => void, senal: AbortSignal): Promise<void>
  borrar(ruta: string): Promise<void>
}

export interface PuertoMetadatos {
  crear(a: Omit<Adjunto, 'id'>): Promise<string>
  borrar(id: string): Promise<void>
}

export type EstadoSubida = 'pendiente' | 'subiendo' | 'listo' | 'error' | 'cancelado'

export interface ItemSubida { clave: string; archivo: File; estado: EstadoSubida; progreso: number; motivo?: string }

export interface DestinoSubida { colaborador_id: string; modulo: ModuloAdjunto; registro_id: string }

interface Parametros {
  almacenamiento: PuertoAlmacenamiento
  metadatos: PuertoMetadatos
  destino: DestinoSubida
  existentes: () => number
  alCambiar: (items: ItemSubida[]) => void
}

const MENSAJE_FALLO = 'No se pudo subir el archivo'
const CUENTAN: EstadoSubida[] = ['pendiente', 'subiendo', 'listo']

const ignorar = () => {}

export function crearSubidor(p: Parametros) {
  const items: ItemSubida[] = []
  const controles = new Map<string, AbortController>()
  let contador = 0
  let activos = 0

  const emitir = () => p.alCambiar(items.map((i) => ({ ...i })))
  const buscar = (clave: string) => items.find((i) => i.clave === clave)
  const ocupados = () => p.existentes() + items.filter((i) => CUENTAN.includes(i.estado)).length

  function fijar(item: ItemSubida, cambios: Partial<ItemSubida>) {
    Object.assign(item, cambios)
    emitir()
  }

  // Valida y deja el item pendiente o en error con motivo.
  function admitir(item: ItemSubida) {
    const motivo = validarArchivo({ nombre: item.archivo.name, tipo: item.archivo.type, tamano: item.archivo.size }, ocupados())
    if (motivo) Object.assign(item, { estado: 'error', progreso: 0, motivo })
    else Object.assign(item, { estado: 'pendiente', progreso: 0, motivo: undefined })
  }

  async function ejecutar(item: ItemSubida) {
    const control = new AbortController()
    controles.set(item.clave, control)
    const archivo_id = nuevoArchivoId()
    const ruta = rutaAdjunto({ ...p.destino, archivo_id })
    const cancelado = () => item.estado === 'cancelado'
    let idCreado: string | null = null
    try {
      await p.almacenamiento.subir(ruta, item.archivo, (f) => { if (item.estado === 'subiendo') fijar(item, { progreso: f }) }, control.signal)
      if (cancelado()) throw new Error('cancelado')
      idCreado = await p.metadatos.crear({
        ...p.destino, archivo_id, nombre: nombreSeguro(item.archivo.name), tipo: item.archivo.type, tamano: item.archivo.size,
      })
      if (cancelado()) throw new Error('cancelado')
      fijar(item, { estado: 'listo', progreso: 1 })
    } catch {
      if (idCreado && cancelado()) await p.metadatos.borrar(idCreado).catch(ignorar)
      await p.almacenamiento.borrar(ruta).catch(ignorar)
      if (!cancelado()) fijar(item, { estado: 'error', motivo: MENSAJE_FALLO })
    } finally {
      controles.delete(item.clave)
      activos -= 1
      avanzar()
    }
  }

  function avanzar() {
    for (const item of items) {
      if (activos >= CONCURRENCIA) break
      if (item.estado !== 'pendiente') continue
      activos += 1
      Object.assign(item, { estado: 'subiendo' })
      void ejecutar(item)
    }
    emitir()
  }

  function cancelar(clave: string) {
    const item = buscar(clave)
    if (!item || (item.estado !== 'pendiente' && item.estado !== 'subiendo')) return
    controles.get(clave)?.abort()
    fijar(item, { estado: 'cancelado', motivo: undefined })
  }

  return {
    agregar(archivos: File[]) {
      for (const archivo of archivos) {
        const item: ItemSubida = { clave: `s${++contador}`, archivo, estado: 'pendiente', progreso: 0 }
        admitir(item)
        items.push(item)
      }
      avanzar()
    },
    reintentar(clave: string) {
      const item = buscar(clave)
      if (!item || item.estado !== 'error') return
      admitir(item)
      avanzar()
    },
    cancelar,
    cancelarTodo() {
      for (const item of items) cancelar(item.clave)
    },
  }
}
