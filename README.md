# OpenDayCare

Aplicación web para guarderías: feed de publicaciones, gestión de niños y salas, invitaciones a padres y perfiles. Construida con **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **Supabase** (Auth + Postgres) y **Resend** (correos de invitación).

---

## Requisitos

| Herramienta | Versión | Uso |
| --- | --- | --- |
| Node.js | `>= 20.9` (probado con 24.13) | Requerido por Next.js |
| npm | 11.x | Se usa `package-lock.json` |
| Proyecto Supabase | ref `jrkpnkmryvhistfvmoqz` | Base de datos y Auth |
| Docker Desktop | opcional | Solo para levantar Supabase en local |
| Supabase CLI | opcional, vía `npx` | Migraciones y stack local |
| OpenCode | opcional | MCP de Supabase, Context7 y Playwright |
| Cuenta Resend | opcional | Envío de invitaciones por correo |

`next` y `eslint-config-next` están fijados a la **misma versión exacta** (`16.4.2`). Si actualizas uno, actualiza el otro en el mismo commit.

---

## Instalación

```powershell
npm ci
```

- Usa siempre `npm ci` para respetar el lockfile. `npm install` solo si vas a cambiar dependencias.
- No uses `--legacy-peer-deps`: si aparece `ERESOLVE`, casi siempre es porque `next` y `eslint-config-next` dejaron de coincidir.

---

## Variables de entorno

Copia la plantilla y completa los valores:

```powershell
Copy-Item .env-template .env.local
```

Next.js carga `.env.local` y `.env` (`.env.local` tiene prioridad). Ambos están ignorados por Git; solo `.env-template` se versiona.

| Variable | Obligatoria | Descripción / dónde se obtiene |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Dashboard → Project Settings → API → Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Misma pantalla → Publishable key (`sb_publishable_...`). Es pública, puede llegar al navegador. |
| `SUPABASE_SECRET_KEY` | Sí | Secret key (`sb_secret_...`). Solo servidor: Admin API e invitaciones. Nunca con prefijo `NEXT_PUBLIC_`. |
| `SUPABASE_DB_PASSWORD` | Solo CLI | Contraseña de la base; la usa `supabase link` / `db push`. No la necesita la app en runtime. |
| `RESEND_API_KEY` | Para invitaciones | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Para invitaciones | Remitente verificado. En pruebas, `onboarding@resend.dev`. |
| `APP_URL` | Producción | URL absoluta usada en el enlace del correo de invitación (ej. `http://localhost:3000` en local). |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Solo pruebas | Usuario de Supabase Auth para los scripts de Playwright. |

> Sin un dominio verificado en Resend solo se entrega al correo dueño de la cuenta y a direcciones `@resend.dev`; el resto responde `403`.

---

## Base de datos

Las migraciones viven en `supabase/migrations/` y son la única fuente de verdad del esquema (tablas, enums, políticas RLS, funciones y datos iniciales).

```
supabase/migrations/
├── 20261020122730_create_daycares.sql
├── 20261020124738_create_users_and_enums.sql
├── 20261020134248_add_daniel_torres_staff_profile.sql
├── 20261021132757_create_rooms_and_children.sql
├── 20261021132824_seed_rooms_and_children.sql
├── 20261022122541_create_invitations_and_parent_children.sql
└── 20261022122621_add_invitation_functions_and_policies.sql
```

Regla del proyecto: **todo cambio persistente va en una migración versionada**. No se aplica DDL con SQL directo contra el proyecto remoto; las consultas de solo lectura para inspeccionar o diagnosticar sí están permitidas.

### Aplicar migraciones al proyecto remoto

```powershell
npx supabase login                                   # una vez por máquina
npx supabase link --project-ref jrkpnkmryvhistfvmoqz # vincula este repo
npx supabase migration list                          # compara local vs remoto
npx supabase db push                                 # aplica las pendientes
```

El CLI se descarga bajo demanda con `npx` (probado con 2.122.0). `db push` pide la contraseña de la base si no está en `SUPABASE_DB_PASSWORD`.

### Stack local (opcional)

```powershell
npx supabase start     # requiere Docker
npx supabase db reset  # recrea el esquema aplicando todas las migraciones
npx supabase status    # imprime URL y claves locales
```

Si trabajas en local, apunta `NEXT_PUBLIC_SUPABASE_URL` y las claves al stack local que imprime `supabase status`.

### Usuarios de prueba

El login necesita un usuario en **Supabase Auth** con su perfil en `public.users`. El alta de padres se hace por el flujo real de invitación (`utils/email/send-invitation.ts` + Resend); para pruebas manuales puedes crear el usuario desde el Dashboard (Authentication → Users).

---

## Levantar el proyecto

```powershell
npm run dev
```

Abre http://localhost:3000. Sin sesión, `proxy.ts` redirige a `/login?next=...`.

| Ruta | Descripción |
| --- | --- |
| `/login` | Inicio de sesión |
| `/activar-cuenta` | Activación de cuenta con código de invitación |
| `/` | Feed de publicaciones (home) |
| `/kids` | Listado de niños por sala (solo staff/admin) |
| `/kids/[id]` | Perfil del niño, consentimiento de fotos y vínculo con padres (solo staff/admin) |
| `/cuenta` | Mi cuenta: perfil, notificaciones, hijos y sesión |
| `/resumen` | Resumen del día de un niño (solo familia) |

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Build de producción (Turbopack + chequeo de tipos) |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint (flat config) |
| `npx tsc --noEmit` | Chequeo estricto de TypeScript |

> Los tipos globales `PageProps` / `LayoutProps` los genera Next.js. Si `tsc` se queja de que no existen en un clon recién instalado, corre `npm run dev` o `npm run build` una vez.

---

## MCP de Supabase en OpenCode

El repo trae el servidor MCP configurado en `opencode.json` (`type: "remote"`):

```
https://mcp.supabase.com/mcp?project_ref=jrkpnkmryvhistfvmoqz&features=docs,account,database,debugging,development,functions,branching
```

El `project_ref` limita el MCP a este proyecto (en modo *project-scoped* las herramientas de cuenta quedan deshabilitadas, por eso `features=account` no aporta nada aquí). Como el servidor ya está en `opencode.json`, no hay que agregarlo: solo autenticarlo una vez por máquina y cuenta.

### Conectar: `opencode mcp auth supabase`

En OpenCode, la conexión se autentica con:

```powershell
opencode mcp auth supabase
```

Ese comando abre el navegador para el flujo **OAuth 2.0 con registro dinámico de cliente** contra tu cuenta de Supabase. No se usa la contraseña de la base ni las claves de `.env`, y no hace falta crear un PAT ni una OAuth app.

1. Ejecuta el comando desde la raíz del repo.
2. En el navegador, inicia sesión en Supabase y **autoriza la organización dueña del proyecto**.
3. Verifica el estado:

   ```powershell
   opencode mcp list     # ✓ supabase   connected
   ```

4. Si el token expira o cambias de cuenta, repite `opencode mcp auth supabase`. Para revocar el acceso: `opencode mcp logout supabase`.

Los tokens se guardan **fuera del repositorio**, en `~/.local/share/opencode/mcp-auth.json` (Windows: `C:\Users\<usuario>\.local\share\opencode\mcp-auth.json`). No los pegues en issues, chats ni archivos versionados.

### Qué permisos tiene y qué implica

- Actúa con **tus permisos de desarrollador** sobre el proyecto: no pasa por RLS ni usa la publishable key de la app. Es una herramienta interna, no para usuarios finales.
- Puede leer y escribir en la base (crear tablas, ejecutar SQL, desplegar funciones). Mantén la aprobación manual de herramientas y revisa cada llamada.
- Para diagnóstico conviene limitarlo a lectura agregando `&read_only=true` a la URL del MCP en `opencode.json`.
- En CI o entornos sin navegador se puede autenticar con un Personal Access Token en el header `Authorization: Bearer ...`; en ese caso el token va como variable de entorno, nunca en el repo.

### Otros MCP configurados

| Servidor | Autenticación | Uso |
| --- | --- | --- |
| `context7` | Sin credenciales | Documentación actualizada de librerías |
| `playwright` | Sin credenciales | Pruebas de UI; artefactos en `.playwright-mcp/` |

---

## Verificación

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

`references/**` y `.playwright-mcp/**` están excluidos de ESLint: son fixtures de diseño y artefactos de pruebas, no código de runtime.

### Pruebas de UI con Playwright

Los scripts de verificación viven en `.playwright-mcp/` y se ejecutan contra el servidor de desarrollo usando `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` de `.env.local`:

```powershell
npm run dev                    # en una terminal
node .playwright-mcp/verify-next-16.4.2.cjs
```

Si Playwright falla con `Executable doesn't exist`, instala el navegador (`npx playwright install chromium`) o lanza Chrome del sistema (`chromium.launch({ channel: "chrome" })`).

---

## Estructura

```
app/                     Rutas (App Router), Server Actions y componentes
├── (auth)/              Login y activación de cuenta
├── actions/             Server Actions: auth, invitaciones, niños
├── kids/                Listado, alta y perfil de niños
└── feed/                Modal de creación de publicaciones
utils/                   Clientes Supabase, consultas y helpers
supabase/                config.toml y migraciones versionadas
specs/                   Especificaciones funcionales (spec driven development)
references/              Diseño de referencia (no es código de runtime)
.playwright-mcp/         Scripts y artefactos de verificación con Playwright
proxy.ts                 Middleware de Next 16: sesión y rutas protegidas
```

## Specs y flujo de trabajo

- `/spec` crea la especificación de una pantalla o funcionalidad.
- `/spec-impl` la implementa.
- `/verify-spec specs/<archivo>.md` la verifica con `spec-verifier` (código, build, TypeScript y Playwright).
- Las convenciones del proyecto están en `AGENTS.md`.

---

## Problemas comunes

| Síntoma | Causa / solución |
| --- | --- |
| `ERESOLVE` al instalar | `next` y `eslint-config-next` con versiones distintas. Alinéalas y corre `npm ci`. |
| `Cannot find name 'PageProps'` en `tsc` | Corre `npm run dev` o `npm run build` para generar los tipos de Next. |
| `Executable doesn't exist` en Playwright | Instala el navegador o usa `channel: "chrome"`. |
| Los correos de invitación devuelven `403` | Dominio no verificado en Resend; usa `onboarding@resend.dev` o verifica tu dominio. |
| `npm audit` reporta `braces` (dev) | Dependencia transitiva de `eslint-config-next`; no afecta al runtime y aún no hay versión parcheada. No ejecutes `npm audit fix --force` (baja Next a 14). |
