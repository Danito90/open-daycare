# SPEC 08 — Primera migración de daycares

> **Estado:** Implementado
> **Fecha:** 2026-10-20
> **Objetivo:** Crear `public.daycares` mediante una migración versionada de Supabase, aplicarla al proyecto remoto y verificar allí la tabla y su guardería inicial.

## Alcance

**Incluye:**

- Inspeccionar mediante el MCP el proyecto Supabase conectado, las tablas existentes, los privilegios y el historial de migraciones antes de modificar la base de datos.
- Inicializar la configuración local de Supabase si todavía no existe y generar el archivo de migración con la CLI dentro de `supabase/migrations/`.
- Crear únicamente `public.daycares` con `id`, `name` y `created_at` conforme a la referencia `../07-DB-Schema/opendaycare-database-schema.md`.
- Insertar una guardería inicial llamada `Guardería Sala Soles` dentro de la misma migración.
- Activar RLS y mantener la tabla sin acceso inicial para `anon` y `authenticated`, verificando tanto las políticas como los privilegios efectivos.
- Verificar el proyecto remoto de destino, aplicar allí el archivo mediante el flujo de migraciones y comprobar su resultado directamente en remoto.
- Actualizar `AGENTS.md` para exigir archivos versionados en `supabase/migrations/` para todo cambio persistente de la base de datos.

**Fuera de alcance (para futuras specs):**

- Crear las tablas `users`, `rooms` o cualquier otra entidad del esquema de referencia.
- Políticas de lectura o escritura para usuarios finales; la vinculación entre usuarios y guarderías aún no está definida.
- Integrar el cliente de Supabase con Next.js, crear pantallas o cambiar los datos visibles de la aplicación.
- Crear filas adicionales de guarderías, endpoints o flujos de administración.

## Modelo de datos

`public.daycares` tendrá exactamente estas columnas:

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | Clave primaria, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `name` | `text` | `NOT NULL`; restricción que rechaza valores vacíos o compuestos solo por espacios |
| `created_at` | `timestamptz` | `NOT NULL`, fecha de creación automática |

- La migración inserta una fila con `name = 'Guardería Sala Soles'`; `id` y `created_at` se generan mediante sus defaults.
- RLS queda activado sin políticas para `anon` ni `authenticated` y sin concederles privilegios sobre esta tabla. Si el proyecto tiene privilegios automáticos preexistentes, se revocan únicamente para `public.daycares`, sin modificar los valores por defecto globales ni otras tablas.
- No se crea `updated_at`: la referencia de `daycares` no lo incluye.

## Plan de implementación

1. Inspeccionar con el MCP el proyecto remoto conectado, confirmar su identificador y revisar si `public.daycares` o migraciones previas ya existen. Detener el despliegue ante un destino incorrecto, una tabla existente o un historial incompatible; no sobrescribir datos.
2. Inicializar Supabase localmente si falta `supabase/config.toml`; revisar los archivos generados y crear con la CLI una migración descriptiva en `supabase/migrations/`. Mantener el proyecto existente funcional sin alterar código de la aplicación.
3. Incorporar a esa migración la tabla, las restricciones, RLS, el cierre de privilegios de la tabla y la fila inicial. No ejecutar ese DDL o INSERT directamente en el proyecto remoto.
4. Actualizar `AGENTS.md` con la regla general de migraciones versionadas para cambios persistentes y la excepción de consultas de solo lectura.
5. Revisar el historial remoto y las migraciones pendientes, confirmar de nuevo el proyecto de destino y aplicar el archivo versionado una sola vez mediante el flujo de migraciones. Detenerse si hay conflictos; no ejecutar DDL ni INSERT manuales en remoto.
6. Verificar en remoto columnas, defaults, restricciones, la única fila inicial, RLS, privilegios, falta de acceso desde `anon` y `authenticated`, e historial de migraciones. Ejecutar las comprobaciones que escriben datos dentro de transacciones revertidas para no dejar filas de prueba. Si algo falla tras el despliegue, crear una migración correctiva nueva y verificarla; no modificar una migración que ya fue aplicada.

## Criterios de aceptación

- [X] El repositorio contiene una migración creada con la CLI y versionada dentro de `supabase/migrations/`; no se ejecutó DDL ni INSERT remoto fuera del flujo de migraciones.
- [X] `public.daycares` contiene exactamente las columnas `id uuid`, `name text` y `created_at timestamptz` con los defaults y restricciones definidos.
- [X] Un INSERT sin `id` ni `created_at` obtiene UUID y fecha de creación automáticos.
- [X] La base de datos rechaza `name = NULL`, `name = ''` y nombres compuestos solo por espacios.
- [X] Tras aplicar la migración hay exactamente una fila inicial cuyo `name` es `Guardería Sala Soles`.
- [X] RLS está activado en `public.daycares`; no hay políticas de acceso cliente y `anon` y `authenticated` no pueden leer ni modificar sus filas.
- [X] Se confirmó el identificador del proyecto remoto y su historial antes del despliegue; la migración figura como aplicada y sus resultados se verificaron en remoto sin dejar datos de prueba.
- [X] `AGENTS.md` exige migraciones versionadas en `supabase/migrations/` para cambios persistentes y exceptúa las consultas de solo lectura.

**Verificación (2026-10-20):** El check 7 queda confirmado con la evidencia histórica aportada en la conversación: antes de `apply_migration`, `get_project_url()` devolvió `https://jrkpnkmryvhistfvmoqz.supabase.co`, `list_tables()` y `list_migrations()` devolvieron listas vacías y la consulta SQL encontró `daycares_table = null` y `matching_tables = 0`; después, `apply_migration` devolvió `success: true` y el historial registró `20261020122730_create_daycares`. La comprobación independiente del estado remoto y la prueba transaccional revertida confirmaron el resultado sin filas adicionales. El check 1 sigue abierto: aunque se aportó la ejecución de CLI `npx --yes supabase migration new create_daycares` (versión inicial `20261020121428`, luego renombrada para alinearse con el historial MCP), `supabase/migrations/20261020122730_create_daycares.sql` sigue sin seguimiento en Git. El registro remoto contiene el mismo SQL que el archivo local; según la evidencia de la conversación, no hubo DDL ni INSERT persistentes fuera de `apply_migration`. El estado sigue en `Aprobado` hasta cerrar el criterio pendiente.

## Decisiones tomadas y descartadas

- **Sí:** Usar una migración generada por la CLI en `supabase/migrations/` para crear la tabla y su dato inicial. Mantiene reproducibles los cambios locales y remotos.
- **Sí:** Aplicar y verificar directamente en remoto para esta spec, después de inspeccionar el destino y el historial. La prueba local no es condición de despliegue en este caso.
- **No:** Crear la tabla o insertar la fila directamente mediante SQL remoto. Evitaría el historial versionado de migraciones.
- **Sí:** Conservar exactamente las tres columnas de la referencia y exigir un nombre significativo. No introducir campos de otras entidades prematuramente.
- **No:** Añadir `updated_at` a esta tabla. No aparece en la definición concreta de `daycares`.
- **Sí:** Dejar RLS habilitado y el acceso cliente cerrado hasta definir cómo se vinculan usuarios y guarderías.
- **No:** Conceder lectura pública o a todos los usuarios autenticados. Podría exponer datos de otras guarderías sin una regla de pertenencia.
- **Sí:** Sembrar `Guardería Sala Soles` como único dato inicial. Permite comprobar el resultado sin añadir un flujo de administración.
- **No:** Crear otras tablas del documento de referencia. Cada entidad futura tendrá su propia decisión de acceso y migración.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La referencia describe el modelo previsto, no el estado remoto real. | Inspeccionar tabla, historial y destino antes de aplicar; detenerse ante conflictos. |
| Los privilegios automáticos de `public` pueden variar entre proyectos. | Verificar privilegios efectivos y revocarlos solo sobre `public.daycares` si existen. |
| Una migración aplicada en remoto puede fallar o divergir del historial local. | Revisar las pendientes y desplegar solo el archivo versionado; si ya se aplicó, corregir con una migración nueva. |

## Lo que **no** está incluido en esta spec

- Otras tablas, relaciones o políticas de acceso de usuarios finales.
- Integración de la aplicación con Supabase.
- Alta de guarderías adicionales o interfaz de administración.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
