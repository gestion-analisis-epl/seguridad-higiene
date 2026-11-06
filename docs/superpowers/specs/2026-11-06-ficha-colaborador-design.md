# Ficha del colaborador y tablas navegables

## Objetivo

Que cada tabla donde aparece un colaborador lleve a una ficha única con todo lo suyo (datos, pendientes, capacitaciones, uniformes, EPP, accidentes y archivos), en lugar de tener capacitaciones, uniformes y EPP como pantallas separadas.

## Decisiones

- La ficha es una página propia: `/colaboradores/[id]`, donde `id` es el id del documento en `colaboradores`.
- Alcance del enlace: todas las tablas donde aparece un colaborador.
- Secciones: datos generales, pendientes, capacitaciones, uniformes, EPP, accidentes y archivos adjuntos. Equipo de oficinas queda fuera.
- Consulta con acceso a editar: los registros se capturan y editan desde la ficha con los formularios existentes.
- Enfoque: cálculo en el cliente con los hooks en tiempo real que ya usa el dashboard. No hay endpoints nuevos.

## Enlace

- `rutaColaborador(id)` en `src/presentation/navegacion/enlaces.ts` es el único lugar que construye la ruta.
- Dashboard operativo y analítico (tablas y diálogos de tarjetas): el clic en la fila navega con `alSeleccionarFila`, y el nombre es además un `<Link>` para abrirlo en otra pestaña. `textoAccionFila` indica la acción a lectores de pantalla.
- Pantallas de entregas: el clic en la fila lleva a la ficha. `PanelEntrega` y su apertura desaparecen porque la ficha los reemplaza.
- Tablas de los módulos de datos (capacitaciones, accidentes, etc.): el clic en la fila sigue abriendo el registro para editarlo; solo el nombre del colaborador es enlace.
- Lista de colaboradores (`/datos/colaboradores`) y buscador global: llevan a la ficha. El buscador hoy navega a `RUTA_COLABORADORES`.

## Contenido de la ficha

| Sección | Fuente | Reutiliza |
|---|---|---|
| Encabezado | `colaboradores/{id}` | Estado activo o baja, ciudad |
| Datos generales | `colaboradores/{id}` | Fecha de ingreso, puesto, empresa, plaza, zona, jefe, gerente, área, número, id interno, datos de baja |
| Pendientes | `evaluacionColaboradores` con un conjunto de datos de una sola persona | Reglas de dotación y normas obligatorias, las mismas del dashboard |
| Capacitaciones | `capacitaciones` por `colaborador_id` | Columnas del módulo |
| Uniformes y EPP | `entregas_uniforme` y `entregas_epp` por `colaborador_id` | `HistorialEntregas` |
| Accidentes | `accidentes` por `colaborador_id` | Columnas del módulo |
| Archivos | `adjuntos` | `ArchivosDeColaborador` (hoy sin uso) |

Los datos se obtienen con `useDatosOperativos` y `useColeccion`, filtrados por el id. Una función pura nueva, `datosDeColaborador(datos, id)`, arma el subconjunto y se prueba aparte.

Si el colaborador no existe, la página muestra un aviso con enlace de regreso. Si está inactivo, se ve igual con la marca de baja.

## Edición

- Cada sección tiene "Nuevo" y cada fila se puede editar, con `FormularioModulo` (`def`, `registro`, `alTerminar`) dentro de `Dialogo`. Para un registro nuevo, `colaborador_id` llega prellenado.
- Los botones solo se muestran si el rol puede capturar (`puede(usuario, ...)`). La lectura de la ficha requiere solo permiso de lectura.
- Los datos generales vienen de la hoja y la mayoría están bloqueados (`bloquearEnEdicion`); la sección ofrece editar solo lo editable del módulo `colaboradores`.

## Pruebas

- Unitarias: `datosDeColaborador`, `rutaColaborador`, la evaluación de un colaborador aislado y que las columnas de tablas incluyan el enlace.
- Lo visual se revisa manualmente con `npm run dev`.

## Fuera de alcance

- Equipo de oficinas en la ficha.
- Consultas por colaborador en el servidor.
- Reescribir los formularios de captura.
- Cambios a las reglas de dotación o a la sincronización de la hoja.

## Por verificar al planificar

- Que `FormularioModulo` acepte `colaborador_id` prellenado en un registro nuevo sin cambios; si no, se agrega un valor inicial opcional.
- Cómo se conserva el filtro de ciudades del dashboard al volver desde la ficha.
