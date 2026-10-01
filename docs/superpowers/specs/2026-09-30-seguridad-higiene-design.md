# Seguridad e Higiene: diseño

Fecha: 2026-09-30

## Objetivo

Aplicación web para capturar y consultar la información de Seguridad e Higiene de todas las ciudades (hoy en un Excel de varias hojas) y mostrarla en un dashboard con dos vistas: estado operativo actual y tendencias históricas de accidentabilidad.

La app es la fuente de verdad. El Excel se usa una sola vez para la carga inicial.

## Alcance

Incluye:
- Inicio de sesión con Google y tres roles.
- Captura de colaboradores, capacitaciones, entregas de uniforme y EPP, accidentes, equipo de oficinas, vehículos y población mensual.
- Dashboard operativo y dashboard analítico.
- Script de migración única desde el Excel.

No incluye (primera versión):
- Importación mensual de Excel.
- Exportar a Excel o PDF.
- Cloud Functions ni documentos resumen precalculados.
- Notificaciones por correo.

## Stack

- Next.js 14 (App Router), React 18, TypeScript.
- pnpm como gestor de paquetes.
- Firebase Auth (Google) y Firestore, en un proyecto compartido de la organización (`<PROYECTO>`), base de datos con nombre propia (`<BASE>`).
- Gráficas con SVG y CSS propios. Recharts queda fuera por un defecto de renderizado verificado en Next 16 con React 19; no se ha comprobado en Next 14.
- Clean Architecture: `domain` (entidades y cálculo de indicadores, sin dependencias de Firebase), `application` (casos de uso), `infrastructure` (repositorios de Firestore), `app` y `components` (presentación).
- Diseño del frontend con el skill `frontend-design`. Sin emojis en código ni UI, solo SVG o fuentes de iconos. La interfaz debe ser responsive en cada cambio.
- Comentarios de una línea como máximo.

## Configuración

- Ningún valor de la organización vive en el código: proyecto, id de la base y dominio de correo son valores de entorno.
- La app exige `NEXT_PUBLIC_FIRESTORE_DATABASE` (nunca `(default)`) y `NEXT_PUBLIC_DOMINIO_PERMITIDO`; si faltan o son inválidas no arranca, para no caer nunca en la base por defecto que usan otras apps.
- `domain` recibe el dominio como parámetro; solo `infrastructure` lee el entorno.
- Firebase no lee variables en `firebase.json` ni en las reglas: se versionan las plantillas `firebase.template.json` y `firestore.rules.template`, y `pnpm config:firebase` genera `firebase.json` y `firestore.seguridad-higiene.rules` a partir de las mismas variables de entorno de la app. Los archivos generados y `.firebaserc` son locales (git-ignorados; `.firebaserc.example` de muestra).
- El repositorio es publicable: `pnpm verificar:publicable` y `pnpm verificar:historial` buscan secretos y los valores de la lista local `.valores-sensibles.local`.

## Acceso y roles

- Inicio de sesión con Google, restringido al dominio de la organización (configurado, ver Configuración).
- El acceso exige una cuenta de Google verificada de ese dominio; nadie fuera de la organización lee datos.
- Al primer inicio de sesión la app crea `usuarios/{uid}` con `rol: 'consulta'` y `activo: true`. Las reglas solo permiten esa alta a la propia cuenta y con exactamente esos valores.
- Consecuencia: toda cuenta de la organización lee todos los datos, incluidos los accidentes que nombran personas.
- Un admin promueve a `capturista` o `admin` y puede desactivar una cuenta (`activo: false`) desde la app.
- `sin_rol` queda solo como valor heredado o de revocación y no concede nada.
- Revocar acceso = `activo: false` o `rol: 'sin_rol'`, las reglas prohíben borrar `usuarios/{uid}` (solo la consola de Firestore, que las ignora, podría, y la app lo volvería a registrar como `consulta` activo al instante).
- Roles:
  - `admin`: todo, incluida la gestión de usuarios, catálogos y configuración.
  - `capturista`: lee y escribe datos operativos. No toca `usuarios`, `catalogos` ni `configuracion`.
  - `consulta`: solo lectura.
- El primer admin se crea a mano en la consola. Después el admin asigna roles desde una pantalla de la app.
- Las reglas leen el rol con `get()` sobre `usuarios/{uid}`.
- Los colaboradores no se borran: se marcan `activo: false`. Los demás registros operativos solo los borra un admin; `usuarios` y `colaboradores` quedan excluidos (se desactivan, no se borran).

## Extensión prevista: documentos de accidentes

Fuera de alcance por ahora; no hay código.

- Bucket de Firebase Storage para los documentos adjuntos a un accidente.
- Ruta del objeto: `accidentes/{accidenteId}/{archivo}`.
- Metadatos en el documento del accidente: `documentos: [{ruta, nombre, tipo, tamano, subido_por, subido_en}]`.
- Reglas de Storage en su propio archivo de este repositorio, con los mismos roles que Firestore: lectura para cualquier titular de rol activo del dominio, escritura y borrado para `capturista` y `admin`.
- Límites de tamaño y de tipo de contenido, y la misma condición de dominio y `email_verified`.
- Usar un bucket dedicado, no el bucket por defecto del proyecto, que comparten otras apps.
- Al construirlo, verificar si las reglas de Storage pueden leer la base con nombre de esta app para reflejar los roles; si no, usar custom claims.

## Firestore

Base de datos con nombre propia. Las reglas se generan de `firestore.rules.template` en `firestore.seguridad-higiene.rules`, y el `firebase.json` generado las asocia con su `database`. Ese `firebase.json` no declara la base por defecto, para no pisar las reglas de otras apps de la organización.

### Convenciones

- Fechas de calendario (ingreso, entrega, vencimiento, accidente): `Timestamp` a las 12:00 UTC. Se muestran con `timeZone: 'UTC'`.
- Fecha ausente: `null`, nunca texto. El estado va en un campo aparte.
- `periodo`: string `YYYY-MM`, presente en registros de eventos.
- Ciudad, línea de negocio y demás valores de catálogo se guardan como slug (`ciudad-a`, `linea-x`). El nombre para mostrar vive en `catalogos`.
- Todos los documentos llevan `creado_en`, `creado_por`, `actualizado_en`, `actualizado_por`.
- Porcentajes de cumplimiento e índices no se guardan; se calculan al leer.
- IDs automáticos de Firestore, salvo `indicadores_mensuales`.

### Colecciones

| Colección | Campos principales |
|---|---|
| `usuarios/{uid}` | `email`, `rol`, `activo` |
| `catalogos/{tipo}` | Listas de ciudades, líneas de negocio, cuadrillas, áreas, normas, tipos de EPP y prendas. Las de la empresa no se siembran en código: vienen de la migración o de `/admin/catalogos` |
| `configuracion/indicadores` | `horas_por_persona_mes` (240), `k_mensual` (20000), `k_anual` (240000), umbrales de ILI |
| `colaboradores` | `nombre`, `ciudad`, `area` (opcional), `linea_negocio`, `cuadrilla`, `fecha_ingreso`, `activo` |
| `capacitaciones` | `colaborador_id`, `ciudad`, `norma`, `cumple`, `fecha`, `vencimiento`, `estado` |
| `entregas_uniforme` | `colaborador_id`, `ciudad`, `prenda`, `talla`, `cantidad`, `fecha`, `periodo` |
| `entregas_epp` | `colaborador_id`, `ciudad`, `tipo`, `entregado`, `fecha`, `vencimiento` |
| `accidentes` | `colaborador_id`, `ciudad`, `fecha`, `periodo`, `tipo` (`trayecto` o `laboral`), `dias_incapacidad` |
| `oficinas_equipo` | `ciudad`, `tipo` (`extintor`, `botiquin`, `senaletica`), `detalle`, `items` (botiquín), `fecha_recarga`, `vencimiento` |
| `vehiculos` | `ciudad`, `placa`, `extintor_vencimiento`, `botiquin_items`, `botiquin_caducidad` |
| `indicadores_mensuales/{ciudad}_{periodo}` | `ciudad`, `periodo`, `poblacion` |

Notas:
- `estado` de capacitación toma `pendiente`, `vigente` o `vencido`. Se calcula al guardar a partir de `fecha` y `vencimiento`.
- `items` y `botiquin_items` son listas de `{ nombre, cantidad, caducidad }`; con ítems, `vencimiento` y `botiquin_caducidad` se derivan de la caducidad más próxima y cada ítem alerta por separado; sin ítems rige la fecha única (registros antiguos).
- `detalle` en `oficinas_equipo` es texto libre (por ejemplo `CO2 6.8 kg` o el contenido del botiquín).
- Una ciudad con áreas se guarda como una sola ciudad y el área va en `area`.
- `indicadores_mensuales` usa ID fijo `{ciudad}_{periodo}` (por ejemplo `ciudad-a_2026-08`) para garantizar un solo registro por ciudad y mes.
- Captura de entregas: se conserva un documento por entrega de un artículo (historial completo), pero el listado y la captura son por colaborador. `/datos/entregas_uniforme` y `/datos/entregas_epp` muestran una fila por colaborador activo con la última entrega de cada artículo del catálogo. Un solo formulario captura todos los artículos en modo "Nueva entrega" (un documento nuevo por artículo marcado) o "Corregir" (actualiza la última entrega de cada artículo). El historial de la persona se ve en el mismo panel y solo el administrador elimina entradas. Los documentos tienen la misma forma y derivaciones que en el formulario genérico; la escritura es un lote atómico.

### Índices compuestos

- `ciudad` + `vencimiento` en `capacitaciones`, `entregas_epp` y `oficinas_equipo`.
- `ciudad` + `periodo` en `accidentes` y `entregas_uniforme`.

## Indicadores

Fórmulas del índice de lesión incapacitante, con constante de normalización configurable, por ciudad y consolidado:

- `HHT = poblacion x horas_por_persona_mes`. El anual es la suma de los meses.
- `eventos` = cantidad de accidentes laborales del periodo; los de trayecto se registran y se muestran, pero no entran al ILI.
- `dias` = suma de `dias_incapacidad` de esos accidentes laborales.
- `IF = eventos / HHT x K`
- `IS = dias / HHT x K`
- `ILI = IF x IS / 1000`
- `K` es `k_mensual` para un mes y `k_anual` para el acumulado anual.
- Si `HHT` es 0, el índice se muestra como guion.
- Semáforo del ILI: `<= 0.4` supera, `<= 0.7` meta, `<= 1` mínimo, `> 1` fuera de meta. El valor `0.2` se dibuja como línea de referencia de interpretación. Todos los umbrales son editables en `configuracion/indicadores`.
- El consolidado nacional suma HHT, eventos y días de todas las ciudades antes de calcular.

## Dashboard

Vista operativa (estado actual):
- Tarjetas por ciudad: colaboradores activos, % de capacitación vigente, % de uniforme completo, % de EPP completo.
- Alertas de vencimientos en los próximos 30 días: capacitaciones, EPP, extintores, botiquines y vehículos.
- Tabla de colaboradores con pendientes, filtrable por ciudad, área y cuadrilla.

Vista analítica (tendencias):
- Accidentes por mes, separados en trayecto (informativo) y laboral, con comparativo entre ciudades.
- HHT, eventos laborales y días por mes, con IF, IS e ILI calculados y semáforo.
- Filtros por periodo, ciudad y línea de negocio.

## Importación inicial

Script de Python en `scripts/migracion/`, con `openpyxl` y `firebase-admin`.

- Lee cada hoja por el texto de sus encabezados, no por posición: el encabezado empieza en filas distintas, las columnas están desplazadas, algunas hojas usan un formato reducido (no se migran) y hay sinónimos (`Norma` o `Curso`, `Vencimiento` o `Vigencia`).
- Ignora filas vacías y filas de encabezado repetidas.
- Proyecto y base vienen de `--proyecto`/`--base` o de `MIGRACION_PROYECTO`/`MIGRACION_BASE`, solo exigidos con `--simular` y `--commit`. Un archivo JSON opcional (`--config` o `MIGRACION_CONFIG`) define `separador_area` (divide ciudad y área en la celda de ciudad) y `excluir_hojas`; sin valores de la empresa en el código.
- Normaliza ciudades, líneas de negocio, cuadrillas y áreas a slugs; la etiqueta de catálogo es el texto original del Excel, y convierte las fechas a la convención de arriba. Los valores como `Pendiente` en columnas de fecha pasan a `null` y al campo `estado`.
- Tres pasos: prueba por defecto (sin red, reporte por hoja con filas leídas, descartadas y con problemas), `--simular` (lee Firestore sin escribir y cuenta lo que se crearía y omitiría) y `--commit` (crea solo lo que falta; `--simular` y `--commit` son excluyentes).
- Antes de cargar se compara `nuevos` contra `ya_existian` de la simulación con las personas capturadas a mano: un `nuevos` alto indica nombres escritos distinto, que se corrigen en la app antes de cargar. Todas las altas usan `create` (falla si el documento apareció después de la lectura) y no se captura en la app durante la carga.
- Solo crea, nunca actualiza ni borra, así que es segura sobre datos ya capturados a mano, idempotente y reanudable (una carga interrumpida se vuelve a correr). Lee una vez las seis colecciones y un módulo puro de planificación decide qué crear.
- Claves de coincidencia (normalizadas, fechas de calendario, fecha vacía cuenta como valor): colaborador por nombre y ciudad (si hay varios iguales, en Firestore o en el Excel, se omite la persona y sus registros y se cuenta como ambigua; si existe uno, sus registros nuevos se le asocian); capacitación por colaborador, norma y fecha; uniforme por colaborador, prenda y fecha; EPP por colaborador, tipo y fecha; accidente por colaborador, fecha y tipo; población por `{ciudad}_{periodo}`. Lo que ya existe se omite y se cuenta, y los días de un accidente ya existente no se aplican.
- Las credenciales las aporta el usuario (gcloud/ADC o `GOOGLE_APPLICATION_CREDENTIALS`). El script y quien lo desarrolla no leen ni editan archivos de credenciales.
- Las columnas SI/NO de cumplimiento y EPP traen los dos textos como etiqueta fija en todas las filas, así que no informan nada. Una capacitación cumple si tiene fecha; una entrega de EPP existe si tiene fecha. Sin fecha no se crea registro.
- El Excel de colaboradores no trae días de incapacidad por accidente ni población histórica. Los accidentes migrados llevan `dias_incapacidad: 0` y la población se captura en la app salvo que se use el Excel de índices.
- Excel de índices opcional (`--indices`, `--indices-anio` obligatorio porque no trae el año; o `MIGRACION_INDICES`, `MIGRACION_INDICES_ANIO`): detecta cada hoja por el texto (`Indicador` + meses, filas `Población`, `Eventos`, `Días`), deduce la ciudad del título contra el catálogo de la migración (si no es única, omite la hoja) y escribe `indicadores_mensuales/{ciudad}_{periodo}` solo con población mayor que 0. Los días se asignan al accidente migrado solo si ese mes y ciudad tienen exactamente un accidente laboral (los de trayecto nunca reciben días); los demás casos quedan en 0 y el reporte los cuenta, sin nombres. HHT, IF, IS e ILI los calcula la app.
- El Excel es una foto de agosto, sin historial mensual de accidentes por persona. Ese historial empieza con la captura en la app.

## Respaldos

Exportación programada de Firestore para la base de esta app, porque la app es la única fuente de los datos.

## Pruebas

- Pruebas unitarias del cálculo de HHT, IF, IS e ILI en `domain`, incluidos HHT igual a 0, consolidado y acumulado anual. Se validan con una serie ficticia cuyos valores esperados se calculan a mano con las fórmulas.
- Pruebas de las reglas de Firestore con el emulador, para cada rol y para un usuario sin documento en `usuarios`.
- Ejecución en modo prueba del script de migración contra el Excel real, con revisión del reporte, y `--simular` antes de cargar.
