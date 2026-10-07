# Colaboradores desde Google Sheets: diseño

Fecha: 2026-10-07

## Problema

Los colaboradores se capturan a mano en el módulo `colaboradores`. La fuente de verdad es la hoja "Colaboradores Operativos SH" (pestaña `Colaboradores`, ~147 filas, columnas A:T). Capacitaciones, accidentes, EPP y uniforme apuntan al colaborador por `colaborador_id`, que es el UID de Firestore, y los adjuntos dependen de ese UID. Hay que usar la hoja como origen sin perder lo ya registrado.

## Decisiones

- El UID de Firestore sigue siendo la llave de todo. La columna `id` de la hoja se guarda como `id_interno`.
- La hoja se lee en vivo desde una ruta de servidor (Firebase App Hosting, cuenta de servicio por credenciales por defecto, sin llave JSON). La hoja se comparte como lectora con esa cuenta.
- Caché en tres niveles: servidor (10 min, sirve la última copia buena si Google falla), `sessionStorage` por sesión con una sola petición compartida, y botón "Actualizar lista" con tiempo mínimo entre pulsaciones.
- Elegir a un colaborador en el dropdown lo crea o recupera en Firestore, vía servidor y sin duplicados.
- Si Plaza, Departamento o Empresa no existen en los catálogos, el servidor crea la entrada con un identificador normalizado.
- Los colaboradores actuales se enlazan con una herramienta de administración. Nada se borra ni se reescribe en los registros existentes.

## Mapa de campos

| Campo de la app | Columna de la hoja |
|---|---|
| `id_interno` | `id` |
| `numero_colaborador` | `No.Colaborador` |
| `nombre` | `NombreCompleto` |
| `ciudad` (catálogo) | `Plaza` |
| `area` (catálogo) | `Departamento` |
| `linea_negocio` (catálogo) | `Empresa` |
| `puesto` | `Puesto` |
| `fecha_ingreso` | `FechaIngreso` (formato `2026-09-28 0:00:00`) |
| `zona`, `jefe`, `gerente` | `Zona`, `Jefe`, `Gerente` |
| `fecha_baja`, `motivo_baja` | `FechaBaja`, `MotivoBaja` |
| `cuadrilla` | no existe en la hoja; select opcional manual |

`CorreoEmpresa`, `TipoNomina`, `Empresa Alta`, `Función Área`, `ApellidoPaterno`, `ApellidoMaterno` y `Nombre` no se envían al cliente ni se guardan.

## Arquitectura

### Servidor (`src/app/api`, `firebase-admin`)

- Todas las rutas validan el ID token, exigen correo verificado del dominio permitido y leen el rol de `usuarios/{uid}`.
- `GET /api/colaboradores-hoja`: cualquier rol activo. Devuelve filas normalizadas con los campos del mapa. Parámetro `forzar=1` salta la caché del servidor, sujeto a un mínimo entre recargas.
- `POST /api/colaboradores/asegurar` `{ id_interno }`: administrador o capturista. Busca por `id_interno`, o crea el colaborador con datos de la hoja. Usa el documento índice `indice_id_interno/{id_interno} → uid` dentro de una transacción para evitar duplicados concurrentes. Crea entradas de catálogo faltantes. Si la fila tiene `FechaBaja`, rechaza la creación.
- `GET /api/colaboradores/enlace` y `POST /api/colaboradores/enlace`: solo administrador. Lista los colaboradores actuales con su estado y la sugerencia de coincidencia, y vincula (`{ uid, id_interno }`) o desvincula. Un `id_interno` solo puede estar ligado a un colaborador. Al vincular se completan los campos faltantes desde la hoja.

### Dominio puro (`src/domain/colaboradores-hoja`)

Lectura de filas, normalización de texto (sin acentos ni mayúsculas, espacios colapsados), fechas, identificadores de catálogo, búsqueda (todas las palabras sobre nombre, número y puesto), sugerencia de coincidencia por nombre normalizado y reglas de caché. Sin dependencias de red.

### Cliente

- Caché en `sessionStorage` con petición única compartida y botón de actualizar con tiempo mínimo.
- Hook `useColaboradoresHoja` y selector buscable (reutiliza `SelectBuscable`) que muestra nombre, número y puesto y oculta a quien tiene `FechaBaja`.
- Formulario de alta de colaborador: se elige a la persona y se llenan solos nombre, ciudad, área, línea de negocio, puesto y fecha de ingreso, en solo lectura. La cuadrilla es un select opcional.
- Capacitaciones, accidentes, EPP y uniforme usan el dropdown. Elegir a alguien llama a `asegurar` y usa el UID devuelto como `colaborador_id`. Cada registro copia nombre, plaza y puesto del momento.
- Página `/admin/colaboradores` (solo administrador): tabla con buscador y estado vinculado o sin vincular, sugerencias con confirmación individual y confirmación masiva de coincidencias exactas, vinculación manual con el mismo buscador y desvinculación.

## Datos y reglas

- `colaboradores` recibe: `id_interno`, `numero_colaborador`, `puesto`, `zona`, `plaza`, `empresa`, `jefe`, `gerente`, `fecha_baja`, `motivo_baja`. Los documentos actuales no cambian hasta enlazarse.
- Colección nueva `indice_id_interno`, sin acceso desde el cliente.
- Reglas de Firestore: el cliente ya no crea colaboradores; solo puede actualizar `cuadrilla` y `activo`. Los catálogos siguen escribiéndose solo por administrador desde el cliente; el servidor escribe con permisos de administración.
- La app guarda la configuración en variables de entorno: `COLABORADORES_SHEET_ID`, `COLABORADORES_SHEET_TAB`, en `apphosting.yaml` junto con las `NEXT_PUBLIC_*`. Requisitos del proyecto: plan Blaze, API de Google Sheets habilitada, hoja compartida como lectora con la cuenta de servicio de App Hosting. En local: `gcloud auth application-default login`.

## Errores y casos límite

- Si Google falla y hay copia en caché, se sirve marcada como desactualizada. Sin copia, el selector muestra el error con "Reintentar".
- Filas sin `id`, sin nombre o con `id` repetido se descartan y se reportan en el registro del servidor.
- Homónimos: la sugerencia de enlace marca como ambiguo todo nombre con más de una coincidencia, y no se confirma en bloque.
- Colaboradores en Firestore que no aparecen en la hoja quedan intactos y se listan como sin coincidencia.
- Un colaborador dado de baja en la hoja deja de ofrecerse en los dropdowns; su historial y adjuntos se conservan.

## Pruebas

- Vitest para el dominio puro, la caché y las rutas con la hoja y `firebase-admin` simulados (roles, concurrencia, catálogos nuevos).
- Pruebas de reglas con el emulador para `colaboradores` e `indice_id_interno`.
- Antes de vincular, una simulación en la herramienta muestra coincidencias, ambiguos y sin coincidencia sin escribir nada.

## Orden de entrega

1. Dominio puro de la hoja y búsqueda, con pruebas.
2. Ruta de lectura, caché, hook y dropdown buscable.
3. Ruta `asegurar`, catálogos automáticos y formulario de alta que se llena solo.
4. Herramienta de enlace en `/admin/colaboradores`.
5. Dropdown en capacitaciones, accidentes, EPP y uniforme con copia de nombre, plaza y puesto.
6. Reglas endurecidas, `apphosting.yaml`, variables y README.
