# Proposal

## Why

La aplicación usa un solo panel y un solo menú para todos los roles: un padre entra a "Niños" y llega a una pantalla titulada "GESTIÓN" con el buscador de todas las salas de la guardería, y nada impide que abra `/kids` o `/kids/[id]` directamente porque `proxy.ts` solo valida que exista sesión. Además, `Avisos` y `Mi cuenta` son enlaces muertos (`#avisos`, `#cuenta`), y el diseño de referencia ya define dos paneles distintos con menús, subtítulo de marca y acciones propias. Sin esta separación, la familia ve herramientas de staff y el panel no puede crecer sin seguir mezclando responsabilidades.

## What Changes

- Reemplazar la lista de navegación fija del shell por una lista elegida según el rol: staff/admin ven `Feed`, `Niños`, `Mi cuenta`; la familia ve `Feed`, `Resumen del día`, `Mi cuenta`.
- Tratar `admin` como staff en todo el panel, con un helper único en lugar de repetir `role === "staff" || role === "admin"`.
- Ajustar el subtítulo de la marca: nombre de la guardería para staff, `Familia` para padres.
- **BREAKING** Bloquear `/kids` y `/kids/[id]` para la familia: pasan a ser exclusivas de staff/admin y redirigen al inicio del rol. Los padres dejan de abrir el perfil del niño; sus hijos y el consentimiento de fotos se muestran en `Mi cuenta`.
- Agregar `Resumen del día` para la familia en `/resumen`, calculado a partir de las publicaciones del día del niño seleccionado, sin crear tablas nuevas.
- Agregar `Mi cuenta` en `/cuenta` con dos variantes: staff/admin (perfil, notificaciones, contraseña, cerrar sesión) y familia (perfil, hijos con consentimiento de fotos, notificaciones, contraseña, cerrar sesión).
- Persistir las preferencias `notify_on_post` y `daily_summary_enabled` y declarar explícitamente que todavía no disparan envíos.
- Quitar `Avisos` del menú hasta que exista su pantalla.
- No se modifica el esquema de la base de datos ni se crean migraciones.

**Fuera de alcance:** pantalla de `Avisos`; siesta en minutos y "ánimo del día" (requieren una captura de staff que no existe); subida o recorte de avatares; envío real de correos o notificaciones push; comentarios y reacciones; cambio de contraseña dentro de la app (se reutiliza el flujo de recuperación por correo); enlace de "Ayuda y soporte".

## Capabilities

### New Capabilities

- `role-based-panels`: selección de menú y marca por rol, bloqueo de rutas por rol y tratamiento de `admin` como staff.
- `daily-summary`: resumen del día de un niño para la familia, calculado de las publicaciones y acotado a la zona horaria de la guardería.
- `account-settings`: pantalla de cuenta compartida con variante por rol, edición de nombre, preferencias de notificación, consentimiento de fotos de los hijos y cierre de sesión.

### Modified Capabilities

Ninguna. El proyecto todavía no tiene specs en `openspec/specs/`.

## Impact

- `app/components/app-shell.tsx`: navegación y marca por rol.
- `app/page.tsx`, `app/kids/kids-view.tsx`, `app/actions/posts.ts`: uso del helper de rol en lugar de comparaciones repetidas.
- `app/kids/page.tsx`, `app/kids/[id]/page.tsx`: bloqueo para la familia.
- Nuevas rutas `app/resumen/` y `app/cuenta/`, con sus componentes de servidor y cliente.
- Nuevo `utils/auth/roles.ts` con la clasificación de rol, el inicio por rol y el destino del bloqueo.
- `utils/posts/queries.ts` o un nuevo `utils/summaries/queries.ts`: consulta del día en `DAYCARE_TIME_ZONE`.
- Nuevo Server Action de perfil y preferencias; se reutiliza `updatePhotoConsent` de `app/actions/kids.ts`.
- `app/actions/auth.ts`: se reutiliza `signOut`; no se toca la autenticación.
- Sin cambios en `proxy.ts`, en el esquema de Supabase ni en dependencias.
