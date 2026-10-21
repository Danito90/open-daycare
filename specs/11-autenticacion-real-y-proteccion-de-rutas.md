# SPEC 11 — Autenticación real y protección de rutas

> **Estado:** Implementado
> **Depende de:** SPEC 03, SPEC 09, SPEC 10
> **Fecha:** 2026-10-21
> **Objetivo:** Implementar el inicio y cierre de sesión reales con email y contraseña contra Supabase Auth y proteger todas las rutas salvo login y activación, mostrando el perfil real del usuario en el shell.

## Alcance

**Incluye:**

- Convertir `/login` en un formulario real que llama `signInWithPassword` mediante una Server Action y el cliente servidor de `utils/supabase/server.ts`.
- Validar email y contraseña en el servidor y mostrar errores inline y un error de formulario.
- Mantener la composición visual de SPEC 03 en escritorio y móvil.
- Conservar la ruta solicitada en `next` y volver a ella después del login.
- Validar `next` para rechazar destinos externos, `//`, `/\`, `/_next`, `/api`, `/login` y `/activar-cuenta`.
- Proteger en `proxy.ts` todas las rutas salvo `/login` y `/activar-cuenta`.
- Redirigir sin sesión a `/login?next=<ruta solicitada>`.
- Redirigir a `/` cuando un usuario autenticado visite `/login` o `/activar-cuenta`.
- Conservar el refresco de sesión de SPEC 10, incluidas las cookies y cabeceras al redirigir.
- Implementar el cierre de sesión real con `signOut` desde el shell en escritorio y móvil.
- Mostrar `full_name`, avatar o iniciales y rol en el bloque de usuario del shell; mostrar la guardería del usuario en la marca y el encabezado del feed.
- Eliminar la guardería hardcodeada del login y usar `full_name` en el saludo del feed.
- Ajustar la activación simulada para que un envío válido termine en `/login`.
- Verificar con `npm run build`, `npx tsc --noEmit` y Playwright MCP.
- Documentar `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD` en `.env-template`, con valores reales solo en `.env.local`.

**Fuera de alcance (para futuras specs):**

- Crear cuentas, signup, invitaciones, códigos de invitación o confirmación de email.
- Recuperar contraseña mediante email.
- Autorización por rol o por `public.users.status`; el valor `pending` no bloquea el acceso.
- Editar perfil, avatar o preferencias.
- OAuth, magic links, MFA, passkeys o SSO.
- Proteger API routes; el proyecto no tiene ninguna.
- Migrar el feed o los niños a Supabase.
- Cambiar el diseño visual más allá de los datos reales del shell y la limpieza de textos de guardería hardcodeados.
- Añadir una suite de pruebas permanente o una dependencia de Playwright.
- Crear o modificar tablas, políticas, permisos, funciones o datos del producto; el perfil del usuario E2E se gestiona como dato de prueba fuera de la aplicación.
- Gestionar usuarios desde la aplicación.

## Modelo de datos

Esta spec no crea ni modifica estructuras persistentes. Reutiliza:

| Origen | Datos | Acceso |
| --- | --- | --- |
| Supabase Auth | Email, contraseña, sesión y cookies `sb-*` | Gestionado por `@supabase/ssr` |
| `public.users` | `id`, `full_name`, `role`, `daycare_id`, `avatar_url` | Lectura de la fila propia mediante RLS |
| `public.daycares` | `name` | Lectura de la guardería propia mediante RLS |

Tipos nuevos del cliente:

```ts
type UserRole = "staff" | "parent" | "admin";

type UserProfile = {
  fullName: string;
  roleLabel: string;
  daycareName: string | null;
  avatarUrl: string | null;
};

type LoginState = {
  errors?: {
    email?: string;
    password?: string;
  };
  formError?: string;
};
```

Etiquetas de rol:

| Valor DB | Etiqueta UI |
| --- | --- |
| `staff` | `Personal` |
| `parent` | `Familia` |
| `admin` | `Admin` |

Contrato de `next`:

- Debe ser una ruta interna que empiece por un único `/`.
- Se rechazan `//`, `/\`, URLs absolutas y rutas públicas de autenticación.
- Si falta o es inválida, se usa `/`.
- El proxy la construye con `pathname + search` y la codifica con `URLSearchParams`.
- La Server Action la vuelve a validar antes de redirigir.

Variables de entorno:

| Variable | Uso |
| --- | --- |
| `E2E_TEST_EMAIL` | Email de la cuenta de prueba para Playwright. Solo en `.env.local`. |
| `E2E_TEST_PASSWORD` | Contraseña de la cuenta de prueba. Solo en `.env.local`. |

La sesión no se guarda en `localStorage` ni en una cookie propia. Se conserva exclusivamente en las cookies gestionadas por `@supabase/ssr`.

## Plan de implementación

1. Añadir `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD` vacías a `.env-template` y documentar que sus valores reales viven solo en `.env.local`. Comprobación manual: `.env.local` sigue ignorado por Git.

2. Crear `utils/auth/routes.ts` con `PUBLIC_PATHS`, `isPublicPath()` y `safeNextPath()`. Comprobación manual: `npx tsc --noEmit` y casos de `safeNextPath` con `/`, `/kids`, `//evil.com`, `https://evil.com`, `/login` y `/_next/...`.

3. Actualizar `utils/supabase/middleware.ts` para devolver `{ response, isAuthenticated }` después de `await supabase.auth.getClaims()`, conservando la propagación actual de cookies y cabeceras. Ajustar `proxy.ts` para seguir devolviendo solo `response`, sin reglas de autorización todavía. Comprobación manual: `/` y `/login` cargan igual que antes.

4. Crear `app/(auth)/login/types.ts` con `LoginState` y `app/actions/auth.ts` con `"use server"`. Implementar `signIn` con validación de email y contraseña, `signInWithPassword`, mapeo de errores, `safeNextPath`, `revalidatePath("/", "layout")` y `redirect` fuera del `try`. Comprobación manual: `npx tsc --noEmit`.

5. Dividir `/login` en `page.tsx` servidor y `login-form.tsx` cliente. El servidor lee `searchParams`, calcula `safeNextPath` y pasa `nextPath`; el cliente usa `useActionState`, conserva el diseño de SPEC 03, incluye `next` como campo oculto, errores inline, error de formulario con `role="alert"` y estado pendiente en el botón. Comprobación manual: credenciales inválidas muestran error y un login válido redirige cuando hay credenciales de prueba.

6. Crear `utils/auth/current-user.ts` con `getCurrentProfile()`. Debe usar el cliente servidor, `getClaims()`, consultar `users` con `daycares(name)`, mapear el rol y devolver un fallback si falta el perfil o falla la consulta. Comprobación manual: sin sesión devuelve `null`; con sesión devuelve nombre, etiqueta y guardería.

7. Crear `app/components/user-provider.tsx` con contexto cliente y `useUser()`. En `app/layout.tsx`, obtener el perfil con `getCurrentProfile()` y envolver `FeedProvider` y `KidsProvider` con `UserProvider`. Comprobación manual: la aplicación compila y las pantallas no cambian todavía.

8. Actualizar `app/components/app-shell.tsx` para consumir `useUser()` en un bloque de usuario compartido por la barra lateral y el menú móvil. Mostrar `full_name`, el avatar si `avatar_url` existe y, si no, las iniciales del nombre y apellido, y el rol como subtítulo; eliminar `Caro Giménez` y `Maestra · Soles` hardcodeados. Usar `full_name` en el saludo del feed y la guardería del usuario en la marca y el encabezado del feed; quitar la guardería hardcodeada del login. Comprobación manual: tras el login se ven los datos reales y el email nunca aparece como nombre visible.

9. Añadir `signOut` a `app/actions/auth.ts` y sustituir el enlace `#cerrar-sesion` por un formulario con botón en escritorio. Añadir el mismo bloque al menú móvil. Si `signOut` falla, intentar `signOut({ scope: "local" })` para limpiar la sesión local. Comprobación manual: cerrar sesión redirige a `/login` y borra las cookies `sb-*`.

10. Cambiar el destino simulado de `/activar-cuenta` de `/` a `/login`. Mantener la pantalla pública y sin creación de cuentas. Comprobación manual: un envío válido termina en login y no crea usuarios.

11. Activar la política de rutas en `proxy.ts`: sin sesión y ruta no pública, redirigir con estado `303` a `/login?next=...`; con sesión en ruta pública, redirigir con `303` a `/`. Copiar en cada redirección las cookies y cabeceras de caché de la respuesta de sesión. Comprobación manual: `/` sin sesión lleva a login, login con sesión lleva a `/` y no hay bucles.

12. Ejecutar `npm run build`, `npx tsc --noEmit` y las comprobaciones Playwright MCP. Guardar capturas y artefactos exclusivamente en `.playwright-mcp/`. Si `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD` están disponibles, verificar login exitoso, perfil real y cierre de sesión; si no, dejar esos criterios sin marcar.

## Criterios de aceptación

- [X] `npm run build` finaliza correctamente.
- [X] `npx tsc --noEmit` finaliza correctamente.
- [X] Sin sesión, `/` redirige a `/login?next=%2F`.
- [X] Sin sesión, `/kids` redirige a `/login?next=%2Fkids`.
- [X] Sin sesión, `/kids/mateo-fernandez` conserva la ruta completa en `next`.
- [X] `/login` y `/activar-cuenta` cargan sin sesión y sin bucles de redirección.
- [X] Un email vacío o con formato inválido muestra un error inline bajo `EMAIL`.
- [X] Una contraseña vacía muestra un error inline bajo `CONTRASEÑA`.
- [X] Credenciales incorrectas muestran `Email o contraseña incorrectos.` en un elemento con `role="alert"`, conservan el email y permanecen en `/login`.
- [X] El botón de envío se deshabilita y muestra `Ingresando…` mientras la acción está pendiente.
- [X] En `/login?next=//evil.com` y `/login?next=https://evil.com`, el campo oculto `next` vale `/` y no se produce una redirección externa.
- [X] Las redirecciones usan estado `303`, conservan las cookies refrescadas y las cabeceras de caché, y no pierden la sesión.
- [X] El proxy sigue invocando `getClaims()` antes de decidir la redirección y no elimina el refresco de SPEC 10.
- [X] Con credenciales válidas, el login crea una sesión de Supabase, redirige al `next` válido o a `/`, y la sesión sobrevive a una recarga.
- [X] El shell muestra el `full_name` del usuario autenticado, el avatar si `avatar_url` existe o las iniciales del nombre y apellido, y el rol como subtítulo; no queda ningún dato estático de `Caro Giménez`.
- [X] El subtítulo del bloque de usuario muestra solo el rol, sin la guardería.
- [X] El saludo del feed usa el `full_name` del usuario autenticado y no un nombre estático.
- [X] La marca del shell y el encabezado del feed usan la guardería del usuario; el login no muestra una guardería específica.
- [X] El email de la cuenta nunca se usa como nombre visible; si falta el perfil, el nombre cae a `Usuario` y las iniciales a `U`.
- [X] Un usuario autenticado que visita `/login` o `/activar-cuenta` es redirigido a `/`.
- [X] El cierre de sesión desde escritorio y desde móvil ejecuta `signOut`, elimina las cookies `sb-*`, redirige a `/login` y deja de permitir el acceso a `/kids`.
- [X] Un envío válido de `/activar-cuenta` navega a `/login` y no crea una cuenta ni un perfil.
- [X] No se añaden migraciones, tablas, políticas ni funciones; el perfil de prueba del usuario E2E se crea fuera de la aplicación.
- [X] Ninguna clave secreta ni `service_role` aparece en código cliente; las credenciales E2E solo están en `.env.local` y no en Git.
- [X] `/login` y el shell siguen siendo utilizables en `390 × 844` sin desbordamiento horizontal y conservan la composición de escritorio.
- [X] `/login`, `/`, `/kids` y `/kids/[id]` no generan errores de aplicación en la consola durante la verificación.
- [X] Los artefactos de Playwright se guardan exclusivamente en `.playwright-mcp/`.
- [X] Con `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD` disponibles, Playwright confirma login exitoso, perfil real y cierre de sesión. Si faltan, este criterio permanece sin marcar.

## Estado de verificación

**Verificado el 2026-10-21:**

- `npm run build` y `npx tsc --noEmit` pasan.
- Playwright confirma las redirecciones `303` sin sesión, la carga de rutas públicas, los errores inline, el error de credenciales incorrectas con `role="alert"`, el estado pendiente `Ingresando…`, el saneamiento de `next`, la navegación de activación a `/login`, la ausencia de desbordamiento en `390 × 844` y cero errores de consola.
- Login válido con `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD`: la sesión se crea, redirige a `next=/kids`, sobrevive a una recarga y el shell muestra `Daniel Torres`, las iniciales `DT` y el subtítulo `Personal` en escritorio y en móvil. El saludo del feed dice `Buenas, Daniel Torres`, la marca y el encabezado del feed muestran la guardería del perfil y el email no aparece como nombre visible.
- El login no contiene `Sala Soles`; el título de la pestaña es `OpenDayCare`. El shell y el login en `390 × 844` no tienen desbordamiento horizontal.
- El avatar se verificó en ambos caminos: con `avatar_url` presente renderiza un `<img>` y, al quitarlo, vuelve a las iniciales `DT`. El perfil de prueba quedó con `avatar_url = null`.
- Un usuario autenticado que visita `/login` o `/activar-cuenta` termina en `/`.
- La redirección de sesión responde `303` con `Location: /` y la sesión sobrevive. En la prueba no hubo `set-cookie` ni cabeceras de caché porque el token no necesitó refresco; la copia de cookies y cabeceras está implementada en `proxy.ts` y se verificó por código.
- El cierre de sesión desde escritorio y desde móvil deja las cookies `sb-*` vacías, redirige a `/login` y `/kids` vuelve a exigir login.
- `/login` y el shell en `390 × 844` no tienen desbordamiento horizontal (`scrollWidth` 390, `innerWidth` 390 en la re-verificación independiente).
- La activación no crea usuarios. El usuario `danito407@gmail.com` fue creado manualmente para la verificación y tiene un perfil de prueba (`Daniel Torres`, `staff`, Guardería Sala Soles) para que el shell muestre el nombre y las iniciales; no es un dato del producto. El estado final tiene 2 usuarios de Auth y 2 perfiles.
- Las credenciales E2E están en `.env.local`; `.env` conserva solo la configuración de Supabase. Ambos están ignorados por Git.
- Artefactos: `.playwright-mcp/spec-11-login-desktop.png`, `.playwright-mcp/spec-11-login-mobile.png`, `.playwright-mcp/spec-11-shell-desktop.png`, `.playwright-mcp/spec-11-shell-mobile.png` y los snapshots/logs de Playwright en `.playwright-mcp/`.

**Re-verificado el 2026-10-21 (estado final):**

- `npm run build` (Next.js 16.3.8, Turbopack) y `npx tsc --noEmit` pasan.
- Sin sesión: `/` responde `303` con `Location: /login?next=%2F`, `/kids` con `Location: /login?next=%2Fkids` y `/kids/mateo-fernandez` con `Location: /login?next=%2Fkids%2Fmateo-fernandez`; `/login` y `/activar-cuenta` responden `200`.
- Login real con `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD`: `/kids` → `/login?next=%2Fkids`; tras enviar redirige a `/kids`, crea la cookie `sb-*-auth-token` y sobrevive a la recarga.
- Shell: en escritorio muestra `Daniel Torres`, iniciales `DT`, subtítulo `Personal` (sin guardería) y la marca `OpenDayCare / Sala Soles`. En el menú móvil aparecen `Daniel Torres`, `DT` y `Personal`; la guardería se muestra en el encabezado del feed. El email no aparece como nombre visible.
- Feed en escritorio y en `390 × 844`: el saludo dice `Buenas, Daniel Torres` y el encabezado muestra `GUARDERÍA · Sala Soles`. Una publicación creada desde la UI queda con autor `Daniel Torres` y avatar `DT`; no queda ninguna referencia a `Caro Giménez` en `app/` ni en `utils/`.
- Login: no contiene `Sala Soles`; el título de la pestaña es `OpenDayCare` en escritorio y móvil.
- Avatar: con una actualización temporal de `avatar_url` a `/globe.svg` el bloque renderiza un `<img>` cargado (`naturalWidth` 150) y desaparecen las iniciales; al restaurar `null` vuelve a `DT`. Estado final: los dos perfiles tienen `avatar_url = null`.
- El perfil de prueba tiene `full_name = Daniel Torres`, `role = staff`, `avatar_url = null` y guardería `Guardería Sala Soles`; la base mantiene 2 usuarios de Auth y 2 perfiles.
- Autenticado: `/login` responde `303` con `Location: /`; `/login` y `/activar-cuenta` terminan en `/`; `/kids/mateo-fernandez` responde `200`.
- Cierre de sesión desde escritorio y desde el menú móvil: redirige a `/login`, no quedan cookies `sb-*` con valor y `/kids` vuelve a responder `303 /login?next=%2Fkids`.
- Activación válida: navega a `/login`, no crea cookies de sesión y no ejecuta ninguna llamada de alta de cuenta o perfil.
- `390 × 844`: `scrollWidth` = `innerWidth` = `390` en login, feed y menú móvil; cero errores de consola de aplicación en `/login`, `/`, `/kids` y `/kids/[id]`.
- Artefactos finales: `.playwright-mcp/spec-11-final-login-desktop.png`, `spec-11-final-feed-desktop.png`, `spec-11-final-shell-desktop.png`, `spec-11-final-login-mobile.png`, `spec-11-final-feed-mobile.png`, `spec-11-final-menu-mobile.png`, `spec-11-final-avatar.png`, `spec-11-final-report.json` y `spec-11-final-avatar-report.json`.

**Observaciones:**

- No quedan referencias a `Caro Giménez` ni a `Maestra · Soles` en `app/` ni en `utils/`; el saludo y las publicaciones nuevas usan el `full_name` del usuario autenticado.
- `supabase/migrations/20261020134248_add_daniel_torres_staff_profile.sql` ya existía sin seguimiento antes de esta implementación y no fue modificado; referencia otro email (`danieltorresaxion@gmail.com`), no corresponde al perfil E2E y no debe commitearse con esta spec.
- `npx eslint` no llega a ejecutarse por un error preexistente de configuración (`eslint-config-next/core-web-vitals`); no se modificó esa configuración.

## Decisiones tomadas y descartadas

- **Sí:** Server Action con el cliente servidor para el login. Las credenciales no se manejan en código cliente, las cookies se escriben desde el servidor y se sigue la recomendación de autenticación de Next.js.
- **No:** `signInWithPassword` desde el cliente de navegador. Es más simple, pero reparte el manejo de sesión entre cliente y servidor.
- **Sí:** Proteger en `proxy.ts` con `getClaims()`, no en cada página o layout. Las páginas actuales son client components y Next.js 16 usa `proxy.ts` como convención de middleware. El proxy hace la comprobación optimista; RLS protege los datos.
- **Sí:** Lista blanca de rutas públicas (`/login`, `/activar-cuenta`) y protección del resto, incluidas rutas futuras.
- **Sí:** Redirecciones con estado `303`. Convierte POST en GET y evita reenviar una Server Action a `/login`.
- **Sí:** Copiar cookies y cabeceras de la respuesta de sesión en cada redirección. Si se crea una respuesta nueva sin copiarlas, se pierde el refresco de SPEC 10.
- **Sí:** Validar `next` en la página y en la Server Action. Evita redirecciones abiertas y conserva enlaces profundos.
- **Sí:** Redirigir a `/` a los usuarios autenticados que visitan login o activación.
- **Sí:** Cierre de sesión en escritorio y móvil. Una sesión que no se puede cerrar desde móvil es un defecto de seguridad y de uso.
- **Sí:** Perfil mediante layout servidor y contexto cliente. Evita un fetch desde el navegador, un estado de carga adicional y parpadeos.
- **Sí:** Fallback a `Usuario` si falta el perfil. El email no se usa como nombre visible. La ausencia de fila en `public.users` no bloquea el acceso ni rompe el layout.
- **Sí:** El bloque de usuario muestra solo el rol; la guardería se muestra en la marca y el encabezado del feed. El login no asume una guardería específica porque la app es multi-guardería.
- **Sí:** Permitir cualquier sesión autenticada, sin mirar `status` ni rol. La autorización por rol y estado pertenece a otra spec.
- **Sí:** Mantener `/activar-cuenta` simulada y enviar su éxito a `/login`. Sin sesión, `/` rebotaría inmediatamente a login.
- **Sí:** Sin cambios de esquema ni políticas. Las políticas y permisos existentes ya permiten leer el perfil propio y la guardería propia. El perfil del usuario E2E es un dato de prueba fuera de la aplicación.
- **No:** Recuperación de contraseña, signup, OAuth, MFA o passkeys. Cada flujo merece su propia spec.
- **No:** Suite de pruebas permanente. El proyecto usa Playwright MCP y no tiene runner de pruebas.
- **Sí:** Credenciales E2E en variables de entorno. No se escriben en la spec, el repositorio ni las capturas.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Crear una respuesta de redirección nueva pierde las cookies refrescadas. | Copiar `response.cookies` y las cabeceras `cache-control`, `expires` y `pragma`; verificar que la sesión sobrevive al redirect. |
| Bucle entre `/` y `/login`. | Lista blanca de rutas públicas, permitir `/login` sin sesión y probar ambos estados. |
| `redirect()` dentro de un `try` se captura como error. | Ejecutar `redirect()` después del manejo de errores, fuera del bloque `try`. |
| El layout raíz con `cookies()` vuelve dinámicas las rutas. | Es el comportamiento esperado con autenticación; comprobar build y que el perfil sea siempre el del usuario actual. |
| La relación embebida `daycares(name)` no se resuelve como se espera. | Verificar la consulta; si falla, devolver `daycareName: null` y, si hace falta, hacer una segunda consulta. RLS y permisos ya permiten leer la guardería propia. |
| No hay contraseña de prueba disponible o el email no está confirmado. | Dejar los criterios de login exitoso sin marcar; no inventar cuentas ni datos en la spec. |
| Supabase limita los intentos repetidos de Playwright. | Limitar las ejecuciones y esperar entre intentos. |
| La conversión de la página a servidor rompe la fidelidad visual. | Reutilizar las clases actuales y comparar escritorio y `390 × 844`. |
| La contraseña de prueba aparece en logs o capturas. | Leerla desde `.env.local`, no imprimirla y mantener el campo enmascarado. |
| `signOut` falla por red y la sesión sigue activa. | Intentar `signOut({ scope: "local" })`, redirigir igualmente y verificar que las cookies `sb-*` desaparecen. |

## Lo que **no** está incluido en esta spec

- Registro, alta de cuentas, invitaciones, códigos y confirmación de email.
- Recuperación de contraseña.
- Autorización por rol, `status = pending` o rutas de administración.
- Edición de perfil, avatar o preferencias.
- OAuth, magic links, MFA, passkeys o SSO.
- Protección de API routes.
- Migración del feed y de los niños a Supabase.
- Suite de pruebas permanente.
- Cambios de esquema, políticas, permisos o datos en Supabase.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
