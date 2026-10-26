# Importar capacitaciones desde el Excel de seguimiento

Fecha: 2026-10-26. Estado: diseño aprobado, pendiente de plan.

## Objetivo

Actualizar las capacitaciones de la app con el archivo `SEGUIMIENTO SEGURIDAD MKTQRO.xlsx`, desde una pantalla de administración que se pueda repetir cada mes. Solo capacitaciones: uniformes, EPP, accidentes, equipo y vehículos del mismo archivo quedan fuera.

## Fuente

- Una hoja `<Ciudad> Colaboradores` por ciudad (en León, una por área). Se ignoran las hojas `Oficina y vehículos` y `Hoja 2`. Colima no trae nombres y no aporta filas.
- Cada hoja tiene bloques mensuales (`AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`) cuyo título está en la columna A. La misma persona aparece en varios bloques con datos más nuevos en los posteriores.
- Las columnas varían por hoja, así que se ubican por encabezado en la fila que contiene `Fecha de ingreso`: `Nombre` o `Personal`, `Curso` o `Norma`, `Cumplimiento` (la celda `SI` y la siguiente `NO`), `Fecha` y `Vigencia` o `Vencimiento`. Los encabezados se repiten dentro de cada bloque y esas filas se descartan.
- El cumplimiento no es texto sino color: relleno verde `92D050` en la celda `SI` o rojo `FF0000` en la celda `NO`.

## Reglas de datos

- **Bloque:** por persona y norma gana el bloque más reciente de la hoja; entre hojas, el de mes posterior.
- **Cumple:** verde en `SI` es sí; rojo en `NO`, relleno azul o fecha `Pendiente` o `Programar` es no; sin ningún color pero con fecha real es sí (Cancún).
- **Fecha:** número de serie, ISO o `DD/MM/AAAA` con punto final opcional. `Pendiente`, `Programar` o vacío dejan la fecha vacía.
- **Vencimiento:** el de la hoja si es fecha; si falta y hay fecha de capacitación, fecha más un año. `Vencido` o `Pendiente` no es fecha.
- **Norma:** se normaliza al valor del catálogo `normas`. `NOM-009-STPS-2012` se trata como `NOM-009-STPS-2011` (supuesto de error de captura, no objetado al presentar el diseño). Una norma fuera del catálogo rechaza la fila con su motivo.
- Filas sin nombre o sin norma se descartan.

## Sincronización

Módulo de aplicación puro con un almacén inyectable, igual que `entregas-sync`.

1. **Colaborador:** por nombre normalizado (sin acentos, minúsculas, espacios limpios) contra todos los colaboradores, activos e inactivos. Con varias coincidencias se elige el único activo; si sigue ambiguo la fila se reporta y no se escribe. Sin coincidencia se reporta el nombre.
2. **Llave:** colaborador más norma. Existe, se actualiza; no existe, se crea.
3. **No retrocede:** si la capacitación existente tiene una fecha posterior a la del Excel, no se toca y se reporta.
4. **Campos escritos:** `cumple`, `fecha`, `vencimiento`, `estado` (con `estadoCapacitacion`) y `ciudad` del colaborador, con la auditoría habitual. No se tocan los adjuntos.
5. **Idempotente:** aplicar dos veces el mismo archivo no cambia nada la segunda vez.
6. **Simulación** por defecto: devuelve el reporte sin escribir.

Reporte: total, nuevas, actualizadas, sin cambios, no retrocedidas, sin coincidencia, ambiguas y rechazadas con motivo, acotado en cantidad listada.

## Capas y archivos

- `infrastructure/xlsx/leer-xlsx.ts`: `HojaLeida` suma `colores` opcional (matriz paralela de relleno RGB por celda, leída de `xl/styles.xml`). Compatible con `ImportarReglasEpp`.
- `domain/capacitaciones-excel.ts`: parser puro de hojas a filas normalizadas.
- `application/capacitaciones-sync.ts`: sincronización pura con almacén.
- `infrastructure/servidor/almacen-capacitaciones.ts`: almacén sobre Firestore Admin.
- `app/api/capacitaciones/importar/route.ts`: `POST`, rol `administrar`, `simular` por defecto; recibe las filas ya parseadas.
- `app/(app)/admin/capacitaciones-excel/page.tsx` y `presentation/capacitaciones/ImportarCapacitaciones.tsx`: subir archivo, Simular, Aplicar y reporte.
- `presentation/navegacion/enlaces.ts`: enlace en administración.

## Pruebas

- Lector: xlsx mínimo con relleno de celdas.
- Parser: colores, bloques, encabezados repetidos, formatos de fecha, vigencia faltante, norma 2012, hojas sin nombres.
- Sincronización: crea, actualiza, idempotencia, no retroceder, inactivos, ambiguos, sin coincidencia, norma desconocida.
- Reglas de Firestore sin cambios: escribe solo el servidor.

## Fuera de alcance

Uniformes, EPP, accidentes, equipo y vehículos; vincular a mano los nombres sin coincidencia; leer Colima.
