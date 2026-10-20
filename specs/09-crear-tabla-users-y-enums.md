# SPEC 09 — Perfiles de usuario y pertenencia a guarderías

> **Estado:** Implementado
> **Depende de:** SPEC 08
> **Fecha:** 2026-10-20
> **Objetivo:** Crear `public.users` y sus enumeraciones mediante una migración de Supabase, vinculando cada perfil a una sola guardería y protegiendo su acceso por usuario.

## Alcance

**Incluye:**

- Inspeccionar el proyecto Supabase conectado, `public.daycares`, `auth.users`, privilegios y migraciones antes de modificar la base de datos.
- Crear `public.user_role`, `public.user_status` y `public.users` mediante una migración versionada generada con la CLI.
- Vincular `users.id` a `auth.users.id` y `users.daycare_id` a `daycares.id`: una guardería admite muchos perfiles, pero cada perfil pertenece a exactamente una guardería.
- Mantener automáticamente `updated_at` después de cada actualización de perfil.
- Habilitar RLS y conceder acceso mínimo: lectura y edición limitada del perfil propio; lectura de la guardería propia; sin altas ni bajas desde roles cliente.
- Aplicar la migración al proyecto remoto identificado y comprobar estructura, relaciones, permisos, RLS e historial sin dejar datos de prueba.

**Fuera de alcance (para futuras specs):**

- Crear una cuenta en Supabase Auth o insertar un perfil persistente inicial. El perfil `staff` de `Daniel Torres` se pospone hasta disponer del UUID de una cuenta existente en `auth.users`.
- Crear triggers de signup, funciones públicas para altas, invitaciones o endpoints de aprovisionamiento.
- Integrar Supabase con Next.js, cambiar pantallas o sustituir los usuarios estáticos de la aplicación.
- Crear otros enums o tablas del documento de referencia.
- Permitir que los usuarios cambien su rol, estado o guardería.

## Modelo de datos

- `public.user_role`: enum con valores `staff`, `parent`, `admin`.
- `public.user_status`: enum con valores `pending`, `active`.
- `public.users`:

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, FK a `auth.users(id)` con `ON DELETE CASCADE`; sin UUID independiente |
| `daycare_id` | `uuid` | `NOT NULL`, FK a `public.daycares(id)` con borrado restringido |
| `role` | `public.user_role` | `NOT NULL`, sin valor por defecto; asignado por un proceso servidor autorizado |
| `status` | `public.user_status` | `NOT NULL`, `DEFAULT 'active'` |
| `full_name` | `text` | `NOT NULL`, rechaza vacío y solo espacios |
| `avatar_url` | `text` | Admite `NULL` |
| `notify_on_post` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `daily_summary_enabled` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()`; trigger de actualización automática |

- Crear índice sobre `users.daycare_id` para la relación y las consultas de pertenencia.
- RLS de `users`: `authenticated` solo puede leer su propia fila (`id = auth.uid()`) y actualizarla si sigue siendo propia. Limitar el privilegio SQL `UPDATE` a `full_name`, `avatar_url`, `notify_on_post` y `daily_summary_enabled`; ni RLS ni un formulario bastan por sí solos para impedir cambios de `role`, `status` o `daycare_id`.
- No conceder `INSERT` ni `DELETE` sobre `users` a `anon` o `authenticated`; no concederles acceso abierto al resto de columnas ni a otras filas. Un futuro proceso servidor privilegiado validará la identidad Auth, guardería y rol antes de insertar el perfil.
- RLS de `daycares`: conceder `SELECT` a `authenticated` solo para la guardería cuyo `id` coincide con el `daycare_id` del perfil propio; mantener cerradas las escrituras cliente y el acceso `anon`. Conservar la fila inicial de SPEC 08 sin duplicarla.
- No usar `raw_user_meta_data` para autorizar `role` o `daycare_id`: es editable por el usuario. No duplicar email ni contraseñas de `auth.users`.

## Plan de implementación

1. Verificar el proyecto remoto, la migración de SPEC 08 y el estado real de `public.daycares`, `auth.users`, tipos, políticas y privilegios. Detenerse ante un destino incorrecto, objetos incompatibles o historial divergente.
2. Consultar la documentación vigente de Supabase y las prácticas de Postgres pertinentes. Crear con la CLI un archivo nuevo en `supabase/migrations/` para enums, tabla, claves, defaults, restricciones e índice; no modificar la migración ya aplicada de daycares.
3. Completar en esa migración el trigger de `updated_at`, RLS de ambas tablas, políticas por identidad y privilegios de tabla/columna mínimos. Dejar `users` sin trigger de signup y sin filas iniciales.
4. Revisar el SQL y, si hay entorno local disponible, probar la migración y casos de autorización localmente. Confirmar destino e historial remoto y aplicar el archivo mediante el flujo de migraciones, sin ejecutar DDL o INSERT persistentes directamente en remoto.
5. Comprobar en remoto columnas, enums, claves, defaults, índice, trigger, RLS, privilegios efectivos y migración aplicada. Probar con transacciones revertidas perfiles vinculados a cuentas Auth y guarderías válidas, denegación de accesos cruzados, modificaciones privilegiadas y borrados restringidos; no dejar perfiles de prueba ni alterar la guardería inicial.

## Criterios de aceptación

- [X] Existe una nueva migración versionada creada con la CLI en `supabase/migrations/`; no se editó la migración aplicada de SPEC 08 ni se ejecutó DDL o INSERT persistentes fuera del flujo de migraciones.
- [X] Los enums `public.user_role` y `public.user_status` contienen exactamente los valores y el orden definidos en el modelo de datos.
- [X] `public.users` tiene exactamente las diez columnas, tipos, defaults y restricciones descritos arriba.
- [X] `users.id` solo acepta UUID existentes en `auth.users` y borrar la cuenta Auth elimina su perfil.
- [X] Cada perfil exige una guardería existente; múltiples perfiles pueden compartirla y no se puede borrar una guardería que aún tiene perfiles.
- [X] El valor por defecto de `status` es `active`; ambas preferencias inician en `true` y `full_name` rechaza `NULL`, vacío y solo espacios.
- [X] `updated_at` se establece al crear y cambia automáticamente al actualizar cualquier campo permitido.
- [X] RLS está habilitado en `users` y `daycares`; `anon` no puede leer ni escribir ninguna de las dos tablas.
- [X] Un usuario autenticado puede leer solamente su propio perfil y la guardería asociada, sin poder ver perfiles ajenos ni otras guarderías.
- [ ] Un usuario autenticado puede modificar solo sus cuatro campos editables y no puede insertar, borrar ni cambiar `id`, `daycare_id`, `role`, `status` o marcas temporales, aunque envíe una petición directa a la API.
- [X] No existe trigger de signup que confíe en `raw_user_meta_data` para asignar rol o guardería ni se añadió una cuenta o perfil persistente inicial.
- [X] Se confirmó destino e historial antes del despliegue; la migración consta como aplicada en remoto y las pruebas de lectura y escritura se revirtieron sin dejar datos de prueba.

## Decisiones tomadas y descartadas

- **Sí:** Una fila de `users` por UUID de Auth y un `daycare_id` obligatorio. Representa `daycares` uno-a-muchos `users` sin perfiles huérfanos.
- **No:** Permitir perfiles sin guardería o borrar en cascada los perfiles al eliminarla. Se conserva la pertenencia obligatoria y se bloquean borrados accidentales.
- **Sí:** Mantener `status = active` por defecto y reservar `pending` para flujos futuros.
- **Sí:** Aprovisionamiento controlado por servidor en una futura spec; esta migración solo define la estructura y los permisos. Evita que el cliente se asigne `admin` o se vincule a otra guardería.
- **No:** Copiar `daycare_id` y `role` desde `raw_user_meta_data` en un trigger de signup, aunque figure en la referencia. Esos metadatos no son una fuente fiable de autorización.
- **Sí:** Lectura del perfil y guardería propios y edición de cuatro campos mediante privilegios de columna más RLS. `daycares` continúa sin escrituras desde cliente.
- **Sí:** Desplegar y verificar en remoto, como SPEC 08, previa inspección del destino e historial.
- **No:** Sembrar ahora el perfil `staff` de `Daniel Torres`. Falta el UUID de su cuenta existente en Auth; hacerlo requiere una migración posterior con ese UUID verificado y sin contraseñas en el repositorio.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La referencia describe un esquema previsto, no necesariamente el estado remoto actual. | Inspeccionar objetos, permisos, destino e historial antes de aplicar; detenerse ante conflictos. |
| RLS sin privilegios de columna podría permitir cambiar rol o guardería, o una política demasiado amplia podría exponer otros centros. | Verificar privilegios efectivos por columna y probar peticiones cruzadas con identidades distintas. |
| Un futuro aprovisionamiento puede confiar por error en metadatos editables. | Exigir validación privilegiada de identidad, guardería y rol en la spec futura; no crear trigger inseguro ahora. |
| Las pruebas de FK y cascada podrían borrar cuentas o datos reales. | Usar únicamente cuentas de prueba controladas y transacciones revertidas; no tocar cuentas reales. |

## Lo que **no** está incluido en esta spec

- Alta de cuentas Auth, invitaciones, perfiles iniciales persistentes o API de aprovisionamiento.
- Integración con la aplicación Next.js o cambios visibles en pantalla.
- Otras entidades y enumeraciones del esquema de referencia.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
