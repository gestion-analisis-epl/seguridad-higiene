# Entregas de uniforme y EPP desde Google Sheets

Fecha: 2026-10-12. Estado: diseño aprobado, pendiente de revisión de esta especificación.

## Objetivo

Las entregas de uniforme y EPP dejan de capturarse en la app. La única fuente es la pestaña `Uniformes` del mismo archivo de Sheets de los colaboradores, que un flujo externo (n8n) mantiene al día y puede modificar filas ya escritas. La app sincroniza esa pestaña hacia Firestore para que dashboards, tablas y filtros sigan funcionando.

## Principio: nada de valores fijos en el código

Todo lo que depende de la organización o de los datos vive en variables de entorno o en Firestore, editable desde la app:

| Valor | Dónde vive |
|---|---|
| Nombre de la pestaña de entregas | Variable `COLABORADORES_SHEET_TAB_UNIFORMES` |
| A qué módulo y catálogo corresponde cada artículo | Colección `articulos_hoja`, editable en `/admin/articulos-hoja` |
| Cantidad máxima razonable por fila | Campo de `configuracion`; sin valor no se valida el tope |
| Catálogos de prendas, EPP y equipo | Catálogos existentes, editables en `/admin/catalogos` |
| Prendas y EPP exigidos en los dashboards | `configuracion` existente |

El código solo conoce el contrato de columnas de la pestaña (por nombre de encabezado, igual que en colaboradores) y las reglas de negocio acordadas. La carga inicial del mapeo de artículos se entrega como un archivo de datos revisable que se carga desde la pantalla de administración, no como lógica de la app.

## Fuente

Pestaña `Uniformes`. Columnas leídas por nombre de encabezado, sin importar mayúsculas, acentos ni espacios: `id`, `Colaborador`, `Uniforme&Cantidad`, `$MontoMaterial`, `Talla`, `Cantidad`, `Observaciones`, `FechaRegistro`, `Fecha Entrega`. Empresa, Plaza, FechaIngreso y Puestos se ignoran: mandan los datos del colaborador. `id` es el `id` de las pestañas de colaboradores. `FechaRegistro` se pide sin formato para conservar la hora.

## Reglas de datos

- Una entrega está **entregada** solo si `Cantidad` > 0 y trae `Fecha Entrega`; en cualquier otro caso es no entregada.
- Cantidad no numérica o negativa: la fila no se importa y sale en el reporte. Si `configuracion` define un tope y la cantidad lo supera, igual.
- Se guardan monto, observaciones, talla, cantidad, fecha de entrega y fecha de registro, además del artículo original tal como viene.
- Texto limpio con las mismas funciones que ya usa la app (espacios, mayúsculas del título).

## Llave de cada fila

`id` + artículo normalizado + `FechaRegistro` + número de orden si se repite en el mismo lote. La llave genera el identificador del documento en Firestore, así que sincronizar dos veces no duplica. Vive en una sola función, para sustituirla cuando exista un identificador único por fila.

## Mapeo de artículos

Colección `articulos_hoja`: un documento por artículo normalizado con `articulo` (texto original), `destino` (`uniforme`, `epp` o `equipo`) y `valor` (entrada del catálogo correspondiente: `prendas`, `tipos_epp` o `tipos_equipo`). Las variantes se mapean a una misma entrada (por ejemplo, las distintas botas a `botas`). Los artículos sin mapeo no se importan: aparecen en el reporte de la sincronización y se asignan en `/admin/articulos-hoja`, donde también se puede crear la entrada de catálogo que falte.

## Modelo de datos

- `entregas_uniforme`: agrega `entregado`, `monto`, `observaciones`, `articulo`, `fecha_registro`, `llave` y `origen: 'hoja'`. `fecha` queda opcional (vacía si no se entregó).
- `entregas_epp`: agrega `cantidad`, `talla`, `monto`, `observaciones`, `articulo`, `fecha_registro`, `llave` y `origen: 'hoja'`.
- Los dashboards hoy cuentan una prenda como entregada si existe cualquier registro; deben contar solo los `entregado`.
- `destino: equipo` crea un registro en `oficinas_equipo`: ciudad del colaborador, tipo del catálogo, detalle con artículo, cantidad y colaborador. Este punto queda abierto (ver abajo).

## Colaboradores

El `id` se resuelve con `indice_id_interno`. Si la persona no existe en la app, el servidor la crea desde la fila de colaboradores. Para ello `asegurarColaborador` acepta crear colaboradores **inactivos** (`activo: false`) cuando la fila de la hoja está inactiva; hoy los rechaza. Si el `id` no existe en ninguna pestaña de colaboradores, la fila no se importa y sale en el reporte.

## Sincronización

Módulo de servidor, mismo patrón que los colaboradores:

1. Lee las pestañas de colaboradores y `Uniformes`.
2. Valida cada fila, resuelve colaborador y mapeo, calcula la llave.
3. En modo simulación solo devuelve el reporte: filas nuevas, actualizadas, sin cambios, no importadas con su motivo, artículos sin mapeo y colaboradores a crear.
4. En modo real escribe por lotes con upsert por llave. No borra nada de lo ya importado.

Pantalla `/admin/entregas-hoja` (rol administrar) con "Simular" y "Sincronizar". La ruta de la API exige el mismo acceso que las demás rutas de administración.

## Módulos y reglas

- `entregas_uniforme` y `entregas_epp` pasan a solo lectura en la app: sin "Nuevo", editar ni eliminar.
- Las reglas de Firestore impiden escribir esas colecciones desde el navegador; solo escribe el servidor.
- La página de Entregas manual y su enlace del menú se retiran.
- `articulos_hoja` la edita un administrador desde `/admin/articulos-hoja`; las reglas lo permiten solo a admin.

## Limpieza inicial

Una sola vez, antes de la primera sincronización real: se exportan a un JSON las 24 entregas de uniforme y 9 de EPP actuales (ninguna tiene archivos adjuntos) y, con confirmación explícita del usuario en ese momento, se eliminan.

## Pruebas

- Funciones puras: normalización, llave, reglas de entregado, mapeo y validaciones.
- Sincronización con almacén en memoria: idempotencia, actualización de una fila existente, filas rechazadas, colaboradores nuevos e inactivos, artículos sin mapeo.
- Reglas de Firestore: el cliente no puede escribir entregas ni `articulos_hoja`.
- Dashboards: una prenda no entregada no cuenta como cumplida.

## Fuera de alcance

- Automatizar el disparo desde n8n (endpoint protegido con secreto o programación).
- Un identificador único por fila en el origen; por ahora rige la llave derivada.

## Puntos abiertos

1. `oficinas_equipo` modela equipo por ciudad con vencimiento, no entregas a una persona. Extintor y candado (unas 15 filas) caben, pero `tipos_equipo` no incluye candado y no hay vencimiento. Decidir al implementar si se agrega ese tipo o si se omiten del primer corte.
2. `FechaRegistro` debe traer la hora en la hoja; si el flujo la reescribe sin hora, la llave se degrada a fecha y número de orden.
