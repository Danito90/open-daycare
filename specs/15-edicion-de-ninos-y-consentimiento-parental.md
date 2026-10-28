# SPEC 15 — Edición de niños y consentimiento exclusivo de padres

> **Estado:** Aprobado
> **Depende de:** SPEC 09, SPEC 10, SPEC 11, SPEC 12, SPEC 13, SPEC 14
> **Fecha:** 2026-10-27
> **Objetivo:** Permitir al personal editar los datos iniciales de los niños sin poder cambiar el consentimiento de fotos, reservado a sus padres vinculados.

## Por qué existe esta spec

El botón `Editar` de `/kids/[id]` abre actualmente el modal de consentimiento incluso para el personal. Además, la política de actualización de `children` permite a `staff` y `admin` cambiar `photo_consent` por la API. Ocultar el botón no resolvería ese permiso. A la vez, el personal todavía no puede corregir los datos iniciales del niño después de registrarlo.

## Alcance

**Incluye:**

- Reemplazar el botón `Editar` del perfil del niño por la edición de nombre, nacimiento, sala, fecha de ingreso, alergias y notas médicas, visible únicamente a `staff` y `admin` de su guardería.
- Mantener el perfil del niño en modo lectura para padres. El consentimiento se cambia solamente desde `Mi cuenta` por padres vinculados.
- Impedir en la base de datos que `staff` y `admin` modifiquen `photo_consent`, y que un padre modifique cualquier otro dato del niño, aunque invoquen la API directamente.
- Cambiar a `false` el valor por defecto de `children.photo_consent` para altas futuras; conservar sin cambios los valores ya guardados.
- Admitir cambios de sala dentro de la misma guardería, sin modificar los vínculos familiares ni las filas de publicaciones existentes.
- Exigir fechas de nacimiento válidas y no futuras, y fechas de ingreso válidas y no futuras; conservar la validación del catálogo de alergias.
- Persistir los cambios en Supabase y reflejarlos al recargar el perfil, la lista de niños y las pantallas que consumen esos datos.
- Verificar el aislamiento por rol con pruebas revertidas, TypeScript, build y Playwright.

**Fuera de alcance (para futuras specs):**

- Eliminar, archivar o restaurar niños; editar su `status`.
- Crear o editar salas, mover niños entre guarderías o alterar vínculos con padres.
- Reescribir publicaciones anteriores cuando cambie la sala de un niño.
- Historial, firma o consentimiento independiente de cada tutor.
- Revocar automáticamente los consentimientos existentes, aunque el niño todavía no tenga un padre vinculado.
- Permitir la edición de datos del niño a padres o la edición del consentimiento a personal y administradores.

## Modelo de datos

No se introducen tablas ni columnas nuevas. Se reutilizan `public.children`, `public.rooms`, `public.users` y `public.parent_children`.

### Base de datos y autorización

- Una migración versionada cambia únicamente el `DEFAULT` de `public.children.photo_consent` de `true` a `false`; no ejecuta un `UPDATE` de las filas existentes.
- `SELECT` de `children` conserva el aislamiento actual: personal de la guardería o padres vinculados.
- `INSERT` sigue permitido únicamente a personal de la guardería, con el mismo conjunto de columnas que la creación actual. La aplicación no envía `photo_consent` al insertar.
- Para `UPDATE`, `staff` y `admin` de la guardería pueden cambiar solo `full_name`, `birth_date`, `room_id`, `enrolled_at`, `allergy_tags` y `medical_notes`. La sala nueva debe pertenecer a la misma guardería que el usuario; no se habilita el cambio de guardería.
- Un `parent` vinculado puede cambiar únicamente `photo_consent` del niño vinculado. Un padre no vinculado y `anon` no pueden actualizarlo.
- Mantener privilegios de columna mínimos para `authenticated` y proteger las diferencias entre `OLD` y `NEW` con un trigger de autorización en `children`: como `staff` y `parent` comparten el rol SQL `authenticated`, los `GRANT UPDATE` y una política RLS permisiva por sí solos no separan qué columnas puede escribir cada perfil. El trigger comprueba la identidad y el rol reales en `public.users`, el vínculo en `parent_children` y la sala de origen y destino; rechaza cambios de columnas no autorizadas incluso si la petición combina campos permitidos y prohibidos.
- La política RLS de `UPDATE` conserva `USING` y `WITH CHECK` para filas accesibles, con la verificación de sala de destino para personal; el trigger aporta la restricción por columnas y por perfil. Conservar `children.updated_at` automático y no conceder edición directa de `id`, `status`, `created_at` ni `updated_at`.
- Las pruebas de autorización deben cubrir la actualización directa por la API además de las Server Actions. No se utiliza `service_role` para saltar RLS en la edición ordinaria.

### Contratos de aplicación

`Kid` en `utils/kids/types.ts` ya contiene los seis datos editables y `photoConsent`; no es necesario cambiar su representación de lectura. Añadir un estado de formulario para la edición con errores por campo, error general y confirmación de guardado. `app/actions/kids.ts` recibe `childId`, los seis campos permitidos y ninguna instrucción para cambiar `photo_consent`.

El modal de datos abre con los valores actuales, muestra las salas visibles de la guardería y conserva el formulario al fallar. Tras un guardado válido se cierra y actualiza la vista. Si una sala deja de estar disponible, el formulario permanece abierto con un error legible. Los padres no reciben un control de edición en `/kids/[id]`; `app/cuenta/child-consent-switch.tsx` conserva su flujo.

## Plan de implementación

1. Inspeccionar el estado real de `children`, sus políticas y privilegios, y el historial de migraciones del proyecto de destino. Comprobación manual: los objetos y el destino están identificados antes de escribir SQL.
2. Crear con la CLI de Supabase una migración nueva que cambie el `DEFAULT`, ajuste los privilegios de columna y la política de `UPDATE`, y agregue la comprobación `OLD`/`NEW` por perfil con un trigger. No editar migraciones ya aplicadas. Comprobación manual: el SQL conserva la lectura y creación actuales y no modifica filas históricas.
3. Probar la migración localmente si el entorno está disponible; antes de tocar el remoto, mostrar `supabase db push --dry-run` y solicitar aprobación explícita. Aplicarla solo mediante el flujo versionado y comprobar después el historial y los privilegios. Comprobación manual: los datos existentes conservan su consentimiento y el nuevo default es `false`.
4. Probar en transacciones revertidas con roles y claims simulados: `staff` y `admin` editan datos de su guardería, pero no consentimiento; un padre vinculado cambia consentimiento, pero no nombre ni otros datos; un padre ajeno y `anon` no actualizan; personal de otra guardería no mueve ni modifica el niño. Comprobación manual: no quedan filas de prueba.
5. Crear la Server Action de edición en `app/actions/kids.ts`: verificar sesión y rol, validar UUID, fechas, sala, nombre y alergias, actualizar solo las seis columnas previstas y revalidar `/kids`, `/kids/[id]` y las rutas que consumen el niño. Comprobación manual: peticiones inválidas no cambian filas y un guardado válido persiste tras recargar.
6. Sustituir en `app/kids/[id]/kid-profile.tsx` el disparador de `EditPhotoConsentModal` por un editor de datos para `staff` y `admin`; pasar las salas visibles desde `app/kids/[id]/page.tsx` y crear el modal de edición. Los padres mantienen el perfil en lectura y el switch de `Mi cuenta`. Comprobación manual: personal ve los seis campos y ningún control de autorización de fotos; un padre no ve `Editar`.
7. Verificar el flujo en escritorio y `390 × 844` con Playwright; guardar cualquier artefacto solo en `.playwright-mcp/`. Ejecutar `npx tsc --noEmit` y `npm run build`. Comprobación manual: al cambiar datos, el perfil y la lista muestran los valores nuevos; el consentimiento previo no varía.

## Criterios de aceptación

**Seguridad y persistencia**

- [ ] Existe una migración nueva creada con la CLI y aplicada solo después de revisar el destino, `supabase db push --dry-run` y la aprobación explícita.
- [ ] `public.children.photo_consent` tiene `DEFAULT false`; los valores de los niños existentes no se modifican por la migración.
- [ ] Una nueva alta desde `/kids` guarda `photo_consent = false` sin enviar esa columna desde el formulario.
- [ ] `staff` y `admin` de la guardería pueden actualizar las seis columnas permitidas y no pueden cambiar `photo_consent` mediante la Server Action ni mediante una petición directa a la API.
- [ ] Un padre vinculado puede cambiar `photo_consent` desde `Mi cuenta` y no puede cambiar ninguna de las seis columnas del personal mediante una petición directa a la API, ni combinarlas con `photo_consent` en un mismo `UPDATE`.
- [ ] Un padre no vinculado y un usuario de otra guardería no pueden modificar el niño; `anon` no tiene acceso de actualización.
- [ ] El personal no puede asignar al niño una sala de otra guardería, aun enviando manualmente el UUID de esa sala.
- [ ] `id`, `status`, `created_at` y `updated_at` no se vuelven editables directamente por los clientes.
- [ ] Las pruebas de escritura se revierten y no dejan datos de prueba.

**Edición del perfil**

- [ ] En `/kids/[id]`, el botón `Editar` de personal abre datos del niño, no consentimiento de fotos.
- [ ] El editor precarga nombre, nacimiento, sala, ingreso, alergias y notas médicas; se pueden corregir y guardar los seis datos.
- [ ] Nombre vacío, fechas inválidas o futuras, sala ajena y alergias fuera del catálogo se rechazan sin alterar el registro y muestran errores junto al campo o en el formulario.
- [ ] Una actualización correcta se ve en el perfil y la lista tras refrescar, y permanece al volver a iniciar sesión.
- [ ] Cambiar de sala conserva las filas de `parent_children`, `posts` y `post_children`; la visibilidad de anuncios de sala sigue las reglas vigentes para la sala actual.
- [ ] El perfil de un padre no muestra edición de datos ni consentimiento; el consentimiento sigue disponible solo en `Mi cuenta` para el padre vinculado.
- [ ] Un error de guardado conserva los datos escritos y muestra un mensaje accesible sin cerrar el modal.

**Verificación general**

- [ ] `npx tsc --noEmit` y `npm run build` terminan correctamente.
- [ ] Playwright comprueba escritorio y `390 × 844` sin errores de aplicación ni desbordamiento horizontal; sus artefactos quedan exclusivamente en `.playwright-mcp/`.

## Decisiones tomadas y descartadas

- **Sí:** Solo padres vinculados autorizan fotos. Personal y administradores no pueden hacerlo ni por interfaz ni por API.
- **Sí:** Personal edita todos los datos iniciales: nombre, nacimiento, sala, fecha de ingreso, alergias y notas.
- **Sí:** Las altas nuevas comienzan sin consentimiento. No se revocan consentimientos existentes.
- **Sí:** Los padres modifican el consentimiento únicamente desde `Mi cuenta`; el perfil del niño les queda en modo lectura.
- **Sí:** Conservar vínculos y publicaciones al cambiar de sala; no reescribir el historial, aunque los anuncios de sala sigan la visibilidad calculada con la sala actual.
- **Sí:** Fecha de ingreso válida y no futura; no se incorpora otra restricción de antigüedad.
- **No:** Resolver la separación de facultades solo ocultando botones o con una validación en la Server Action; la API debe rechazar escrituras indebidas.
- **No:** Conceder a todos los usuarios `authenticated` la edición irrestricta de `children` por confiar únicamente en el rol mostrado en la UI.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `staff` y `parent` usan el mismo rol SQL `authenticated`; un `GRANT UPDATE` compartido podría permitir editar campos ajenos. | Verificar cambios `OLD`/`NEW` por perfil en un trigger, además de RLS, y probar peticiones directas que combinan columnas. |
| El cambio de sala afecta la audiencia calculada de anuncios anteriores. | Conservar las publicaciones sin reescribirlas y comprobar la visibilidad de anuncios con las reglas existentes y la sala actual. |
| El nuevo valor por defecto oculta fotos de nuevas altas hasta que un padre autorice. | Mostrar el consentimiento apagado en `Mi cuenta` al vincular al padre; no interpretar `false` como un error de carga. |
| Aplicar la app antes que la migración deja un intervalo donde la API aún admite escrituras indebidas. | Coordinar el despliegue de la migración y la app; verificar RLS antes de dar por terminada la funcionalidad. |

## Lo que **no** está incluido en esta spec

- Gestión de salas, archivo o borrado de niños.
- Modificación de vínculos familiares o de las publicaciones históricas.
- Consentimiento por tutor individual, historial de cambios o revocación masiva de valores existentes.

Cada punto requiere una spec separada si se decide incorporarlo.
