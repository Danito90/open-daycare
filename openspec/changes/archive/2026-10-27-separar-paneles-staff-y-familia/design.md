# Design

## Context

Ver `proposal.md` para la motivación. El estado actual que condiciona el enfoque:

- `proxy.ts` solo valida sesión: llama `updateSession` y redirige a `/login`. El rol no viaja en las claims de forma confiable; vive en `public.users.role`.
- `getCurrentProfile()` (`utils/auth/current-user.ts`) ya resuelve `role`, `daycareId`, `daycareName` y `avatarUrl` leyendo `public.users`, y se invoca en `app/layout.tsx`.
- La navegación es una constante en `app/components/app-shell.tsx` y se comparte entre roles. Tiene dos anclas muertas (`#avisos`, `#cuenta`).
- Las comparaciones de rol están repetidas en seis lugares: `app/page.tsx`, `app/components/app-shell.tsx`, `app/actions/posts.ts`, `app/actions/invitations.ts`, `app/kids/kids-view.tsx` y `app/kids/[id]/kid-profile.tsx`.
- El RLS ya limita los datos por rol y por vínculo: un padre solo lee a sus hijos y las publicaciones de su audiencia. El bloqueo de rutas es una capa de experiencia, no la frontera de seguridad.
- `DAYCARE_TIME_ZONE` ya existe en `utils/posts/time.ts` y los formateadores de `utils/posts/format-date.ts` lo usan.
- `app/kids/[id]/kid-profile.tsx` tiene un botón "Resumen del día" hacia `#resumen` que nunca funcionó.
- `updatePhotoConsent` (`app/actions/kids.ts`) ya permite a un padre cambiar `children.photo_consent`.
- No hay migraciones pendientes ni cambios de esquema en este cambio.

## Goals / Non-Goals

**Goals:**

- Un único punto de verdad para "qué puede ver este rol" y "cuál es su menú".
- Bloqueos de servidor que no dependan de JavaScript en el cliente ni de ocultar botones.
- Que el resumen del día y la cuenta funcionen con los datos que la base ya tiene, sin tablas nuevas.
- Coherencia temporal: "hoy" es el día de la guardería.

**Non-Goals:**

- No se introduce un sistema de permisos configurable; son tres roles fijos.
- No se construye `Avisos`, ni captura de siesta/ánimo, ni envío de notificaciones.
- No se cambia `proxy.ts` ni la autenticación.
- No se agregan dependencias.

## Decisions

### D1. El bloqueo va en componentes de servidor, no en `proxy.ts`

Se agrega `app/kids/layout.tsx` como layout de servidor que exige staff/admin y cubre `/kids` y `/kids/[id]` de una sola vez, y una verificación equivalente en `app/resumen/page.tsx`.

**Alternativa considerada:** validar el rol en el middleware. Se descarta porque obliga a una consulta a `public.users` en cada request, incluidos assets y rutas que no lo necesitan, y porque el middleware no puede leer el rol desde las claims sin duplicar la lógica de `getCurrentProfile`. El RLS sigue siendo la frontera real; el layout es la capa de experiencia.

**Consecuencia:** el bloqueo ocurre antes de renderizar la pantalla y sin parpadeo de contenido.

### D2. Un helper de rol como única autoridad

Nuevo `utils/auth/roles.ts`:

- `isStaffRole(role)` → `role === "staff" || role === "admin"`.
- `PANEL_HOME = "/"` como destino de las redirecciones de bloqueo.

Nuevo `utils/auth/guards.ts` con `requireStaffAccess()` y `requireFamilyAccess()`, que llaman `getCurrentProfile()` y redirigen a `PANEL_HOME` cuando el rol no corresponde.

**Alternativa considerada:** mantener las comparaciones inline. Se descarta porque hay seis lugares y ya divergen (`kids-view` y `kid-profile` comparan contra `"parent"` en vez de contra staff, con la semántica invertida).

**Regla de mínimo privilegio:** rol `null` o no reconocido se trata como familia (`isStaffRole` devuelve `false`).

### D3. URLs compartidas, sin prefijos `/staff` y `/family`

Se mantiene `/`, `/kids`, `/resumen` y `/cuenta`. El panel se separa por menú y por acceso, no por namespace.

**Alternativa considerada:** mover todo a `/staff/*` y `/family/*` con `/` como despachador. Se descarta por ahora: duplica rutas que ya funcionan para ambos roles (el feed), rompe enlaces guardados y obliga a resolver el rol en el redirect del login. Queda como camino posible si más adelante hacen falta entradas o métricas separadas.

### D4. Navegación como datos por rol

`app/components/app-shell.tsx` pasa a tener dos listas explícitas y elige según `isStaffRole`:

```
staff/admin : Feed /, Ninos /kids, Mi cuenta /cuenta
parent      : Feed /, Resumen del dia /resumen, Mi cuenta /cuenta
```

**Alternativa considerada:** una sola lista con bandera `visibleFor`. Se descarta porque los conjuntos no solo se ocultan: `Resumen del día` no debe existir para staff y `Niños` no debe existir para familia.

`Avisos` sale de ambas listas porque su pantalla no existe; la spec lo exige para que no vuelva un enlace muerto.

### D5. `Resumen del día` se calcula, no se almacena

Se consulta `posts` unido a `post_children`, filtrado por niño y por el rango del día local, ordenado por `published_at` descendente. Las tres métricas se derivan del mismo resultado: `meal`, `nap` y total.

**Alternativa considerada:** crear `daily_summaries` (definida en el esquema de referencia) con `sleep_minutes`, `mood` y `highlight`. Se descarta porque nadie llena esa tabla: haría falta una pantalla de staff para "cerrar el día" que no está diseñada ni pedida, y sin ella el resumen saldría vacío. Además el mockup muestra dos destacados con hora y el esquema guarda un solo `highlight`.

**Consecuencia:** no se muestran minutos de siesta ni ánimo del día. `siesta` se informa como cantidad de publicaciones `nap`. La spec `daily-summary` lo declara como contrato, no como deuda.

### D6. "Hoy" se calcula en la zona horaria de la guardería

Se obtiene el inicio y el fin del día local en `DAYCARE_TIME_ZONE` con `Intl.DateTimeFormat` (mismo mecanismo que ya usa `utils/posts/format-date.ts`) y se filtra `published_at >= inicio AND published_at < fin`, pasando instantes ISO a PostgREST.

**Alternativa considerada:** usar `new Date().toISOString().slice(0, 10)`, como hace hoy `app/actions/kids.ts`. Se descarta porque después de las 18:00 en México el día UTC ya cambió y el resumen se vaciaría. Ese uso existente queda fuera de alcance, pero el resumen no lo replica.

### D7. Selección de niño por URL, validada contra los vínculos

`app/resumen/page.tsx` lee `searchParams.nino`. La lista de hijos permitidos sale de `parent_children` del usuario actual (protegida por RLS). Si `nino` no está en esa lista o no es un UUID, se usa el primer hijo por orden alfabético. El selector son enlaces con `?nino=`, no estado de cliente.

**Alternativa considerada:** selección en estado de cliente. Se descarta porque impide compartir o recargar el resumen del niño elegido y agrega un estado que el servidor puede resolver solo.

### D8. Cuenta: una ruta, dos variantes renderizadas en servidor

`app/cuenta/page.tsx` obtiene el perfil y, para padres, los hijos vinculados con edad y sala. Renderiza la variante de staff o la de familia; no hay condicionales de rol en cliente.

Acciones:

- Nuevo `app/actions/account.ts` con `updateProfile` (nombre) y `updatePreferences` (`notify_on_post`, `daily_summary_enabled`), con validación manual y mensajes en español, siguiendo el patrón de `actions/kids.ts`.
- `updatePhotoConsent` se reutiliza; se le agrega `revalidatePath("/cuenta")`.
- El email sale de `claims.email`; si falta, se muestra un guion.

**Alternativa considerada:** dos rutas separadas. Se descarta porque duplicaría la tarjeta, el cierre de sesión y el cambio de contraseña sin diferencia de comportamiento.

### D9. Las preferencias de notificación persisten y lo dicen

`notify_on_post` y `daily_summary_enabled` ya existen y tienen `grant update`. Se guardan de verdad, y la pantalla muestra una nota de que todavía no se envían avisos.

**Alternativa considerada:** ocultarlas hasta que exista el envío. Se descarta porque las columnas ya existen y el mockup las muestra; ocultarlas no elimina la deuda, solo la esconde. La nota evita que el toggle parezca una función terminada.

### D10. Limpieza de UI que deja de tener sentido

- El ancla `#cuenta` se reemplaza por `/cuenta`.
- El botón "Resumen del día" de `kid-profile.tsx` se elimina: es un ancla muerta y el resumen es de familia.
- Las ramas `isParent` de `kids-view.tsx` y `kid-profile.tsx` se eliminan: con `/kids` bloqueado para familia quedan muertas, y el layout pasa a ser la única autoridad.

## Risks / Trade-offs

- **La familia pierde `/kids/[id]`.** Podría tener un enlace guardado. → El layout redirige a `/`; `Mi cuenta` lista a los hijos con edad, sala y consentimiento, y el feed muestra sus publicaciones. La pérdida es de una pantalla de gestión, no de información propia.
- **Cada render de `/kids` consulta el perfil dos veces** (layout raíz y layout de guardia). → Aceptable por ahora; si aparece en medición, memoizar `getCurrentProfile` con `cache()` de React es un cambio localizado.
- **El resumen se desvía del mockup** al no mostrar siesta en minutos ni ánimo. → Está declarado en `daily-summary`; se completará con una captura de staff en un cambio posterior.
- **Los toggles de notificación no envían nada.** → Nota visible en la pantalla y alcance explícito en `account-settings`.
- **El conteo del día depende de la zona horaria configurada.** Un `DAYCARE_TIME_ZONE` mal puesto corre el corte. → Se reutiliza la variable existente y se prueba el borde con un reloj fijo.
- **La consulta del resumen filtra por niño y por rango**, lo que puede no usar el índice de `posts` de forma óptima. → El rango de un día acota el conjunto; si crece, se evalúa un índice sobre `post_children(child_id)` o una vista.
- **Un `nino` ajeno en la URL** no debe filtrar datos. → Se valida contra los vínculos del usuario y, aun si fallara, el RLS impide leer al niño.

## Migration Plan

No hay cambios de esquema ni datos: es un despliegue de código.

- Desplegar con `npm run build` + `npx tsc --noEmit`.
- Rollback: revertir el commit. No hay datos que deshacer; los únicos efectos persistentes son las preferencias y el consentimiento, que ya existían como columnas.

## Open Questions

- Si conviene memoizar `getCurrentProfile` con `cache()` de React. No cambia specs, enfoque ni tareas; se puede decidir al implementar.
