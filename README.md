# Seguridad e Higiene

App web para capturar y consultar seguridad e higiene por ciudad. Diseño en `docs/superpowers/specs/` y plan en `docs/superpowers/plans/`.

## Requisitos

- Node 20.6 o superior (`pnpm config:firebase` usa `--env-file`).
- pnpm 11 (`pnpm-workspace.yaml` usa `allowBuilds`; `package.json` no fija `packageManager`).
- Java, solo para `pnpm test:rules`.
- Python 3, solo para la migración.

## Configuración

Ningún valor de la organización vive en el código. La app los toma de variables de entorno: copia `.env.example` a `.env.local` y completa todo, incluidas `NEXT_PUBLIC_FIRESTORE_DATABASE` (id de la base con nombre, nunca `(default)`) y `NEXT_PUBLIC_DOMINIO_PERMITIDO` (dominio de correo, sin `@`). Si falta alguna, la app no arranca y el error nombra la variable. Next.js incrusta las variables `NEXT_PUBLIC_*` al compilar, así que también deben definirse en el entorno de compilación y de hosting; sin ellas la app falla cerrada, también durante `next build`.

Firebase no lee variables de entorno en su configuración ni en sus reglas, así que se generan a partir de plantillas versionadas:

1. Define `NEXT_PUBLIC_FIRESTORE_DATABASE` y `NEXT_PUBLIC_DOMINIO_PERMITIDO` (en el shell o en `.env.local`).
2. Corre `pnpm config:firebase` (exige que `.env.local` exista, aunque sea vacío si las variables ya están en el shell; las variables ya definidas en el shell tienen prioridad sobre las de `.env.local`): escribe `firebase.json` (desde `firebase.template.json`) y `firestore.seguridad-higiene.rules` (desde `firestore.rules.template`, con el dominio como regex) sin imprimir los valores. Si falta o es inválida una variable, el error la nombra.
3. Copia `.firebaserc.example` a `.firebaserc` y pon el id del proyecto.

`firebase.json`, `firestore.seguridad-higiene.rules` y `.firebaserc` son archivos locales ignorados por git: nunca se versionan, y hay que regenerarlos al cambiar de máquina o de valores. Las pruebas de reglas no los usan: renderizan la plantilla con un dominio ficticio.

En los comandos, `<PROYECTO>`, `<BASE>` y `<REGION>` son el proyecto de Firebase, el id de la base y su región.

## Comandos

```bash
pnpm install
pnpm dev              # servidor local
pnpm test             # pruebas unitarias
pnpm test:rules       # pruebas de reglas (emulador de Firestore, requiere Java)
pnpm config:firebase  # genera firebase.json y las reglas desde las plantillas
pnpm verificar:publicable  # busca secretos y valores sensibles en lo versionado
pnpm typecheck && pnpm lint
```

Las pruebas de reglas se escribieron sin Java disponible y nunca se han ejecutado. Corre `pnpm test:rules` una vez en una máquina con Java antes de desplegar reglas.

## Rutas

- `/`: vista operativa. `/analitico`: vista analítica. Los índices IF, IS e ILI cuentan solo accidentes laborales; los de trayecto se registran como informativos.
- `/datos/<modulo>`: captura y consulta. Módulos: `colaboradores`, `capacitaciones`, `entregas_uniforme`, `entregas_epp`, `accidentes`, `oficinas_equipo`, `vehiculos`, `indicadores_mensuales`.
- Administración: `/admin/usuarios`, `/admin/catalogos`, `/admin/configuracion`.

## Captura de entregas

`/datos/entregas_uniforme` y `/datos/entregas_epp` se listan por colaborador: una fila por persona activa, con la última entrega de cada artículo del catálogo (`prendas` o `tipos_epp`) y, en EPP, el estado de vigencia en texto.

- Al abrir una persona se ve su historial (más reciente primero) y, para capturistas y administradores, un único formulario con todos los artículos.
- **Nueva entrega**: una fecha compartida y solo se captura lo que se entrega; cada artículo capturado crea un documento nuevo y el historial se conserva. En uniforme se exigen talla y cantidad; en EPP se marca el artículo y el vencimiento es opcional.
- **Corregir**: precarga la última entrega de cada artículo con su propia fecha; solo se actualizan los documentos que cambiaron. Vaciar un artículo no lo borra.
- Solo el administrador elimina una entrada, desde el historial y con confirmación.
- Los colaboradores inactivos no aparecen en la tabla, así que sus entregas no se editan desde aquí.
- Cada entrega sigue siendo un documento de un artículo con los mismos campos de siempre; el tablero, las alertas y la migración no cambian.

## Arquitectura

- `src/domain`: entidades y reglas de negocio puras.
- `src/application`: cálculos de los tableros (resúmenes, pendientes, alertas, series e índices).
- `src/infrastructure`: adaptadores de Firebase (sesión, repositorio genérico, usuarios, catálogos).
- `src/presentation` y `src/app`: componentes React y rutas de Next.js; usan solo los adaptadores de `infrastructure`.

`domain` y `application` nunca importan Firebase ni React. Solo `src/infrastructure` importa el SDK de Firebase.

## Componentes de interfaz reutilizables

- Se importan desde `@/presentation/ui`: `DataTable`, `MultiSelect` y `usePersistente`.
- `DataTable` ordena, filtra por encabezado y redimensiona columnas; con `claveAnchos` guarda los anchos en el navegador.
- Las tablas de datos, entregas y usuarios son dinámicas (ordenar, filtrar por encabezado, redimensionar).
- Los anchos de columna se recuerdan por navegador, por tabla.
- `MultiSelect` es un desplegable con casillas; su selección es controlada y puede persistirse con `usePersistente`.
- `usePersistente` guarda en `localStorage` (clave `sh:v1:`), valida lo leído y no falla si el almacenamiento no está disponible.

## Puesta en marcha en Firebase (acciones del administrador)

1. Crear la base con nombre, en la misma región que las otras bases de la organización:
   `firebase firestore:databases:create <BASE> --location=<REGION> --project <PROYECTO>`
2. Habilitar el proveedor Google en Authentication y agregar el dominio de la app a los dominios autorizados.
3. Desplegar reglas e índices solo de esta base:
   `firebase deploy --only firestore:<BASE> --project <PROYECTO>`
4. Primer admin: iniciar sesión una vez (la app crea `usuarios/{uid}` con `rol: "consulta"` y `activo: true`). En la consola de Firestore, base `<BASE>`, editar ese documento y poner `rol: "admin"` y `activo: true`.
   Toda cuenta del dominio permitido entra como `consulta` (lee todos los datos) y un admin la promueve en `/admin/usuarios`.
   Las reglas prohíben borrar `usuarios/{uid}` (solo la consola de Firestore, que las ignora, podría: la cuenta se volvería a registrar como `consulta` activa). Revoca con `activo: false` o `rol: "sin_rol"` (en la app: `/admin/usuarios`).
5. Entrar a `/admin/catalogos` y pulsar "Cargar valores iniciales": solo siembra los catálogos genéricos (prendas, EPP, tipos de accidente y de equipo). Ajustar `/admin/configuracion` si hace falta.
6. Ciudades, áreas, líneas de negocio, normas y cuadrillas empiezan vacías: correr la migración (toma las etiquetas del Excel) o agregarlas en `/admin/catalogos` ANTES de capturar colaboradores.

El hosting del frontend todavía no está configurado en este repositorio.

## Importación desde el Excel

```bash
cd scripts/migracion
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
# 1. prueba: sin red, solo lee el Excel
.venv/Scripts/python migrar.py --excel "<RUTA>/archivo.xlsx" --config migracion.config.json
# 2. simulación: lee Firestore sin escribir y cuenta lo que se crearía y lo que se omite
.venv/Scripts/python migrar.py --excel "<RUTA>/archivo.xlsx" --config migracion.config.json --simular --proyecto <PROYECTO> --base <BASE>
# 3. carga: crea solo lo que no existe
.venv/Scripts/python migrar.py --excel "<RUTA>/archivo.xlsx" --config migracion.config.json --commit --proyecto <PROYECTO> --base <BASE>
```

- Es seguro correrla sobre datos ya capturados a mano y volver a correrla: solo crea documentos, nunca modifica ni borra los existentes. Correrla dos veces seguidas no crea nada la segunda vez.
- El modo prueba no usa red y no necesita proyecto ni base. `--simular` y `--commit` (excluyentes) los exigen: por bandera o por las variables `MIGRACION_PROYECTO` y `MIGRACION_BASE`; si faltan se detiene antes de conectar.
- `--config` (o la variable `MIGRACION_CONFIG`) es opcional. Copia `migracion.config.example.json` a `migracion.config.json` (git-ignorado). Claves: `separador_area` (texto que separa ciudad y área en la celda de ciudad, `"-"` por defecto; `null` desactiva la división) y `excluir_hojas` (subcadenas del título de las hojas que no se leen, vacío por defecto).
- Las etiquetas de ciudades, áreas, líneas, normas y cuadrillas salen del texto original del Excel; la carga nunca reemplaza etiquetas ya existentes.

Lo que migra y lo que no:

- El Excel tiene formato completo en la mayoría de las hojas. Las hojas de formato reducido se reportan como "formato no reconocido" y no se migran: se capturan en la app. Las hojas que no son de colaboradores también aparecen así salvo que se omitan con `excluir_hojas`.
- Cada hoja trae dos bloques mensuales que se consolidan: gana el más reciente, las personas que solo están en el bloque anterior se migran con `activo: false` y los accidentes se unen.
- `dias_incapacidad` queda en 0 en los accidentes migrados: los capturistas deben llenar los días; si no, el ILI muestra el mejor nivel.
- Índices (opcional): `--indices <RUTA>.xlsx` (o `MIGRACION_INDICES`) con `--indices-anio <AÑO>` (o `MIGRACION_INDICES_ANIO`), obligatorio porque el Excel no trae el año. Importa la población mensual a `indicadores_mensuales` (solo meses con población mayor que 0). La ciudad de cada hoja sale del título: debe terminar en el slug de una ciudad del catálogo de la migración; si no, o si es ambigua, la hoja se omite ("ciudad no determinada"); `--indices-ciudad <SLUG>` la fuerza en un Excel de una sola hoja. Las hojas sin el formato esperado se omiten ("formato no reconocido").
- Los días de incapacidad de los índices se aplican solo si ese mes y ciudad tienen exactamente un accidente laboral migrado (los de trayecto nunca reciben días); con varios o ninguno quedan en 0 y el reporte los cuenta (`dias_ambiguos`, `dias_sin_accidente`, `eventos_distintos`): llenarlos en la app. HHT, IF, IS e ILI no se importan: los calcula la app.
- Sin `--indices`, la población no se migra: se captura en la app.
- Oficinas y vehículos tampoco se migran, igual que las hojas de formato reducido: se capturan en la app.

Qué se compara con lo que ya hay (claves normalizadas: sin acentos ni mayúsculas, fechas como fecha de calendario; una fecha vacía también cuenta como valor):

- Colaborador: nombre y ciudad. Si coincide exactamente uno, no se crea y sus registros nuevos se le asocian; si no coincide ninguno, se crea. Si coinciden varios, o el Excel trae dos filas con la misma clave, se omite la persona y sus registros y se cuenta como ambigua.
- Capacitación: colaborador, norma y fecha. Uniforme: colaborador, prenda y fecha. EPP: colaborador, tipo y fecha. Accidente: colaborador, fecha y tipo. Si la clave ya existe, se omite (`duplicados_omitidos`).
- Población mensual: documento `{ciudad}_{periodo}` (o el mismo ciudad y periodo); si existe, se omite.

Qué nunca se modifica: los documentos existentes, la población capturada a mano y los días de incapacidad de accidentes que ya existen (se cuentan en `dias_no_aplicados_por_existir`). Los catálogos solo reciben los valores que faltan, sin cambiar etiquetas.

Reporte y credenciales:

- Cada modo genera el reporte JSON `scripts/migracion/salida/reporte-migracion.json` (git-ignorado); la sección `importacion` solo trae conteos: `nuevos` y `duplicados_omitidos` por colección, colaboradores `nuevos`, `ya_existian` y `ambiguos`, indicadores `nuevos` y `existentes`. Los avisos por hoja no incluyen nombres de personas. La prueba sin red lo calcula contra una base vacía.
- `--simular` y `--commit` usan las credenciales propias de quien ejecuta (gcloud/ADC o una cuenta de servicio en `GOOGLE_APPLICATION_CREDENTIALS`); el código nunca lee archivos de credenciales.
- Antes de `--commit`, compara `nuevos` y `ya_existian` de colaboradores en la salida de `--simular` con las personas ya capturadas a mano: un `nuevos` alto indica nombres escritos distinto al Excel (otro orden, errata, palabra extra) y crearía personas duplicadas que la app no permite borrar. Corrige esos nombres en la app y vuelve a correr `--simular`.
- `duplicados_omitidos` cuenta también los repetidos dentro del propio Excel (la misma clave dos veces para una persona), no solo lo que ya está en Firestore. El reporte trae además `hijos_omitidos_por_ambiguedad` (registros de personas ambiguas que no se crearon).
- Los datos existentes se leen una sola vez al inicio: no captures en la app mientras corre `--commit`. Si algo se captura entre `--simular` y `--commit` y choca con un documento por crear, la carga se detiene sin sobrescribir (las altas son `create`) y pide volver a simular.
- Si la carga se interrumpe, basta volver a correrla: retoma lo que falta.
- Antes de la primera carga real, hacer una exportación manual de Firestore como respaldo.

## Respaldos (acción del administrador)

La app es la única fuente de datos. Programar respaldos diarios de la base:

```bash
gcloud firestore backups schedules create --database=<BASE> --recurrence=daily --retention=14w --project=<PROYECTO>
```

## Reglas de seguridad

Se versionan como `firestore.rules.template` y se generan en `firestore.seguridad-higiene.rules` con `pnpm config:firebase`. El `firebase.json` generado solo declara la base de esta app, así que un despliegue desde aquí no toca las reglas de otras apps de la organización que comparten el proyecto.

## Antes de publicar

El repositorio no debe contener secretos ni valores de la organización (proyecto, base, dominio, ciudades, rutas locales, nombres de personas).

1. Crea `.valores-sensibles.local` (git-ignorado; forma en `.valores-sensibles.example`): una cadena prohibida por línea, sin distinguir mayúsculas ni acentos. Consérvala solo en tu máquina.
2. Corre `pnpm verificar:publicable` (árbol versionado) y `pnpm verificar:historial` (todos los commits). Informan `archivo:linea` o `commit:archivo` y la regla, nunca el valor; terminan con código 1 si hay hallazgos. Sin la lista local solo aplican los patrones genéricos (claves, tokens, llaves privadas, archivos `.env`).
3. Opcional: activa el bloqueo en cada push con `git config core.hooksPath .githooks` (escanea el árbol y solo los commits que se van a enviar, no todas las ramas locales). Para revisar rangos a mano: `node scripts/verificar-publicable.mjs --rango <rev-expr>` (repetible).
