# Tasks

## 1. Base de roles

- [x] 1.1 Crear `utils/auth/roles.ts` con `isStaffRole(role)` (staff y admin) y `PANEL_HOME = "/"`; verificar con `npx tsc --noEmit` que compila y que `isStaffRole(null)` devuelve falso por revisión del código.
- [x] 1.2 Crear `utils/auth/guards.ts` con `requireStaffAccess()` y `requireFamilyAccess()`, ambas sobre `getCurrentProfile()` y `redirect(PANEL_HOME)`; verificar con `npx tsc --noEmit`.
- [x] 1.3 Reemplazar las comparaciones de rol por `isStaffRole` en `app/page.tsx`, `app/components/app-shell.tsx`, `app/actions/posts.ts` y `app/actions/invitations.ts`; verificar que `rg 'role === "staff"'` no devuelve coincidencias en `app/` y que `npx tsc --noEmit` pasa.

## 2. Mi cuenta

- [x] 2.1 Crear `app/actions/account.ts` con `updateProfile` (nombre no vacío, sin espacios sobrantes) y `updatePreferences` (`notify_on_post`, `daily_summary_enabled`), con estados de error y `revalidatePath`; verificar con `npx tsc --noEmit` y guardando un nombre vacío desde la UI para ver el error.
- [x] 2.2 Crear `app/cuenta/page.tsx` como componente de servidor que resuelve perfil, email desde `claims.email` y, solo para familia, los hijos vinculados con edad y sala; verificar abriendo `/cuenta` con un usuario staff y con uno parent y comprobando que cada uno ve solo su variante.
- [x] 2.3 Crear los componentes de cuenta (tarjeta de perfil, edición de nombre, toggles de notificación, cambio de contraseña y cierre de sesión) con la nota de que todavía no se envían avisos; verificar que el nombre editado persiste al recargar y aparece en el bloque de usuario del shell.
- [x] 2.4 Reutilizar `updatePhotoConsent` para el consentimiento por hijo y agregar `revalidatePath("/cuenta")` en `app/actions/kids.ts`; verificar que el toggle persiste al recargar y que un error de la acción conserva el valor anterior y muestra el mensaje.
- [x] 2.5 Agregar `/cuenta` a la tabla de rutas de `README.md` con su descripción por rol; verificar que la ruta documentada abre en el navegador.
- [x] 2.6 Verificar con Playwright (artefactos en `.playwright-mcp/`) la variante staff y la variante familia de `/cuenta`, incluidos los toggles de notificación y la ausencia de "Ayuda y soporte" o subida de avatar.

## 3. Resumen del día

- [x] 3.1 Agregar en `utils/posts/time.ts` un helper que devuelva el inicio y el fin del día local en `DAYCARE_TIME_ZONE` como instantes ISO; verificar comparando los bordes para una fecha normal y para una consulta a las 23:30 locales, comprobando que el fin cae en el día siguiente.
- [x] 3.2 Crear `utils/summaries/queries.ts` que resuelva los hijos vinculados, el niño seleccionado (por `nino` o el primero alfabético) y las publicaciones del día con sus métricas (`meal`, `nap`, total); verificar con un padre de dos hijos que los conteos coinciden con las filas esperadas y que un `nino` ajeno cae en el hijo por defecto.
- [x] 3.3 Crear `app/resumen/page.tsx` con `requireFamilyAccess()`, el selector de hijo por enlaces `?nino=`, las tres métricas, la línea de tiempo del día y los dos estados vacíos; verificar que no se renderizan siesta en minutos, ánimo del día ni acciones de escritura, y que `npx tsc --noEmit` pasa.
- [x] 3.4 Agregar `/resumen` a la tabla de rutas de `README.md` indicando que es exclusiva de familia; verificar que la ruta documentada abre con un usuario parent.
- [x] 3.5 Verificar con Playwright (artefactos en `.playwright-mcp/`) el resumen con un hijo, el cambio de hijo con dos, el estado sin publicaciones del día y la redirección de un usuario staff a `/`.

## 4. Rutas y navegación por rol

- [x] 4.1 Crear `app/kids/layout.tsx` con `requireStaffAccess()` para cubrir `/kids` y `/kids/[id]`; verificar que un usuario parent es redirigido a `/` en ambas rutas y que un usuario staff las abre con normalidad.
- [x] 4.2 Reemplazar la navegación de `app/components/app-shell.tsx` por las listas por rol (staff: Feed, Niños, Mi cuenta; familia: Feed, Resumen del día, Mi cuenta), quitar `Avisos`, apuntar `Mi cuenta` a `/cuenta`, ajustar el subtítulo de la marca y el disparador de publicación; verificar con Playwright que cada rol ve su menú, que no hay anclas muertas y que la sección activa se marca en `/`, `/kids`, `/resumen` y `/cuenta`.
- [x] 4.3 Eliminar las ramas `isParent` de `app/kids/kids-view.tsx` y `app/kids/[id]/kid-profile.tsx`, y quitar el botón "Resumen del día" con ancla `#resumen`; verificar con `npx tsc --noEmit` y abriendo el perfil de un niño como staff para confirmar que las acciones de gestión siguen disponibles.
- [x] 4.4 Anotar en la tabla de rutas de `README.md` que `/kids` y `/kids/[id]` son exclusivas de staff/admin; verificar que la descripción coincide con el comportamiento observado.

## 5. Integración

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; verificar que los tres terminan sin errores.
- [x] 5.2 Verificar con Playwright (artefactos en `.playwright-mcp/`) el recorrido completo de staff: login, feed, publicación, niños, perfil y cuenta; y que no aparecen errores en consola.
- [x] 5.3 Verificar con Playwright el recorrido completo de familia: login, feed, resumen, cuenta, consentimiento, y que `/kids` y `/kids/[id]` redirigen sin cerrar la sesión.
- [x] 5.4 Verificar con teclado y foco visible el menú por rol, el selector de niño y los toggles nuevos; confirmar que todos los controles son alcanzables y anuncian su estado.

## Workflow follow-up

- Ejecutar `openspec validate separar-paneles-staff-y-familia --strict` antes de archivar.
- Archivar el change una vez satisfecha la revisión del proyecto.
