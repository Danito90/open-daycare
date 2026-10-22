# SPEC 13 — Invitaciones reales y registro de padres

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 09, SPEC 10, SPEC 11, SPEC 12
> **Fecha:** 2026-10-22
> **Objetivo:** Enviar por correo una invitación real con código desde el perfil del niño, guardar invitaciones y vínculos en Supabase, y permitir que el padre cree su cuenta con ese código, quede vinculado a su hijo y vea solo sus niños.

## Por qué existe esta spec

SPEC 05 dejó el flujo de vinculación simulado: el código se genera en el navegador, no se envía ningún correo y el padre solo existe en memoria hasta recargar. `/activar-cuenta` valida un formulario y navega a `/login` sin crear nada.

Esta spec reemplaza esa simulación por el flujo real: el staff invita desde el perfil, el correo sale por Resend, la invitación se persiste, el padre se registra con el código y la cuenta queda vinculada al niño en la base. También cierra la consecuencia inmediata de crear cuentas de padres: un padre no puede seguir viendo a todos los niños de la guardería.

## Alcance

**Incluye:**

- Instalar el SDK de Resend y enviar la invitación desde una Server Action.
- Agregar `SUPABASE_SECRET_KEY`, `RESEND_FROM_EMAIL` y `APP_URL` a `.env-template`; documentar que las claves reales viven en `.env` o `.env.local`.
- Corregir en `.env` el nombre `RESEND_API_KEY `, que hoy tiene un espacio final.
- Crear los enums `public.relationship_type` y `public.invitation_status`.
- Crear `public.invitations` y `public.parent_children` con claves, restricciones e índices.
- Habilitar RLS en ambas tablas y definir políticas de lectura e inserción acordes al rol.
- Crear funciones auxiliares `SECURITY DEFINER` para evitar recursión de RLS.
- Crear las funciones `accept_invitation` y `email_has_account`, ejecutables solo por `service_role`.
- Restringir la lectura de `children` a staff/admin de la guardería y a los padres vinculados.
- Permitir a los padres vinculados leer los perfiles de los otros tutores del mismo niño.
- Permitir actualizar únicamente `children.photo_consent` a staff, admin y padres vinculados.
- Enviar la invitación desde el modal de `Vincular padre` con nombre, email, parentesco y código.
- Generar el código de cinco caracteres al abrir el modal y persistirlo al enviar.
- Guardar la invitación con estado `pending`, vencimiento a siete días e `invited_by`.
- Mostrar el código final y el resultado del envío en el modal, sin cerrarlo antes de confirmar.
- Bloquear el envío si ya hay una invitación pendiente para ese email y niño, o si el email ya tiene cuenta.
- Guardar el estado real del envío fallido sin dejar invitaciones pendientes ni correos fantasma.
- Reemplazar el overlay de padres en memoria de SPEC 05 por consultas a la base.
- Mostrar en el perfil las invitaciones pendientes y los padres activos.
- Convertir `/activar-cuenta` en una pantalla que valida el código contra la base.
- Quitar el checkbox de consentimiento de fotos de `/activar-cuenta`.
- Crear la cuenta con Supabase Admin, confirmando el email porque la invitación ya lo verificó.
- Vincular la cuenta al niño en `parent_children` y marcar la invitación como `accepted`.
- Iniciar sesión automáticamente después de activar y redirigir a `/`.
- Restringir `/kids` y `/kids/[id]` a los niños vinculados cuando el usuario es `parent`.
- Ocultar `Agregar niño` y `Vincular otro padre` a los usuarios `parent`.
- Reemplazar el enlace `Editar` del perfil por un modal que edita `children.photo_consent`.
- Verificar build, TypeScript, RLS, envío real y flujo completo con Playwright en escritorio y `390 × 844`.

**Fuera de alcance (para futuras specs):**

- Verificar un dominio propio en Resend; esta spec usa `RESEND_FROM_EMAIL` para no fijar el remitente.
- Reenviar, cancelar o eliminar invitaciones desde la aplicación.
- Recuperación de contraseña, cambio de email o edición de perfil del padre.
- Confirmación de email adicional o doble opt-in.
- Invitar padres desde la lista `/kids` o desde otro lugar que no sea el perfil del niño.
- Permitir que un padre invite a otro padre.
- Editar nombre, fecha de nacimiento, sala, alergias, notas o estado del niño.
- Feed filtrado por niño, publicaciones persistentes o reglas de privacidad del feed.
- Consentimiento de fotos por padre o histórico de cambios.
- Gestión de usuarios, roles o cuentas desde la aplicación.
- Notificaciones por email distintas de la invitación.
- Límite de intentos o captcha en `/activar-cuenta`.
- Suite de pruebas permanente o dependencia de Playwright en `package.json`.

## Modelo de datos

### Base de datos

**Enum `public.relationship_type`:** `father`, `mother`, `guardian`.

**Enum `public.invitation_status`:** `pending`, `accepted`, `expired`, `cancelled`.

Etiquetas de UI:

| Valor DB | Etiqueta UI |
| --- | --- |
| `mother` | `Mamá` |
| `father` | `Papá` |
| `guardian` | `Tutor/a` |

**`public.invitations`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `child_id` | `uuid` | `NOT NULL`, FK a `public.children(id)` con `ON DELETE CASCADE` |
| `invited_by` | `uuid` | `NOT NULL`, FK a `public.users(id)` con `ON DELETE RESTRICT` |
| `full_name` | `text` | `NOT NULL`; rechaza vacío y solo espacios |
| `email` | `text` | `NOT NULL`; almacenado en minúsculas; rechaza vacío y solo espacios |
| `relationship` | `public.relationship_type` | `NOT NULL` |
| `code` | `text` | `NOT NULL`; formato exacto `^[A-Z2-9]{5}$` |
| `status` | `public.invitation_status` | `NOT NULL`, `DEFAULT 'pending'` |
| `expires_at` | `timestamptz` | `NOT NULL` |
| `accepted_at` | `timestamptz` | Admite `NULL` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

Restricciones e índices:

- Índice único parcial sobre `code` para `status in ('pending','accepted')`.
- Índice único parcial sobre `(child_id, lower(email))` para `status = 'pending'`.
- Índice sobre `(child_id, status)`.
- Índice sobre `lower(email)`.
- El estado `expired` no se calcula con un `CHECK`; se marca desde el servidor antes de re-invitar y la UI también compara `expires_at` con la fecha actual.

**`public.parent_children`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `parent_id` | `uuid` | `NOT NULL`, FK a `public.users(id)` con `ON DELETE CASCADE` |
| `child_id` | `uuid` | `NOT NULL`, FK a `public.children(id)` con `ON DELETE CASCADE` |
| `relationship` | `public.relationship_type` | `NOT NULL` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

Restricciones e índices:

- `UNIQUE (parent_id, child_id)`.
- Índices sobre `parent_id` y `child_id`.

### RLS, funciones y privilegios

Las políticas que cruzan `children`, `parent_children` y `users` usan funciones auxiliares `SECURITY DEFINER` para no entrar en recursión de RLS.

**Funciones auxiliares**, todas `STABLE`, `SECURITY DEFINER`, `SET search_path = ''`, con `REVOKE ALL` de `PUBLIC` y `anon` y `GRANT EXECUTE` a `authenticated`:

| Función | Devuelve |
| --- | --- |
| `public.is_daycare_staff(p_daycare_id uuid)` | `true` si el usuario actual es `staff` o `admin` de esa guardería |
| `public.is_child_daycare_staff(p_child_id uuid)` | `true` si el usuario actual es `staff` o `admin` de la guardería del niño |
| `public.is_linked_parent(p_child_id uuid)` | `true` si el usuario actual está en `parent_children` para ese niño |
| `public.can_read_user_profile(p_user_id uuid)` | `true` si es el propio perfil, staff/admin de la misma guardería, o padre que comparte un niño |

**Funciones de servidor**, `SECURITY DEFINER`, `SET search_path = ''`, con `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`, y `GRANT EXECUTE` solo a `service_role`:

| Función | Comportamiento |
| --- | --- |
| `public.email_has_account(p_email text)` | Devuelve si existe una fila en `auth.users` con ese email, sin exponer datos del usuario |
| `public.accept_invitation(p_invitation_id uuid, p_user_id uuid, p_full_name text)` | Verifica la invitación, inserta el perfil y el vínculo, y marca la invitación como aceptada en una sola transacción |

`accept_invitation` deriva todos los datos de la invitación, nunca del cliente:

1. Bloquea la invitación con `FOR UPDATE`.
2. Exige `status = 'pending'` y `expires_at > now()`.
3. Compara el email de `auth.users` del `p_user_id` con `invitations.email` en minúsculas.
4. Resuelve la guardería con `children -> rooms -> daycares`.
5. Inserta `public.users` con `role = 'parent'`, `status = 'active'`, `daycare_id` de la invitación y el `full_name` recibido.
6. Inserta `parent_children` con el `child_id` y el `relationship` de la invitación.
7. Actualiza la invitación a `accepted` con `accepted_at = now()`.
8. Lanza una excepción si la invitación no existe, venció o ya fue usada.

**Políticas de `invitations`**

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `is_child_daycare_staff(child_id)` |
| `INSERT` | `authenticated` | `is_child_daycare_staff(child_id)` y `invited_by = auth.uid()` |
| `UPDATE` / `DELETE` | — | Sin privilegios para clientes; solo `service_role` |

**Políticas de `parent_children`**

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `parent_id = auth.uid()` o `is_child_daycare_staff(child_id)` |
| `INSERT` / `UPDATE` / `DELETE` | — | Sin privilegios para clientes; solo `service_role` y `accept_invitation` |

**Cambios en `children`**

- Reemplazar la política `Users can read their daycare children`: un usuario `authenticated` solo ve un niño si `is_linked_parent(id)` o `is_child_daycare_staff(id)`.
- Agregar política de `UPDATE` con `USING` y `WITH CHECK` iguales a `is_linked_parent(id) OR is_child_daycare_staff(id)`.
- Conceder a `authenticated` `UPDATE` únicamente sobre la columna `photo_consent`.
- Mantener la política de `INSERT` de SPEC 12 para staff/admin.

**Cambios en `users`**

- Mantener la política de lectura del propio perfil.
- Agregar una política de `SELECT` para `authenticated` con `can_read_user_profile(id)`.
- No se agregan políticas de `INSERT`, `UPDATE` ni `DELETE`; el perfil del padre lo crea `accept_invitation`.

**Privilegios**

- `authenticated`: `SELECT` e `INSERT` en `invitations`; solo `SELECT` en `parent_children`; `UPDATE (photo_consent)` en `children`.
- `anon`: sin privilegios ni políticas en `invitations`, `parent_children`, `children` o `users`.
- `service_role`: acceso completo a las dos tablas nuevas y ejecución de las funciones de servidor.
- `RLS` activo en `invitations` y `parent_children`.

### Tipos y contratos de la aplicación

```ts
// utils/invitations/types.ts
export type RelationshipType = "father" | "mother" | "guardian";

export type LinkedParent = {
  id: string;
  name: string;
  relationship: RelationshipType;
  status: "pending" | "active";
};

export type InvitationSummary = {
  invitationId: string;
  childName: string;
  roomName: string;
  daycareName: string;
  expiresAt: string; // ISO
};

export type LinkParentState = {
  errors?: {
    name?: string;
    email?: string;
    relationship?: string;
    code?: string;
  };
  formError?: string;
  sent?: {
    invitationId: string;
    code: string;
    email: string;
  };
};

export type ActivateAccountState = {
  errors?: {
    code?: string;
    email?: string;
    password?: string;
  };
  formError?: string;
  activated?: boolean;
};
```

```ts
// utils/auth/types.ts
export type UserProfile = {
  fullName: string;
  role: UserRole | null;
  roleLabel: string;
  daycareName: string | null;
  avatarUrl: string | null;
};
```

```ts
// utils/kids/types.ts
export type Kid = {
  // ...campos de SPEC 12
  photoConsent: boolean;
};
```

Convenciones:

- `RELATIONSHIP_OPTIONS` expone `mother → Mamá`, `father → Papá`, `guardian → Tutor/a`; los valores persistidos son los ingleses.
- El código se genera en el cliente con el alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sin `I`, `O`, `0` ni `1`.
- El email se normaliza a minúsculas y se recorta antes de validar, comparar y guardar.
- La UI del perfil muestra `pending` para invitaciones no aceptadas y `active` para filas de `parent_children`.
- `photoConsent` se agrega a `KID_COLUMNS` y a `getKidById`; `getKids` puede seguir seleccionándolo sin usarlo.
- `UserProfile.role` se usa solo para decidir qué acciones mostrar; la autorización real vive en RLS.

### Correo de invitación

- Remitente: `RESEND_FROM_EMAIL` (por ejemplo `OpenDayCare <onboarding@resend.dev>`).
- Destinatario: el email de la invitación.
- Asunto: `Te invitamos a seguir a <nombre del niño> en OpenDayCare`.
- Cuerpo HTML y texto plano con: nombre del padre, nombre del niño, sala, guardería, código de cinco caracteres, vencimiento a siete días y botón `Activar mi cuenta`.
- Enlace: `${APP_URL}/activar-cuenta?code=<CODE>`.
- Los nombres y textos variables se escapan antes de insertarse en el HTML.
- `idempotencyKey`: `invite/<child_id>/<code>`. Evita duplicados si se reintenta el envío con el mismo código.
- Si Resend devuelve error, la invitación se marca `cancelled` y no queda pendiente.

### Variables de entorno

| Variable | Uso | Ámbito |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase | Pública; ya existe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente Supabase | Pública; ya existe |
| `SUPABASE_SECRET_KEY` | Admin API y RPC de servidor | Solo servidor; nueva |
| `RESEND_API_KEY` | SDK de Resend | Solo servidor; ya existe con nombre incorrecto en `.env` |
| `RESEND_FROM_EMAIL` | Remitente del correo | Solo servidor; nueva |
| `APP_URL` | Base absoluta del enlace del correo | Solo servidor; nueva, con fallback al origen de la petición en desarrollo |

`SUPABASE_SECRET_KEY` nunca se expone con prefijo `NEXT_PUBLIC_`, nunca se importa desde un componente cliente y no se registra en logs ni capturas.

### Estados de la interfaz

- **Modal de vinculación:** al abrir genera un código y limpia el estado anterior; al enviar muestra el botón pendiente; si falla, conserva los datos y muestra el error con `role="alert"`; si acierta, muestra `Invitación enviada` con el código final y un botón `Listo`.
- **Perfil del niño:** la sección de padres se renderiza en el servidor con invitaciones pendientes y vínculos activos; no hay estado de carga en el cliente.
- **Activación:** código válido muestra el niño y la sala; código inválido, vencido o usado muestra un error y no crea nada; una activación correcta inicia sesión y redirige a `/`.
- **Consentimiento:** el modal de `Editar` muestra el valor actual, guarda con un botón y conserva el modal si falla.

## Plan de implementación

1. Instalar `resend` con npm y actualizar `package-lock.json`. Agregar `SUPABASE_SECRET_KEY`, `RESEND_FROM_EMAIL` y `APP_URL` a `.env-template` sin valores reales. Corregir el nombre `RESEND_API_KEY ` en `.env`. Comprobación manual: `npm run build` sigue pasando y `.env` continúa ignorado por Git.
2. Crear con la CLI la migración de enums y tablas: `relationship_type`, `invitation_status`, `invitations`, `parent_children`, claves foráneas, `CHECK`, `UNIQUE`, índices y `RLS` activo. Revisar el SQL sin aplicarlo. Comprobación manual: el archivo es el único cambio de base y la aplicación sigue funcionando.
3. Crear con la CLI la segunda migración: funciones auxiliares, políticas nuevas, `accept_invitation`, `email_has_account`, reemplazo de la política de lectura de `children`, política de `UPDATE` y `GRANT UPDATE (photo_consent)`, y política de lectura de `users`. Aplicar ambas migraciones al proyecto remoto después de verificar destino e historial. Comprobación manual: las tablas, políticas y funciones existen; `anon` no accede; las funciones de servidor no son ejecutables por `authenticated`.
4. Verificar la seguridad en una transacción revertida con `SET LOCAL ROLE authenticated` y claims simulados: staff ve sus niños, padre vinculado ve solo el suyo, padre ajeno no ve nada, `INSERT` de invitación funciona para staff y falla para `parent`, y `UPDATE` de una columna distinta de `photo_consent` falla. Comprobación manual: no quedan filas de prueba.
5. Crear `utils/supabase/admin.ts` con `import "server-only"` y un cliente que use `SUPABASE_SECRET_KEY`, sin persistencia de sesión. Comprobación manual: `npx tsc --noEmit` pasa y ningún componente cliente lo importa.
6. Agregar `role` a `UserProfile` y a `getCurrentProfile`; agregar `photoConsent` a `Kid`, a `KID_COLUMNS` y a `getKidById`. Comprobación manual: el shell sigue mostrando nombre y rol, y el perfil recibe el booleano.
7. Crear `utils/invitations/types.ts` con los tipos, el catálogo de parentescos y las etiquetas. Crear `utils/invitations/queries.ts` con `getKidParents(childId)` y `getInvitationSummary(code)`. La primera usa el cliente servidor y devuelve pendientes y activos; la segunda usa el cliente admin, filtra `pending`, `expires_at > now()` y devuelve solo el resumen mínimo. Comprobación manual: `npx tsc --noEmit` y una consulta con un código real.
8. Crear `utils/email/send-invitation.ts` con el cliente de Resend, la plantilla HTML y texto, el escape de valores y el `idempotencyKey`. Comprobación manual: una comprobación local de la plantilla contiene el código, el nombre del niño y el enlace absoluto, sin enviar correo.
9. Crear `app/actions/invitations.ts` con `createInvitation`: validar sesión, rol, nombre, email, parentesco y formato del código; limpiar invitaciones vencidas del mismo niño y email; bloquear duplicados pendientes y cuentas existentes con `email_has_account`; insertar con `invited_by`; reintentar el código ante colisión; enviar con Resend; marcar `cancelled` si el envío falla; devolver `sent` con el código final. Comprobación manual: un envío inválido no crea filas; uno válido deja una invitación pendiente con vencimiento a siete días y un `id` de Resend.
10. Actualizar `app/kids/[id]/page.tsx` para cargar el niño y sus padres, y pasar ambos a `KidProfile`. En `app/kids/[id]/kid-profile.tsx`, reemplazar `useKids()` por props, renderizar `pending` y `active`, y quitar el overlay. Eliminar `app/components/kids-provider.tsx` y su uso en `app/layout.tsx`. Comprobación manual: tras recargar, la invitación pendiente sigue visible.
11. Reescribir `app/kids/LinkParentModal.tsx` con `useActionState(createInvitation)`, código generado al abrir, campo oculto `code`, errores inline, error de formulario con `role="alert"`, botón pendiente y estado de éxito con el código final. Recibir `childId` y `childName`; ocultar el botón para usuarios `parent`; refrescar la ruta al cerrar un envío exitoso. Comprobación manual: el flujo completo desde el perfil envía una invitación y la fila aparece como `PENDIENTE`.
12. Convertir `app/(auth)/activar-cuenta/page.tsx` en server component que lee `searchParams`, obtiene el resumen con el código y renderiza `activate-form.tsx` como cliente. La tarjeta muestra el nombre del niño y la sala; el formulario conserva el diseño de SPEC 03, precarga el código, exige email y contraseña de al menos 8 caracteres y elimina el checkbox de fotos. Comprobación manual: el enlace del correo abre la pantalla con el código cargado.
13. Crear `activateInvitation` en `app/actions/invitations.ts`: validar código, email y contraseña; buscar la invitación pendiente y vigente; comparar el email; crear el usuario con `auth.admin.createUser({ email_confirm: true })`; llamar `accept_invitation`; si el vínculo falla, borrar el usuario recién creado; iniciar sesión con `signInWithPassword`; revalidar y redirigir a `/`. Mapear errores de Supabase a mensajes en español. Comprobación manual: una activación válida crea `auth.users`, `public.users`, `parent_children` y deja la invitación `accepted`.
14. Ajustar `/kids` y `/kids/[id]` para padres: ocultar `Agregar niño` y `Vincular otro padre` usando `useUser().role`, y confirmar que las consultas solo devuelven los niños vinculados. Comprobación manual: un padre no ve niños ajenos y un intento directo por URL devuelve 404.
15. Crear `app/kids/EditPhotoConsentModal.tsx` y `updatePhotoConsent` en `app/actions/kids.ts`: validar sesión, UUID y booleano; actualizar solo `photo_consent`; revalidar el perfil; mostrar el resultado y el error dentro del modal. Reemplazar el enlace `Editar` del perfil por el disparador del modal. Comprobación manual: el cambio persiste tras recargar y otro tutor lo ve.
16. Ejecutar `npm run build`, `npx tsc --noEmit` y Playwright MCP en escritorio y `390 × 844`: invitar, verificar el correo aceptado por Resend, activar con el código, autologin, visibilidad del padre, consentimiento, cierre de sesión y regreso como staff. Guardar capturas y logs solo en `.playwright-mcp/`. Limpiar la cuenta, el vínculo y las invitaciones de prueba al terminar.

## Criterios de aceptación

**Base de datos**

- [X] Existen migraciones creadas con la CLI y aplicadas en remoto; no se ejecutó DDL fuera de ese flujo.
- [X] `public.relationship_type` contiene exactamente `father`, `mother` y `guardian`.
- [X] `public.invitation_status` contiene exactamente `pending`, `accepted`, `expired` y `cancelled`.
- [X] `public.invitations` tiene las once columnas del modelo, con `status` por defecto `pending` y `accepted_at` nullable.
- [X] `invitations.code` rechaza valores que no cumplan `^[A-Z2-9]{5}$`.
- [X] `invitations.email` rechaza valores con mayúsculas y espacios al inicio o al final.
- [X] No se pueden insertar dos invitaciones `pending` para el mismo `child_id` y email.
- [X] `public.parent_children` tiene las cinco columnas del modelo y `UNIQUE (parent_id, child_id)`.
- [X] Al borrar un niño se borran sus invitaciones y vínculos; al borrar un padre se borran sus vínculos.
- [X] RLS está activo en `invitations` y `parent_children`; `anon` no puede leer ni escribir ninguna de las dos.
- [X] Un `staff` o `admin` de la guardería puede insertar una invitación para un niño de su guardería; un `parent` no puede.
- [X] Un `staff` o `admin` de otra guardería no puede leer ni insertar invitaciones de este niño.
- [X] Un padre vinculado solo lee sus filas de `parent_children`; un staff lee las de los niños de su guardería.
- [X] `children` ya no es legible por cualquier usuario autenticado: un padre solo ve sus niños vinculados.
- [X] Un padre no vinculado recibe 404 al abrir `/kids/<uuid>` de otro niño.
- [X] Solo se puede actualizar `children.photo_consent`; un `UPDATE` sobre otra columna es rechazado para `authenticated`.
- [X] Un padre vinculado y un staff/admin de la guardería pueden actualizar `photo_consent`; un padre no vinculado no puede.
- [X] `accept_invitation` y `email_has_account` solo son ejecutables por `service_role`.
- [X] `accept_invitation` inserta `users`, inserta `parent_children` y marca la invitación `accepted` en una sola transacción.
- [X] `accept_invitation` rechaza una invitación vencida, usada o con email distinto al de la cuenta.
- [X] Las pruebas de escritura se revierten y no quedan filas de prueba en la base.

**Invitación desde el perfil**

- [X] El modal abre con un código de exactamente cinco caracteres del alfabeto permitido.
- [X] El código cambia entre aperturas del modal.
- [X] Un nombre vacío, un email inválido o un parentesco vacío muestran error inline y no envían.
- [X] Un envío válido crea una sola invitación `pending` con el email en minúsculas, el parentesco correcto y `expires_at` a siete días.
- [X] La invitación guarda `invited_by` con el UUID del usuario que la creó.
- [X] Resend acepta el envío y devuelve un `id`; con `onboarding@resend.dev` el único destinatario verificable es el email dueño de la cuenta Resend.
- [X] El HTML y el texto del correo contienen el código, el nombre del niño y el enlace absoluto a `/activar-cuenta?code=...`.
- [X] El modal muestra el código final y el resultado del envío antes de cerrarse.
- [X] Al cerrar el modal después de un envío exitoso, la invitación aparece en el perfil como `PENDIENTE`.
- [X] Recargar el perfil o abrirlo en otra sesión mantiene la invitación pendiente.
- [X] Invitar dos veces al mismo email y niño muestra un error y no crea una segunda invitación pendiente.
- [X] Invitar un email que ya tiene cuenta muestra un error y no envía correo.
- [X] Si Resend falla, no queda una invitación pendiente, el modal conserva los datos y muestra un error con `role="alert"`.
- [X] Un intento con un código manipulado fuera del formato se rechaza sin crear filas.
- [X] El estado `sent` muestra el código definitivo aunque el servidor haya tenido que regenerarlo por colisión.
- [X] La sección de padres ya no usa `KidsProvider` ni datos en memoria.

**Activación y registro**

- [X] El enlace del correo abre `/activar-cuenta` con el código precargado.
- [X] La pantalla muestra el nombre del niño, la sala y la guardería de la invitación válida.
- [X] Un código inexistente, vencido o con formato inválido muestra un error y no crea usuarios.
- [X] Un código ya aceptado muestra un error de invitación usada y no crea usuarios.
- [X] Un email distinto al de la invitación muestra un error y no crea usuarios.
- [X] Una contraseña de menos de 8 caracteres muestra un error y no crea usuarios.
- [X] `/activar-cuenta` ya no muestra el checkbox de consentimiento de fotos.
- [X] Una activación válida crea exactamente un usuario en `auth.users` con email confirmado.
- [X] La activación crea un perfil en `public.users` con `role = parent`, `status = active`, `full_name` de la invitación y `daycare_id` de la guardería del niño.
- [X] La activación crea exactamente una fila en `parent_children` con el niño y el parentesco de la invitación.
- [X] La invitación queda `accepted` con `accepted_at` no nulo.
- [X] Después de activar, la sesión se crea automáticamente y la aplicación redirige a `/`.
- [X] El shell muestra el nombre del padre y el subtítulo `Familia`.
- [X] Recargar después de activar mantiene la sesión.
- [X] Si el vínculo falla después de crear el usuario de Auth, no queda un usuario huérfano en `auth.users`.
- [X] Reutilizar el enlace después de aceptar la invitación no crea una segunda cuenta ni un segundo vínculo.
- [X] Ninguna clave `service_role` ni `SUPABASE_SECRET_KEY` aparece en código cliente, logs o capturas.

**Visibilidad del padre y consentimiento**

- [X] Un padre ve en `/kids` solo los niños vinculados a su cuenta.
- [X] Un padre no ve el botón `Agregar niño` ni `Vincular otro padre`.
- [X] Un staff sigue viendo todos los niños de su guardería y puede invitar.
- [X] El botón `Editar` abre un modal con el estado actual de `photo_consent`.
- [X] Guardar el modal actualiza `photo_consent`, cierra el modal y el nuevo estado persiste tras recargar.
- [X] Otro tutor del mismo niño ve el valor actualizado.
- [X] Si la actualización falla, el modal permanece abierto y muestra el error.
- [X] Los usuarios de otra guardería no pueden leer ni actualizar el consentimiento.

**Verificación general**

- [X] `npm run build` finaliza correctamente desde la raíz del proyecto.
- [X] `npx tsc --noEmit` finaliza correctamente.
- [X] Playwright MCP verifica en escritorio y `390 × 844` el envío, la activación, el autologin, la visibilidad del padre y el consentimiento.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.
- [X] No hay desbordamiento horizontal en `390 × 844`.
- [X] Los artefactos de Playwright se guardan exclusivamente en `.playwright-mcp/`.
- [X] La cuenta de prueba, sus vínculos y sus invitaciones se eliminan al terminar la verificación.

## Decisiones tomadas y descartadas

- **Sí:** Crear la cuenta con `auth.admin.createUser` y `email_confirm: true`. La invitación ya demuestra que el email es correcto, evita un segundo correo y no depende de la configuración de confirmación del proyecto.
- **No:** Usar `signUp` con la clave publicable. Obligaría a un segundo correo de confirmación o a desactivar la confirmación global del proyecto.
- **Sí:** Guardar `SUPABASE_SECRET_KEY` solo en el servidor y usar un módulo `server-only`. Es la única forma de crear usuarios y ejecutar el vínculo atómico sin exponer privilegios.
- **No:** Crear un trigger en `auth.users` que lea `raw_user_meta_data`. Sería otra superficie de escalada de privilegios si el signup público está habilitado.
- **Sí:** Separar `invitations` de `parent_children`. La invitación es un acto administrativo con vencimiento; el vínculo es la relación permanente.
- **Sí:** Guardar el parentesco en inglés (`father`, `mother`, `guardian`) y traducirlo en la UI. Cumple la convención del esquema.
- **Sí:** Generar el código al abrir el modal y validarlo en el servidor. Mantiene la composición de la referencia y el código visible de inmediato.
- **Sí:** Reintentar con un código nuevo si hay colisión. El código es único entre invitaciones pendientes y aceptadas.
- **Sí:** Código de cinco caracteres y vencimiento de siete días. Coincide con la referencia y con el esquema.
- **Sí:** Bloquear duplicados pendientes y emails con cuenta. Evita correos confusos y vínculos ambiguos.
- **No:** Reutilizar una cuenta existente o reemplazar la invitación anterior. Agrega casos de soporte y expone si un email está registrado.
- **Sí:** Marcar la invitación como `cancelled` si Resend falla. No deja invitaciones que nunca llegaron.
- **Sí:** Usar `idempotencyKey` de Resend por niño y código. Protege contra reintentos y correos duplicados.
- **Sí:** Enviar HTML propio con estilos inline y texto plano. Evita una dependencia de React Email para un solo correo.
- **Sí:** Iniciar sesión automáticamente después de activar. El usuario acaba de demostrar el código y la contraseña; pedirle un login extra no aporta seguridad.
- **Sí:** Autologin con el cliente servidor y `redirect("/")` fuera del `try`. Sigue el patrón de SPEC 11.
- **Sí:** Compensar con `admin.deleteUser` si falla `accept_invitation`. Evita usuarios de Auth sin perfil.
- **Sí:** Restringir `children` a padres vinculados. Es la consecuencia directa de crear cuentas de padres y de la promesa «solo verá el feed de su hijo».
- **No:** Implementar el feed filtrado. El feed todavía no está en Supabase y merece su propia spec.
- **Sí:** Ocultar `Agregar niño` y `Vincular otro padre` a los padres. La UI no debe ofrecer acciones que RLS va a rechazar.
- **Sí:** Quitar el checkbox de consentimiento de `/activar-cuenta`. El usuario lo pidió y el consentimiento se edita desde el perfil del niño.
- **Sí:** Editar `photo_consent` desde un modal en el perfil. Reutiliza el disparador `Editar` existente sin inventar una pantalla nueva.
- **Sí:** Último cambio gana en `photo_consent`. Es un booleano por niño; una tabla por tutor queda para otra spec.
- **Sí:** Mantener `expired` como estado administrativo, sin cron. La UI y la activación comparan `expires_at` con la fecha actual.
- **No:** Reenvío, cancelación o gestión de invitaciones desde la app. No están en el objetivo y necesitan su propio flujo.
- **Sí:** Usar `RESEND_FROM_EMAIL` y `APP_URL` como variables. Evita fijar el remitente y el host en el código.
- **Sí:** Aplicar las migraciones directamente en remoto después de revisar destino e historial, como SPEC 12.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La cuenta de Resend no tiene un dominio verificado; `onboarding@resend.dev` solo entrega al email dueño de la cuenta. | Documentarlo, usar `onboarding@resend.dev` en pruebas y cambiar `RESEND_FROM_EMAIL` cuando se verifique un dominio. |
| `SUPABASE_SECRET_KEY` se filtra al cliente o a un log. | Módulo `server-only`, variable sin prefijo público, revisión de imports y de capturas. |
| Un código de cinco caracteres se puede adivinar por fuerza bruta. | Exigir email coincidente, invitación pendiente y vencimiento; aceptar la ausencia de rate limit como deuda documentada. |
| Las políticas de `children`, `users` y `parent_children` se referencian entre sí y provocan recursión de RLS. | Usar funciones `SECURITY DEFINER` que lean las tablas sin RLS y probar cada rol en una transacción revertida. |
| El cambio de política deja a los staff sin ver niños o a los padres viendo niños ajenos. | Verificar ambos roles con claims simulados y con Playwright antes de cerrar la spec. |
| `createUser` funciona pero `accept_invitation` falla y queda un usuario huérfano. | Borrar el usuario con `admin.deleteUser` en el manejo del error y verificar que no queda fila en `public.users`. |
| Una invitación pendiente vencida bloquea una nueva invitación. | Marcar como `expired` las pendientes vencidas del mismo niño y email antes de insertar. |
| Un correo se envía dos veces por un reintento. | `idempotencyKey` por niño y código; misma carga útil en el reintento. |
| El HTML del correo se rompe por nombres con caracteres especiales. | Escapar todos los valores interpolados y probar con un nombre con `&`, `<` y comillas. |
| El enlace del correo apunta a `localhost` en producción. | `APP_URL` obligatoria en producción; fallback al origen solo en desarrollo. |
| `.env` tiene `RESEND_API_KEY ` con espacio final y la variable no se lee. | Corregir el nombre en `.env` y documentarlo en `.env-template`. |
| Supabase limita los `createUser` o los intentos de login durante Playwright. | Limitar las ejecuciones, esperar entre intentos y no repetir el flujo en bucle. |
| El email de Auth se normaliza distinto al de la invitación. | Comparar ambos en minúsculas y guardar la invitación ya normalizada. |
| La prueba deja una cuenta real de padre, un vínculo o una invitación. | Borrar el usuario de Auth al final; el borrado en cascada elimina perfil y vínculo; borrar la invitación. |
| El modal reutiliza el estado de `useActionState` al volver a abrirse. | Remontar el formulario al abrir y reiniciar código y errores. |

## Lo que **no** está incluido en esta spec

- Verificación de un dominio de Resend o configuración de DNS.
- Reenvío, cancelación, edición o listado global de invitaciones.
- Recuperación de contraseña, cambio de email o edición del perfil del padre.
- Doble confirmación de email o magic links.
- Invitaciones creadas por padres o desde la lista `/kids`.
- Edición de datos del niño distintos de `photo_consent`.
- Consentimiento por padre o historial de consentimiento.
- Feed filtrado por niño, publicaciones persistentes o privacidad del feed.
- Gestión de usuarios o roles desde la aplicación.
- Notificaciones por email posteriores a la invitación.
- Rate limiting o captcha en la activación.
- Suite de pruebas permanente en el repositorio.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
