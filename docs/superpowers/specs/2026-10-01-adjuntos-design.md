# Adjuntos de accidentes y capacitaciones (Firebase Storage)

Fecha: 2026-10-01. Estado: diseño aprobado por el usuario en chat, pendiente de revisión de esta spec.

## Objetivo

Subir archivos a cada registro de accidente y a cada constancia de capacitación, ligados al registro y al colaborador. Un componente reutilizable para ambos módulos.

## Fuera de alcance

Vista previa de PDF e imágenes, miniaturas, antivirus. Segunda fase si se piden.

## Modelo de datos

Colección `adjuntos` (Firestore, BD con nombre propia), un documento por archivo, id de Firestore:

| Campo | Tipo | Nota |
|---|---|---|
| colaborador_id | string | obligatorio, inmutable |
| modulo | 'accidentes' \| 'capacitaciones' | inmutable |
| registro_id | string | id del accidente o capacitación, inmutable |
| archivo_id | string | id aleatorio, parte de la ruta en Storage |
| nombre | string | nombre original saneado, solo metadato |
| tipo | string | MIME validado |
| tamano | number | bytes, 1 a 10 MB |
| subido_por | string | uid |
| subido_en | Timestamp | servidor |

Ruta en Storage: `adjuntos/{colaborador_id}/{modulo}/{registro_id}/{archivo_id}`. El nombre original nunca forma parte de la ruta.

Tipos permitidos: PDF, JPG, PNG, WebP, Word (doc, docx), Excel (xls, xlsx), PowerPoint (ppt, pptx). Máximo 10 MB por archivo y 10 archivos por registro.

## Capas (Clean Architecture)

- `src/domain/adjuntos.ts`: tipos, tipos permitidos, validación pura (tipo, tamaño, tope por registro), construcción de ruta, saneo del nombre. Con pruebas.
- `src/application/adjuntos-subida.ts`: orquestación pura con puertos inyectados (almacenamiento, metadatos): cola con concurrencia 3, progreso, cancelación, reintento por archivo, compensación (si falla el documento se borra el archivo). Con pruebas.
- `src/infrastructure/storage/`: cliente Storage (subida reanudable, descarga con `getDownloadURL`, borrado) y repositorio Firestore de `adjuntos`. Solo cableado.
- `src/presentation/adjuntos/`: componente `Adjuntos` (zona de arrastre, progreso, lista, descarga, borrado) y sección "Archivos" en la ficha del colaborador. Lecturas por el almacén compartido existente.

## Flujo de subida

1. Validar en cliente: tipo por extensión y MIME, tamaño, tope de 10 por registro. Si falla, motivo junto al archivo y no se sube.
2. Generar `archivo_id` aleatorio y sanear el nombre con la regla de texto común.
3. Subida reanudable con progreso y cancelar. Máximo 3 simultáneas; un fallo no cancela las demás; reintento individual.
4. Al terminar, crear el documento en `adjuntos`. Si falla, borrar el archivo subido.
5. Nada aparece como adjunto hasta completar los pasos 3 y 4.

Registro nuevo: se reserva el id del documento al abrir el formulario y los archivos se suben contra ese id; el registro se crea al guardar. Si se cancela el formulario, se borran los archivos subidos.

Descarga: al hacer clic, el cliente obtiene el enlace con `getDownloadURL` (solo lo logra un usuario permitido por las reglas de Storage) y lo abre en otra pestaña sin guardarlo ni registrarlo; un reintento ante fallo de red. El enlace lleva un token que no vence (riesgo aceptado, documentado en el README). Nota: una versión anterior firmaba URLs en el servidor (commit 52a8bbd) y se retiró por simplicidad.

Borrado: elimina archivo y documento. Los registros de accidente y capacitación no se borran, así que no quedan huérfanos.

Cambio de colaborador en un registro con archivos: bloqueado en el formulario con aviso; los adjuntos siguen ligados al colaborador original.

## Seguridad

- `storage.rules.template` nuevo, mismo esquema de plantilla que Firestore, sin valores reales en el repo; el generador de configuración lo materializa.
- Reglas de Storage: crear solo si el usuario es admin o capturista activo, el tipo está permitido y el tamaño es de 1 byte a 10 MB; leer a cualquier rol activo; borrar solo admin y capturista; sin actualizar.
- Reglas de Firestore para `adjuntos`: leer a roles activos; crear y borrar solo admin y capturista; campos inmutables; validar forma y tope de 10 por registro.
- Rol consulta: componente solo lectura, sin zona de subida ni borrar.
- Descarga: sin servidor ni `firebase-admin`; el enlace de Firebase no vence y se acepta ese riesgo. Errores genéricos en español; no se registran enlaces, tokens, correos ni nombres.
- Variable `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` documentada en `.env.example` y en el generador; el valor lo coloca el usuario en `.env.local`. Región del bucket: `us-east1` (el usuario indicó US-EAST-1).
- Errores de reglas se muestran como mensaje genérico "No se pudo subir el archivo".
- El escáner de publicación (`verificar:publicable`) debe cubrir la plantilla nueva.

## Pruebas

- Unitarias: dominio y orquestación (concurrencia, cancelación, reintento, compensación, reserva de id).
- Reglas de Storage y Firestore con el emulador (`pnpm test:rules`), pendiente de que el usuario instale Java 21.
- Build de producción en copia aislada con variables ficticias.

## Orden de implementación

1. Dominio y orquestación con pruebas.
2. Infraestructura Storage y repositorio, reglas y plantillas, generador y escáner.
3. Componente `Adjuntos` e integración en accidentes y capacitaciones.
4. Sección "Archivos" en la ficha del colaborador.
