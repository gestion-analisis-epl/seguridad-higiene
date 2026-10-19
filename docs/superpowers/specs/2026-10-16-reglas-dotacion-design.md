# Reglas de dotación por empresa, puesto y ciudad

Fecha: 2026-10-16. Estado: diseño aprobado por secciones, pendiente de revisión de esta especificación.

## Objetivo

El uniforme y el EPP obligatorios dependen de la línea de negocio (empresa), el puesto y la ciudad del colaborador. Hoy el dashboard exige a todos el catálogo completo de prendas y tipos de EPP. Se reemplaza por reglas explícitas y se reinician los catálogos y entregas actuales para rehacerlos con esas reglas.

## Decisiones acordadas

- Matriz completa empresa × puesto × ciudad, con la ciudad opcional: una regla sin ciudad aplica a todas las plazas y la de ciudad específica la sustituye.
- La regla solo lista prendas y tipos de EPP obligatorios; sin cantidades ni vigencia.
- Un colaborador sin regla se marca "sin regla": no cuenta como cumplido ni como faltante.
- Las reglas viven en Firestore y se editan desde la app.
- Se borran los catálogos `prendas`, `tipos_epp` y `tipos_equipo`, el mapeo `articulos_hoja` y todas las entregas de uniforme y EPP; se rehacen desde las reglas y la hoja.

## Modelo de datos

Colección `reglas_dotacion`, un documento por combinación:

| Campo | Contenido |
|---|---|
| `linea_negocio` | valor del catálogo `lineas_negocio` |
| `puesto` | puesto normalizado (sin acentos, minúsculas, espacios limpios) |
| `puesto_etiqueta` | texto legible del puesto |
| `ciudad` | valor del catálogo `ciudades`, o vacío para todas las plazas |
| `prendas` | valores del catálogo `prendas` |
| `tipos_epp` | valores del catálogo `tipos_epp` |

- El identificador se deriva de empresa + puesto + ciudad (o `todas`), así que no hay dos reglas para la misma combinación y guardar de nuevo actualiza.
- Una regla con ambas listas vacías es válida: el puesto no requiere nada y cuenta como cumplido.
- Reglas de Firestore: lectura para quien ve el dashboard, escritura solo para administradores.

## Resolución de la regla

Función pura `resolverRegla(reglas, colaborador)` en el dominio:

1. empresa + puesto + ciudad del colaborador;
2. empresa + puesto con ciudad vacía;
3. ninguna: sin regla.

El puesto del colaborador se normaliza con la misma función que usan las reglas.

## Dashboard

- `Requisitos` (listas globales) se reemplaza por la lista de reglas; `evaluar` resuelve la regla de cada colaborador y compara contra sus artículos.
- Se elimina la caída a las constantes `PRENDAS` y `TIPOS_EPP`.
- `pctUniforme` y `pctEpp` se calculan sobre los colaboradores con regla; `pctCapacitacion` sigue sobre todos los activos. Sin ningún colaborador con regla el porcentaje se muestra como "—".
- `ResumenGlobal` y `ResumenCiudad` suman `sinRegla`; `Pendiente` suma `sinRegla: boolean` y esos colaboradores aparecen en la lista con la etiqueta "Sin regla".
- Tarjeta "Sin regla (N)" en `TarjetasResumen` que enlaza a la pantalla de reglas; las barras por ciudad indican cuántos activos quedaron fuera.
- `useRequisitos` se sustituye por `useReglas`, que lee `reglas_dotacion` en tiempo real.
- Las alertas de vencimiento de EPP no cambian: siguen sobre las entregas reales.

## Pantalla `/admin/reglas-dotacion`

Rol administrar, en el menú de administración.

- **Por definir:** combinaciones empresa × puesto × ciudad de los colaboradores activos sin regla, con el número de colaboradores que abarcan y un botón "Definir".
- **Definidas:** reglas existentes con filtros por empresa, puesto y ciudad, editar y eliminar.
- **Editor:** empresa y ciudad desde catálogos (ciudad con "Todas las plazas"); puesto entre los existentes o uno nuevo; prendas y EPP con casillas desde los catálogos, con alta de la entrada que falte en el momento; muestra cuántos colaboradores activos resolverían a la regla.
- **Captura ágil:** "Copiar de…" otra regla y aplicar las mismas listas a varias filas de "Por definir" a la vez, guardando una regla por fila.
- Sin propuesta automática desde entregas anteriores y sin importación desde Excel.

## Reinicio

Script `scripts/reiniciar-dotacion.mjs`, con el patrón de `limpiar-entregas.mjs`.

- Sin `--confirmar`: respalda en `respaldos/dotacion-<fecha>.json` los tres catálogos, `articulos_hoja`, `entregas_uniforme` y `entregas_epp`, e imprime cuántos documentos se borrarían. `respaldos/` se agrega a `.gitignore`.
- Con `--confirmar`: vacía el `items` de los tres catálogos y borra todos los documentos de `articulos_hoja`, `entregas_uniforme` y `entregas_epp`, incluidos los que vienen de la hoja.
- Se niega a borrar si el respaldo no se escribió y pide teclear el nombre de la base de datos. Nunca toca colaboradores, otros catálogos ni otros módulos.
- Antes de implementar se verifica que un catálogo vacío no se rellene con los valores de `catalogos-iniciales.ts`; si lo hace, se quita ese relleno para estos tres catálogos.

Orden: construir y probar reglas y dashboard; correr el script sin `--confirmar` y revisar; correr con `--confirmar` solo con confirmación explícita; definir reglas, volver a mapear `articulos_hoja` y sincronizar entregas. Mientras tanto el dashboard muestra "—" y todos los activos como "sin regla".

## Pruebas

- Dominio: normalización del puesto, identificador de la regla, `resolverRegla` (ciudad específica, general, sin regla, regla vacía).
- Aplicación: dashboard con reglas (denominadores, `sinRegla`, porcentaje "—"), cálculo de combinaciones por definir y de colaboradores abarcados por regla.
- Reinicio: función pura que decide qué se respalda y qué se borra.
- Reglas de Firestore: el cliente no administrador no escribe `reglas_dotacion`.

## Fuera de alcance

- Cantidades mínimas y vigencia por artículo en la regla.
- Importar reglas desde Excel o Sheets.
- Proponer reglas a partir de entregas anteriores.
- Alertas de vencimiento ligadas a la regla.
