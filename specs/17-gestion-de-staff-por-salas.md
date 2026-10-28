# SPEC 17 — Alta de personal y acceso por salas

> **Estado:** Aprobado
> **Depende de:** SPEC 09, SPEC 10, SPEC 11, SPEC 12, SPEC 13, SPEC 14, SPEC 15
> **Fecha:** 2026-10-27
> **Objetivo:** Permitir al administrador invitar y asignar personal a varias salas de su guardería, con acceso operativo limitado a las salas asignadas.

## Por qué existe esta spec

Actualmente `staff` pertenece a una guardería, pero no tiene relación con salas. Sus permisos de lectura y escritura abarcan toda la guardería. Una asignación visible solo en la interfaz no impediría acceder a otras salas mediante la API. Ya existe una cuenta con rol `admin` en la base real; esta spec no crea ni promueve administradores.

## Alcance

**Incluye:**

- Crear la sección `/personal`, visible y accesible solo al `admin` de la propia guardería, con lista de miembros activos e invitaciones pendientes o vencidas, salas asignadas y formulario de alta.
- Invitar por email a una persona nueva como `staff`, con nombre, email y cero o más salas de la guardería; código de cinco caracteres válido durante siete días.
- Usar `/activar-cuenta` para que la persona invitada confirme email y código, defina contraseña, cree su cuenta y entre a la aplicación.
- Rechazar emails que ya tengan cuenta en Auth o invitación de staff pendiente y vigente; permitir una invitación nueva después de vencer la anterior.
- Editar las salas tanto de invitaciones pendientes como de miembros activos; la lista de salas elegibles procede únicamente de la guardería del administrador.
- Migrar al staff existente asignándole todas las salas que existan en su guardería al momento de la migración; sin excepción permanente para ese usuario.
- Restringir en la base las lecturas y escrituras de `staff` sobre salas, niños, invitaciones de padres, publicaciones, destinatarios y fotos a sus salas actuales. Conservar a `admin` acceso a toda su propia guardería y a `parent` sus reglas vigentes.
- Permitir al `staff` ver y publicar contenido de sala solo en salas asignadas, y entradas individuales solo si **todos** los niños destinatarios pertenecen a salas asignadas. No permitirle ver ni crear anuncios generales de guardería.
- Permitir cero salas: el miembro puede iniciar sesión, abrir `Mi cuenta` y cerrar sesión, pero se le redirige desde las pantallas operativas a `/cuenta`.
- Reflejar las reasignaciones en nuevas consultas y operaciones inmediatamente, incluso para publicaciones antiguas de una sala retirada.
- Conservar publicadas las entradas que el miembro creó antes de perder una sala, con su autoría y audiencia originales; la reasignación no elimina ni modifica publicaciones históricas.
- Validar aislamiento entre roles, guarderías y salas mediante pruebas con transacciones revertidas, además de TypeScript, lint, build y Playwright en escritorio y móvil.

**Fuera de alcance (para futuras specs):**

- Crear o promover administradores, gestionar personal de otras guarderías o permitir varias guarderías por cuenta.
- Desactivar, eliminar o modificar nombre/email/rol de otros miembros desde `/personal`.
- Reenviar o cancelar invitaciones de staff desde la UI; una invitación vencida admite una nueva alta con otro código.
- Crear salas desde esta sección o asignar automáticamente salas futuras al staff existente.
- Cambiar los permisos de los padres, su flujo de invitación o sus códigos ya emitidos.
- Revocar antes de su caducidad las URL firmadas de fotos emitidas antes de una reasignación.

## Modelo de datos

### Tablas y vínculos

- `public.staff_rooms`: `staff_id uuid NOT NULL` referencia `public.users(id)` con borrado en cascada; `room_id uuid NOT NULL` referencia `public.rooms(id)` con borrado restringido; `created_at timestamptz NOT NULL DEFAULT now()`; PK `(staff_id, room_id)` e índice por `room_id`. Solo admite un perfil con `role = 'staff'` y una sala de su misma `daycare_id`; la comprobación vive también en la base, no solo en la Server Action.
- `public.staff_invitations`: `id uuid` PK con `DEFAULT gen_random_uuid()`; `daycare_id uuid NOT NULL` referencia `daycares(id)`; `invited_by uuid NOT NULL` referencia `users(id)`; `full_name text NOT NULL` no vacío; `email text NOT NULL` normalizado a minúsculas; `code text NOT NULL`; `status public.invitation_status NOT NULL DEFAULT 'pending'`; `expires_at timestamptz NOT NULL`; `accepted_at timestamptz NULL`; `created_at timestamptz NOT NULL DEFAULT now()`. Índice único parcial de `code` para invitaciones pendientes o aceptadas, índice único parcial de `lower(email)` para pendientes vigentes gestionadas mediante transición explícita a `expired`, e índices de consulta por `daycare_id`, `status` y `email`.
- `public.staff_invitation_rooms`: `invitation_id uuid NOT NULL` referencia `staff_invitations(id)` con borrado en cascada; `room_id uuid NOT NULL` referencia `rooms(id)` con borrado restringido; PK `(invitation_id, room_id)` e índice por `room_id`. Cada sala debe pertenecer al `daycare_id` de la invitación.
- Los tres conjuntos de asignaciones admiten cero salas. La UI muestra `Sin salas asignadas`. Una reasignación reemplaza el conjunto completo en una única transacción; nunca deja un estado parcialmente actualizado.
- Los códigos de staff usan exactamente cinco caracteres: primer carácter `0` o `1`, más cuatro caracteres del alfabeto actual `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Los códigos existentes de padres usan exclusivamente `^[A-Z2-9]{5}$`; ambos espacios son disjuntos y `/activar-cuenta` identifica el tipo por el primer carácter sin cambiar códigos anteriores. Una colisión dentro de las invitaciones vigentes de staff obliga a generar otro código.

### Acceso y activación

- Activar RLS en las tres tablas nuevas y conceder privilegios mínimos. `anon` y `parent` no pueden leer ni escribir invitaciones o asignaciones de staff. `admin` lee y administra exclusivamente invitaciones y asignaciones de su guardería mediante una operación autenticada que verifica `auth.uid()`, `role = 'admin'`, `status = 'active'` y `daycare_id`; un `staff` solo puede leer sus propias asignaciones si la aplicación las necesita para mostrar su estado. No conceder `INSERT` ni `UPDATE` directo de perfiles, roles o guarderías a clientes.
- El alta guarda invitación y salas antes de enviar el email con código y enlace `/activar-cuenta?code=...`. Si falla el envío, no queda invitación pendiente utilizable; se muestra error y el administrador puede intentarlo de nuevo. No exponer la clave secreta de Supabase ni la de Resend al cliente.
- La activación de staff valida código pendiente no vencido, email coincidente y contraseña válida; crea la cuenta en Auth con email confirmado y completa en una operación transaccional privilegiada el perfil `public.users` (`role = 'staff'`, `status = 'active'`, guardería y nombre de la invitación), las filas de `staff_rooms` copiadas de la asignación **vigente** y la aceptación de la invitación. Si falla después de crear Auth, borrar la cuenta recién creada; no dejar cuentas sin perfil ni invitaciones aceptadas sin cuenta. Iniciar sesión y dirigir a `/` si tiene salas, o a `/cuenta` si no tiene ninguna. Código usado, vencido o email distinto no crean cuenta.
- Una invitación vencida pasa a `expired` antes de admitir otra para el mismo email. La invitación anterior no se reactiva. Una invitación pendiente puede cambiar de salas; la activación usa la última asignación guardada.
- La migración de seguridad primero crea y rellena `staff_rooms` para el staff existente con todas las salas actuales de cada guardería; después cambia las políticas y funciones. La asignación no se extiende a salas creadas en el futuro.
- Revisar todas las vías existentes que autorizan por `role IN ('staff', 'admin')` o por guardería: `rooms`, `children`, `invitations`, `parent_children`, `users`, `posts`, `post_children`, `post_photos` y Storage `post-photos`; también las funciones `is_daycare_staff`, `is_child_daycare_staff`, `is_staff`, `can_read_post`, `can_read_photo` y los controles de edición de niños. Para `staff`, lectura y escritura de un niño dependen de su sala **actual**; las invitaciones de padres siguen ese mismo límite. `admin` conserva acceso a toda su guardería. Las políticas deben impedir acceso directo a la API aunque la UI esconda la acción.
- Un post con `room_id` no nulo se autoriza al staff solo si esa sala está asignada. Un post individual con `room_id` nulo se autoriza solo cuando tiene destinatarios y **todos** pertenecen actualmente a salas asignadas; un anuncio general con `room_id` nulo no se autoriza al staff. Impedir que añada después un destinatario ajeno a un post accesible y que adjunte fotos a publicaciones ajenas. La creación de post y sus destinatarios no debe dejar un post individual huérfano o visible indebidamente si falla un paso.
- Retirar una sala cambia el acceso del autor, no el estado de sus publicaciones: `posts.author_id`, `room_id`, destinatarios, fotos y fecha permanecen intactos. El admin, los padres autorizados y el personal actualmente asignado siguen viendo esas entradas según las reglas de audiencia; el autor que perdió la sala ya no puede consultarlas ni modificarlas por el solo hecho de ser su autor.
- RLS y Storage niegan nuevas lecturas o nuevas firmas de fotos para contenido retirado. Las URL firmadas emitidas antes del cambio conservan el TTL actual de 3600 segundos; no se promete su revocación instantánea.

### Contratos de aplicación

- Crear `utils/staff/types.ts` y `utils/staff/queries.ts` para el listado y el resumen de invitación; `app/actions/staff.ts` recibe nombre, email y conjunto de UUID de salas para alta o reemplazo de asignaciones. El servidor rechaza duplicados, UUID inexistentes, salas ajenas, rol no admin y sesiones expiradas, aun si se envían datos manipulados.
- `/personal` muestra `Sin personal` si no hay miembros ni invitaciones, `Sin salas asignadas` cuando corresponde, estados `Pendiente`, `Vencida` y `Activo`, confirmación de alta y reasignación, estado de envío y errores accesibles sin borrar los datos escritos. El formulario permite selección múltiple, incluida selección vacía.
- `app/components/app-shell.tsx` incluye navegación `Personal` solo para `admin`. La página y las Server Actions vuelven a autorizar el rol; ocultar el enlace no es una protección.
- `/activar-cuenta` muestra datos de guardería y salas, no datos de niños, cuando el código es de staff. El flujo existente de padres sigue presentando el niño y el parentesco sin cambios de permisos.
- Las consultas y formularios de `app/kids/`, `app/feed/`, `app/page.tsx` y sus acciones consumen solo salas y niños autorizados; el padre conserva `/resumen` y el administrador conserva alcance completo. Un `staff` sin salas que intente abrir `/`, `/kids` o `/kids/[id]` termina en `/cuenta`; una Server Action llamada directamente también es rechazada.

## Plan de implementación

1. Inspeccionar el proyecto Supabase real, su historial, políticas, Storage y cuenta `admin` ya existente; confirmar destino, permisos efectivos y staff previo antes de preparar migraciones. Comprobación manual: la guardería y el administrador de prueba están identificados sin escribir en remoto.
2. Crear con la CLI una migración versionada de las tres tablas, índices, restricciones, RLS y operaciones controladas de invitación/reasignación/activación. Añadir el backfill de **todas las salas actuales** para cada staff existente. Comprobación manual: las filas históricas de padres y niños permanecen intactas y ningún staff previo pierde acceso al aplicar el backfill.
3. Crear con la CLI la migración versionada de endurecimiento de políticas, funciones y Storage; aplicar juntas la preparación y las restricciones sin exponer temporalmente a nuevos miembros el acceso a toda la guardería. Probar localmente si está disponible; revisar destino e historial, mostrar `supabase db push --dry-run` y solicitar aprobación explícita antes del remoto. Comprobación manual: admin mantiene acceso global a su guardería, staff previo conserva solo las salas migradas y `parent` conserva sus permisos.
4. Verificar las migraciones con transacciones revertidas y identidades de dos guarderías: altas y reasignaciones de admin, cero y varias salas, acceso a niños e invitaciones, posts por sala e individuales, anuncios generales, fotos y peticiones directas a funciones/API/Storage. Comprobación manual: staff no atraviesa otra sala y no quedan datos de prueba.
5. Crear `utils/staff/types.ts`, `utils/staff/queries.ts` y `app/actions/staff.ts` para listar, crear invitaciones y reemplazar salas de un miembro o invitación pendiente. Conectar el envío a una plantilla de staff en `utils/email/`; conservar `app/actions/invitations.ts` para el flujo de padres. Comprobación manual: errores de sesión, email, salas y Resend no dejan una invitación pendiente inválida.
6. Crear `app/personal/page.tsx` y componentes de listado/formularios en `app/personal/`; agregar la navegación exclusiva de admin en `app/components/app-shell.tsx`. Comprobación manual: un admin ve solo su equipo, edita salas y un padre o staff no acceden ni por URL directa.
7. Adaptar `utils/invitations/queries.ts`, `utils/invitations/types.ts`, `app/(auth)/activar-cuenta/page.tsx` y `activate-form.tsx` para distinguir códigos de padre y staff. Implementar la activación de staff en `app/actions/staff.ts` con compensación ante fallos y autologin; mantener el flujo de padres. Comprobación manual: una invitación pendiente activa una única cuenta y una invitación usada o vencida no la duplica.
8. Adaptar `utils/auth/guards.ts`, consultas y formularios de `app/kids/`, `app/feed/` y `app/page.tsx` para reflejar salas permitidas y redirigir staff sin salas a `/cuenta`; conservar autorización en las Server Actions y la base. Comprobación manual: quitar una sala elimina inmediatamente niños y posts de nuevas consultas y bloquea nuevas escrituras, también con IDs manipulados.
9. Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; verificar el flujo admin → email → activación → publicación/lectura → reasignación con Playwright en escritorio y `390 × 844`. Guardar artefactos solo en `.playwright-mcp/` y retirar las cuentas de prueba controladas sin tocar cuentas reales.

## Criterios de aceptación

**Persistencia y seguridad**

- [ ] Existen migraciones nuevas creadas con la CLI; se verificaron destino, historial y `supabase db push --dry-run`, y se pidió aprobación explícita antes de aplicarlas al remoto.
- [ ] `staff_rooms`, `staff_invitations` y `staff_invitation_rooms` tienen las restricciones, índices y RLS descritos; una sala ajena no puede vincularse a un miembro o invitación.
- [ ] El staff ya existente obtiene exactamente las salas existentes de su guardería al migrar; una sala creada después no se asigna automáticamente.
- [ ] Solo un admin activo administra miembros e invitaciones de su guardería; otro admin, staff, padre y `anon` no pueden alterarlos mediante petición directa.
- [ ] Una reasignación de varias salas o de cero salas es atómica; no deja asignaciones parciales tras un fallo.
- [ ] El staff solo lee salas y niños asignados y solo crea o edita niños e invita padres en sus salas; enviar UUID de otra sala a una Server Action o a la API falla.
- [ ] El staff solo lee y crea posts de sus salas o posts individuales con todos sus destinatarios en salas asignadas; no puede leer ni publicar anuncios generales ni añadir niños o fotos ajenos.
- [ ] Admin conserva acceso a todas las salas de su guardería y los padres conservan la visibilidad de sus niños, posts, resúmenes y fotos.
- [ ] Al retirar una sala, nuevas lecturas, escrituras y firmas de fotos dejan de autorizarla, incluidas publicaciones anteriores; enlaces de fotos firmados previamente pueden seguir válidos hasta 3600 segundos.
- [ ] Al retirar una sala, las publicaciones anteriores del staff permanecen publicadas, conservan su autoría y siguen visibles para el admin, los padres autorizados y el staff actualmente asignado; el antiguo autor pierde acceso a ellas si ya no tiene la sala.
- [ ] Pruebas de roles y guarderías se revierten y no dejan datos de prueba.

**Alta y activación**

- [ ] `/personal` lista miembros activos e invitaciones pendientes/vencidas de la propia guardería y permite crear y reasignar con cero o varias salas.
- [ ] Solo el admin ve la navegación `Personal`; staff y padres no acceden a `/personal` por URL directa ni mediante acciones manipuladas.
- [ ] Nombre vacío, email inválido, email con cuenta, invitación pendiente vigente y salas ajenas se rechazan sin enviar un correo utilizable.
- [ ] Una invitación válida guarda email normalizado, salas, admin invitador, código de cinco caracteres que empieza por `0` o `1` y vencimiento a siete días; al activarla se crea un perfil `staff`, y el email contiene el código y enlace a `/activar-cuenta`.
- [ ] Un fallo de Resend no deja invitación pendiente activa y muestra error sin perder el formulario.
- [ ] Una invitación vencida no se puede activar; el admin puede crear otra para ese email y la anterior permanece vencida.
- [ ] Reasignar salas a una invitación pendiente cambia las salas que recibirá el miembro al activar.
- [ ] Activar con código y email correctos crea una sola cuenta Auth, perfil `staff` y asignaciones vigentes; iniciar sesión redirige a `/` con salas o a `/cuenta` sin salas.
- [ ] Email distinto, código usado o vencido, o fallo durante el vínculo no dejan cuentas Auth huérfanas ni perfiles parcialmente creados.
- [ ] Una invitación de padre ya existente sigue activándose en la misma página sin pasar a `staff` ni alterar el vínculo con su hijo.
- [ ] Un staff sin salas solo puede usar `Mi cuenta` y cerrar sesión; `/`, `/kids`, `/kids/[id]` y escrituras directas no le dan acceso operativo.

**Verificación general**

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` finalizan correctamente.
- [ ] Playwright comprueba alta, activación, varias salas, reasignación y cero salas en escritorio y `390 × 844`, sin errores de aplicación ni desbordamiento horizontal; sus artefactos quedan solo en `.playwright-mcp/`.

## Decisiones tomadas y descartadas

- **Sí:** Una sola spec para alta, asignación y aislamiento real; no dejar un intervalo en el que un nuevo staff acceda a toda la guardería.
- **Sí:** Varios vínculos por persona y cero salas posibles; sin salas, únicamente `Mi cuenta` y salida.
- **Sí:** Invitar por correo y dejar que el usuario cree su contraseña; no entregar credenciales creadas por el admin.
- **Sí:** Reutilizar `/activar-cuenta`, con códigos de staff que empiezan por `0` o `1`; los códigos de padres mantienen su formato y no colisionan.
- **Sí:** Reasignación tanto de invitaciones pendientes como de cuentas activas; su efecto sobre permisos existentes es inmediato para nuevas solicitudes.
- **Sí:** La reasignación revoca acceso, no contenido: las publicaciones históricas conservan autoría, destinatarios y visibilidad para su audiencia autorizada.
- **Sí:** Migrar staff previo a todas las salas actuales, sin privilegio especial y sin asignar salas futuras automáticamente.
- **Sí:** Admin existente conserva acceso completo dentro de su guardería; no se modifica su rol ni se crea uno nuevo.
- **No:** Tratar la asignación como simple etiqueta visual o filtrar solo en el cliente; RLS y Storage deben impedir acceso directo.
- **No:** Reutilizar emails que ya pertenecen a una cuenta ni crear roles múltiples en un perfil.
- **No:** Permitir anuncios generales al staff; se reservan al administrador en el nuevo modelo.
- **No:** Reenviar o cancelar invitaciones desde esta UI; vencida una invitación, se crea una nueva.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las políticas y funciones actuales autorizan `staff` por guardería completa. | Revisar cada ruta de lectura/escritura, funciones `SECURITY DEFINER` y Storage; demostrar aislamiento con llamadas directas y roles simulados. |
| Una publicación individual puede existir brevemente sin destinatarios durante una escritura de varios pasos. | Usar una operación transaccional para creación y destinatarios, validar el conjunto completo y revertir ante cualquier fallo. |
| El correo falla después de guardar la invitación o Auth funciona antes de persistir el perfil. | Cancelar o invalidar invitaciones sin email entregado y compensar la cuenta Auth si la activación transaccional falla. |
| Un staff pierde acceso en la app pero ya conserva URLs de fotos firmadas. | No emitir firmas nuevas tras retirar la sala; documentar la ventana residual de hasta 3600 segundos. |
| El admin existe en la base real pero no hay cuenta admin declarada en migraciones. | Confirmar la cuenta, la guardería y el proyecto destino antes de pruebas o despliegue; no inventar usuarios, UUID o contraseñas. |

## Lo que **no** está incluido en esta spec

- Administración de cuentas de admin, borrado/desactivación de staff o cambio de roles.
- Creación de salas, asignación automática a salas nuevas y gestión de personal de otros centros.
- Reenvío/cancelación de invitaciones y revocación anticipada de URLs firmadas ya emitidas.

Cada punto requiere una spec separada si se decide incorporarlo.
